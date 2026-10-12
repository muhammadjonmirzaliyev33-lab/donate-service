import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Env } from '../config/env';
import { AppException } from '../common/errors';

/**
 * Repositorylarda "oddiy so'rov" va "tranzaksiya ichidagi so'rov"ni bir xil kod bilan
 * yozish uchun — DatabaseService yoki PoolClient, ikkalasi ham shu interfeysga mos keladi.
 * (Union emas — ataylab bitta interfeys, aks holda pg'ning ortiqcha yuklangan `query`
 * signaturalari bilan union'ni chaqirib bo'lmaydi degan TS xatosi chiqadi.)
 */
export interface QueryRunner {
  query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

interface RecordedQuery {
  text: string;
  params?: unknown[];
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool!: Pool;
  /** Ikkinchi (backup/mirror) baza — BACKUP_DATABASE_URL berilmasa, o'chirilgan holda qoladi. */
  private backupPool?: Pool;

  constructor(private readonly config: ConfigService<Env, true>) {}

  async onModuleInit() {
    this.pool = new Pool({ connectionString: this.config.get('DATABASE_URL', { infer: true }) });
    await this.applySchema(this.pool, 'asosiy');

    const backupUrl = this.config.get('BACKUP_DATABASE_URL', { infer: true });
    if (backupUrl) {
      // Neon kabi managed Postgres'lar odatda o'z-o'ziga imzolangan bo'lmagan sertifikat
      // bilan ishlaydi, lekin ba'zan rejim talab qiladi — shuning uchun ssl yoqilgan.
      this.backupPool = new Pool({ connectionString: backupUrl, ssl: { rejectUnauthorized: false } });
      try {
        await this.applySchema(this.backupPool, 'backup');
        this.logger.log('Backup DB (ikkinchi bucket) ulandi va sxema tekshirildi');
      } catch (err) {
        this.logger.warn(`Backup DB'ga ulanib bo'lmadi (davom etyapmiz, faqat asosiy DB ishlaydi): ${err instanceof Error ? err.message : err}`);
        this.backupPool = undefined;
      }
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
    await this.backupPool?.end();
  }

  async query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) {
    const result = await this.pool.query<T>(text, params);
    this.mirror(text, params);
    return result;
  }

  /**
   * Bir nechta so'rovni bitta tranzaksiyada bajarish uchun. Muvaffaqiyatli commit
   * bo'lgandan keyin, xuddi shu so'rovlar ketma-ketligi backup DB'da ham (alohida
   * tranzaksiya sifatida) qayta ishga tushiriladi — best-effort, asosiy oqimni to'xtatmaydi.
   */
  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    const recorded: RecordedQuery[] = [];
    const recordingClient = this.backupPool ? this.wrapWithRecorder(client, recorded) : client;
    try {
      await client.query('BEGIN');
      const result = await fn(recordingClient);
      await client.query('COMMIT');
      this.mirrorTransaction(recorded);
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      // AppException — kutilgan biznes-qoida xatosi (masalan "promokod allaqachon
      // ishlatilgan"), infratuzilma nosozligi emas. Buni ERROR + stack trace bilan
      // logga chiqarish shovqin yaratadi va haqiqiy xatolarni ko'zdan yashiradi.
      if (err instanceof AppException) {
        this.logger.debug(`Tranzaksiya bekor qilindi (kutilgan): ${err.message}`);
      } else {
        this.logger.error('Tranzaksiya bekor qilindi', err instanceof Error ? err.stack : err);
      }
      throw err;
    } finally {
      client.release();
    }
  }

  /** Asosiy DB'da muvaffaqiyatli bajarilgan so'rovni backup DB'ga ham yuboradi (fire-and-forget). */
  private mirror(text: string, params?: unknown[]) {
    if (!this.backupPool) return;
    this.backupPool.query(text, params).catch((err) => {
      this.logger.warn(`Backup DB'ga yozib bo'lmadi: ${err instanceof Error ? err.message : err}`);
    });
  }

  /** Tranzaksiya ichida yozilgan so'rovlarni backup DB'da alohida tranzaksiya sifatida takrorlaydi. */
  private mirrorTransaction(recorded: RecordedQuery[]) {
    if (!this.backupPool || recorded.length === 0) return;
    this.backupPool
      .connect()
      .then(async (client) => {
        try {
          await client.query('BEGIN');
          for (const { text, params } of recorded) {
            await client.query(text, params);
          }
          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK').catch(() => undefined);
          this.logger.warn(`Backup DB tranzaksiyasi bekor qilindi: ${err instanceof Error ? err.message : err}`);
        } finally {
          client.release();
        }
      })
      .catch((err) => {
        this.logger.warn(`Backup DB'ga ulanib bo'lmadi: ${err instanceof Error ? err.message : err}`);
      });
  }

  /** Tranzaksiya ichida chaqirilgan har bir client.query(...) ni recorded[] ga yozib boradi. */
  private wrapWithRecorder(client: PoolClient, recorded: RecordedQuery[]): PoolClient {
    return new Proxy(client, {
      get(target, prop, receiver) {
        if (prop === 'query') {
          return (text: string, params?: unknown[]) => {
            if (typeof text === 'string' && text.trim().toUpperCase() !== 'BEGIN' && text.trim().toUpperCase() !== 'COMMIT') {
              recorded.push({ text, params });
            }
            return (target.query as (text: string, params?: unknown[]) => unknown)(text, params);
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    }) as PoolClient;
  }

  /**
   * init.sql — hammasi `if not exists` bilan yozilgan (idempotent), shuning uchun
   * har ishga tushishda xavfsiz qayta ishlatiladi. Managed Postgres (Render va h.k.)
   * uchun qo'lda migratsiya qilish shart bo'lmasin deb shu yerda avtomatik chaqiriladi.
   */
  private async applySchema(pool: Pool, label: string) {
    try {
      const sqlPath = join(process.cwd(), 'docker', 'postgres', 'init.sql');
      const sql = readFileSync(sqlPath, 'utf8');
      await pool.query(sql);
      this.logger.log(`DB sxemasi tekshirildi/yangilandi (init.sql) — ${label}`);
    } catch (err) {
      this.logger.warn(`init.sql avtomatik qo'llanmadi (${label}, davom etyapmiz): ${err instanceof Error ? err.message : err}`);
    }
  }
}
