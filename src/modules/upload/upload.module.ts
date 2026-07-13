import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { CloudinaryProvider } from './cloudinary.provider';

@Module({
  controllers: [UploadController],
  providers: [CloudinaryProvider, UploadService],
  exports: [UploadService],
})
export class UploadModule {}