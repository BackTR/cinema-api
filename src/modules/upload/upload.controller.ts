import {
  Controller, Post, UseGuards, UseInterceptors,
  UploadedFile, ParseFilePipe, MaxFileSizeValidator,
  FileTypeValidator, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly prisma: PrismaService,
  ) {}

  // Upload avatar user
  @Post('avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) throw new Error('File wajib diupload');

    // Hapus avatar lama kalau ada
    const currentUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { avatarUrl: true },
    });

    if (currentUser?.avatarUrl?.includes('cloudinary')) {
      const publicId = this.extractPublicId(currentUser.avatarUrl);
      if (publicId) await this.uploadService.deleteImage(publicId);
    }

    const { url } = await this.uploadService.uploadImage(file, 'avatars', {
      width: 400, height: 400,
    });

    await this.prisma.user.update({
      where: { id: user.sub },
      data: { avatarUrl: url },
    });

    return { url };
  }

  // Upload poster film (admin only)
  @Post('poster')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadPoster(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('File wajib diupload');

    const { url } = await this.uploadService.uploadImage(file, 'posters', {
      width: 800, height: 1200,
    });

    return { url };
  }

  private extractPublicId(url: string): string | null {
    try {
      const match = url.match(/cinema-app\/(avatars|posters)\/[^.]+/);
      return match ? match[0] : null;
    } catch {
      return null;
    }
  }
}