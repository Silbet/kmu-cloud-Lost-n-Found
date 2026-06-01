import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { S3ImageStorageService } from './s3-image-storage.service';

@Module({
  controllers: [UploadsController],
  providers: [S3ImageStorageService],
})
export class UploadsModule {}
