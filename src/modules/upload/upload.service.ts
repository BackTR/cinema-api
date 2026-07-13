import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

export type UploadFolder = 'avatars' | 'posters';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 5;

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  async uploadImage(
    file: Express.Multer.File,
    folder: UploadFolder,
    options?: { width?: number; height?: number },
  ): Promise<{ url: string; publicId: string }> {
    // Validasi mime type
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException('Format file tidak didukung. Gunakan JPG, PNG, atau WebP.');
    }

    // Validasi ukuran
    const maxBytes = MAX_SIZE_MB * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new BadRequestException(`Ukuran file maksimal ${MAX_SIZE_MB}MB`);
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `cinema-app/${folder}`,
          transformation: [
            {
              width: options?.width ?? (folder === 'avatars' ? 400 : 800),
              height: options?.height ?? (folder === 'avatars' ? 400 : 1200),
              crop: 'fill',
              gravity: folder === 'avatars' ? 'face' : 'auto',
              quality: 'auto:good',
              fetch_format: 'auto',
            },
          ],
        },
        (error, result?: UploadApiResponse) => {
          if (error || !result) {
            this.logger.error('Cloudinary upload error:', error);
            reject(new BadRequestException('Gagal mengupload gambar'));
            return;
          }
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      this.logger.error(`Failed to delete image ${publicId}:`, error);
    }
  }
}