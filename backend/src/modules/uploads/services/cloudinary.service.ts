import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import type { Env } from '../../../config/env';

/**
 * Rasmlarni (chek/screenshot, o'yin muqovasi) o'zimizning "serverimiz"da saqlash uchun —
 * Render'ning bepul diski vaqtinchalik (har deploy'da o'chadi), shu sabab Cloudinary
 * ishlatiladi (doimiy, bepul tarifda ham yetarli). CLOUDINARY_* .env'da berilmasa,
 * bu funksiyalar shunchaki o'chirilgan holda ishlaydi (null qaytaradi) — ilova qulamaydi.
 */
@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService<Env, true>) {
    const cloudName = this.config.get('CLOUDINARY_CLOUD_NAME', { infer: true });
    const apiKey = this.config.get('CLOUDINARY_API_KEY', { infer: true });
    const apiSecret = this.config.get('CLOUDINARY_API_SECRET', { infer: true });
    this.enabled = Boolean(cloudName && apiKey && apiSecret);

    if (this.enabled) {
      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
    } else {
      this.logger.warn('CLOUDINARY_* sozlanmagan — rasm yuklash funksiyalari o‘chirilgan.');
    }
  }

  /** `folder`: masalan "receipts" yoki "games". Muvaffaqiyatsiz bo'lsa null qaytaradi (chaqiruvchi shu holatni ushlashi kerak). */
  async uploadBuffer(buffer: Buffer, folder: string): Promise<string | null> {
    if (!this.enabled) return null;
    try {
      const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ folder: `zaryad/${folder}` }, (err, res) => {
          if (err || !res) reject(err ?? new Error('Cloudinary javobsiz'));
          else resolve(res);
        });
        stream.end(buffer);
      });
      return result.secure_url;
    } catch (err) {
      this.logger.error(`Cloudinary yuklash xatosi: ${err instanceof Error ? err.message : err}`);
      return null;
    }
  }
}
