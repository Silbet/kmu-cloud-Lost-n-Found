import { Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadDir = process.env.UPLOAD_DIR ?? './uploads';
          mkdirSync(uploadDir, { recursive: true });
          cb(null, uploadDir);
        },
        filename: (_req, file, cb) => {
          const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${suffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    return {
      imageUrl: `/uploads/${file.filename}`,
    };
  }
}
