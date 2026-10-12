import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { Env } from '../config/env';

/**
 * Faqat oddiy qulf (lock) uchun ishlatiladi — masalan broadcast xabar yuborishda ikkita
 * so'rov bir vaqtda ishlab ketmasligi uchun. REDIS_URL berilmasa, qulf har doim "bo'sh"
 * deb hisoblanadi (chaqiruvchi davom etaveradi) — Redis boshqa hech qanday integratsiya
 * kabi ixtiyoriy, uni sozlamasdan ham tizim ishlayveradi.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService<Env, true>) {}

  onModuleInit(): void {
    const url = this.config.get('REDIS_URL', { infer: true });
    if (!url) return;
    this.client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });
    this.client.on('error', (err) => this.logger.warn(`Redis xatosi: ${err.message}`));
    this.client.connect().catch((err) => this.logger.warn(`Redis'ga ulanib bo'lmadi: ${err.message}`));
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.quit().catch(() => undefined);
  }

  /** Qulfni olishga urinadi — muvaffaqiyatli bo'lsa true, band bo'lsa (yoki Redis sozlanmagan bo'lsa) true qaytaradi. */
  async tryAcquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    if (!this.client) return true;
    try {
      const result = await this.client.set(key, '1', 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch (err) {
      this.logger.warn(`Qulf olishda xato (${key}): ${err instanceof Error ? err.message : err}`);
      return true; // Redis vaqtincha ishlamasa — funksiyani butunlay bloklab qo'ymaymiz.
    }
  }

  async releaseLock(key: string): Promise<void> {
    if (!this.client) return;
    await this.client.del(key).catch((err) => this.logger.warn(`Qulfni bo'shatishda xato (${key}): ${err}`));
  }
}
