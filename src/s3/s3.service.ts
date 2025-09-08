import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { UploadFolder } from './dto/presign.dto';

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
}
