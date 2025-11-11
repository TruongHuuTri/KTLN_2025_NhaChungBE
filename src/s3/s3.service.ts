import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { UploadFolder } from './dto/presign.dto';
import * as fs from 'fs';

@Injectable()
export class S3Service {
  private readonly s3 = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  private readonly bucket = process.env.S3_BUCKET!;
  private readonly base = process.env.PUBLIC_BASE_URL!; // S3/CloudFront origin, ví dụ: https://dxxxx.cloudfront.net

  async presignPut(
    userId: number,
    fileName: string,
    contentType: string,
    folder: UploadFolder,
  ) {
    const safe = fileName.replace(/[^\w.\-]/g, '_');
    const ext = (safe.split('.').pop() || 'bin').toLowerCase();

    const key = `uploads/${userId}/${folder}/${Date.now()}-${randomUUID()}.${ext}`;

    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType || 'application/octet-stream',
    });

    const uploadUrl = await getSignedUrl(this.s3, cmd, { expiresIn: 300 }); // 5'
    return {
      key,
      uploadUrl,
      publicUrl: `${this.base}/${key}`,
    };
  }

  /**
   * Upload ảnh từ base64 lên S3
   */
  async uploadBase64ToS3(
    base64String: string,
    fileName: string,
    userId: number,
    folder: UploadFolder = UploadFolder.verifications,
  ): Promise<string> {
    try {
      // Extract base64 data và content type
      const [contentType, base64Data] = this.extractBase64Data(base64String);

      // Tạo key cho S3
      const key = this.generateS3Key(fileName, userId, folder, contentType);

      // Upload lên S3
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: Buffer.from(base64Data, 'base64'),
        ContentType: contentType,
      });

      await this.s3.send(command);

      // Trả về public URL
      return `${this.base}/${key}`;
    } catch (error) {
      throw new Error(`Failed to upload to S3: ${error.message}`);
    }
  }

  /**
   * Upload bất kỳ file nào (PDF, DOC, images, etc) từ base64 lên S3
   */
  async uploadFileToS3(
    base64String: string,
    fileName: string,
    userId: number,
    folder: UploadFolder = UploadFolder.documents,
  ): Promise<string> {
    try {
      const [contentType, base64Data] = this.extractBase64Data(base64String);
      const key = this.generateS3Key(fileName, userId, folder, contentType);

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: Buffer.from(base64Data, 'base64'),
        ContentType: contentType,
      });

      await this.s3.send(command);
      return `${this.base}/${key}`;
    } catch (error) {
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  /**
   * Extract contentType và base64 data từ data URL
   */
  private extractBase64Data(dataUrl: string): [string, string] {
    // Extract content type từ data URL
    let contentType = 'application/octet-stream';
    if (dataUrl.includes('data:image/jpeg') || dataUrl.includes('data:image/jpg')) {
      contentType = 'image/jpeg';
    } else if (dataUrl.includes('data:image/png')) {
      contentType = 'image/png';
    } else if (dataUrl.includes('data:image/webp')) {
      contentType = 'image/webp';
    } else if (dataUrl.includes('data:image/gif')) {
      contentType = 'image/gif';
    } else if (dataUrl.includes('data:application/pdf')) {
      contentType = 'application/pdf';
    } else if (dataUrl.includes('data:application/msword')) {
      contentType = 'application/msword';
    } else if (dataUrl.includes('data:application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (dataUrl.includes('data:application/vnd.ms-excel')) {
      contentType = 'application/vnd.ms-excel';
    } else if (dataUrl.includes('data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (dataUrl.includes('data:video/mp4')) {
      contentType = 'video/mp4';
    } else if (dataUrl.includes('data:video/webm')) {
      contentType = 'video/webm';
    } else if (dataUrl.includes('data:video/quicktime')) {
      contentType = 'video/quicktime';
    } else if (dataUrl.includes('data:video/x-msvideo')) {
      contentType = 'video/x-msvideo';
    }

    // Extract base64 data
    const base64Data = dataUrl.replace(/^data:[^;]*;base64,/, '');

    return [contentType, base64Data];
  }

  /**
   * Generate S3 key với format: uploads/{userId}/{folder}/{timestamp}-{uuid}.{ext}
   */
  private generateS3Key(fileName: string, userId: number, folder: UploadFolder, contentType: string): string {
    const safeFileName = fileName.replace(/[^\w.\-]/g, '_');
    const timestamp = Date.now();
    const uuid = randomUUID();
    
    // Get extension from contentType
    const ext = contentType.split('/')[1] || this.getExtensionFromFileName(fileName);
    
    return `uploads/${userId}/${folder}/${timestamp}-${uuid}.${ext}`;
  }

  /**
   * Get extension from filename
   */
  private getExtensionFromFileName(fileName: string): string {
    const match = fileName.match(/\.([^.]+)$/);
    return match ? match[1].toLowerCase() : 'bin';
  }

  /**
   * Xóa file từ S3
   */
  async deleteFromS3(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3.send(command);
    } catch (error) {
      console.error(`Failed to delete file from S3: ${key}`, error);
    }
  }
}
