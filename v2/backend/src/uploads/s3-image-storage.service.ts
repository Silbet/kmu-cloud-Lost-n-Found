import { Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { getAwsRegion, optionalNumberEnv, requiredEnv } from '../config/cloud.config';
import { CreatePresignedUploadDto } from './dto/create-presigned-upload.dto';

@Injectable()
export class S3ImageStorageService {
  private readonly client = new S3Client({ region: getAwsRegion() });

  async createPresignedUpload(dto: CreatePresignedUploadDto) {
    const bucket = requiredEnv('S3_IMAGE_BUCKET');
    const expiresIn = optionalNumberEnv('PRESIGNED_UPLOAD_EXPIRES_SECONDS', 300);
    const key = this.createObjectKey(dto);

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: dto.contentType,
    });

    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn });

    return {
      uploadUrl,
      objectKey: key,
      imageUrl: this.createImageUrl(bucket, key),
      method: 'PUT',
      expiresIn,
      headers: {
        'Content-Type': dto.contentType,
      },
    };
  }

  private createObjectKey(dto: CreatePresignedUploadDto) {
    const safePurpose = (dto.purpose || 'items').replace(/[^\w-]/g, '-').toLowerCase();
    const extension = this.extensionFor(dto);
    const date = new Date().toISOString().slice(0, 10);
    return `uploads/${safePurpose}/${date}/${randomUUID()}${extension}`;
  }

  private extensionFor(dto: CreatePresignedUploadDto) {
    const fromName = extname(dto.filename).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.webp'].includes(fromName)) return fromName;
    if (dto.contentType === 'image/png') return '.png';
    if (dto.contentType === 'image/webp') return '.webp';
    return '.jpg';
  }

  private createImageUrl(bucket: string, key: string) {
    const baseUrl = process.env.S3_IMAGE_PUBLIC_BASE_URL;
    if (baseUrl) return `${baseUrl.replace(/\/$/, '')}/${key}`;
    return `s3://${bucket}/${key}`;
  }
}
