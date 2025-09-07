import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';

@Injectable()
export class S3Service {
  private s3 = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  private bucket = process.env.S3_BUCKET!;
  private base = process.env.PUBLIC_BASE_URL!;

  async presignPut(userId: string, fileName: string, contentType: string, folder: 'images' | 'videos') {
    const ext = (fileName.split('.').pop() || 'bin').toLowerCase();
    const key = `uploads/${userId}/${folder}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3, cmd, { expiresIn: 300 });
    return {
      key,
      uploadUrl,
      publicUrl: `${this.base}/${key}`,
    };
  }
}
