import { Injectable } from '@nestjs/common';
import { DatabaseService, type QueryRunner } from '../../../database/database.service';
import type { PaymentDetailRow, PaymentKind, PaymentMethod, PaymentRow, PaymentStatus } from '../dto/payment.dto';

const DETAIL_SELECT = `
  select p.*,
    u.telegram_id as user_telegram_id,
    u.username as user_username,
    u.first_name as user_first_name,
    g.name as game_name,
    pk.label as package_label
  from payments p
  join users u on u.id = p.user_id
  left join games g on g.id = p.game_id
  left join packages pk on pk.id = p.package_id
`;

/** Postgres unique-constraint buzilishi (`match_amount` band chiqib qolgani) — shu kodni tekshirib qayta urinamiz. */
function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === '23505';
}

const MATCH_AMOUNT_ATTEMPTS = 25;

interface CreatePaymentParams {
  userId: string;
  kind: PaymentKind;
  status: PaymentStatus;
  method: PaymentMethod;
  amount: number;
  gameId?: string;
  packageId?: string;
  playerInfo?: Record<string, string>;
  adminId?: bigint;
  matchAmount?: number | null;
  expiresAt?: Date | null;
}

@Injectable()
export class PaymentsRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(params: CreatePaymentParams, runner: QueryRunner = this.db): Promise<PaymentRow> {
    const { rows } = await runner.query<PaymentRow>(
      `insert into payments (user_id, kind, status, method, amount, game_id, package_id, player_info, admin_id, match_amount, expires_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       returning *`,
      [
        params.userId,
        params.kind,
        params.status,
        params.method,
        params.amount,
        params.gameId ?? null,
        params.packageId ?? null,
        params.playerInfo ? JSON.stringify(params.playerInfo) : null,
        params.adminId ?? null,
        params.matchAmount ?? null,
        params.expiresAt ?? null,
      ],
    );
    return rows[0];
  }

  /**
   * Qo'lda o'tkazma kutayotgan to'lovlar (karta/bankomat/chet el) uchun — `amount`ga
   * 1-999 so'mlik tasodifiy qo'shimcha (offset) qo'shib, SMS/notification'ni ANIQ
   * moslashtirish uchun noyob nishon yaratadi. Bir vaqtning o'zida ikkita "hali hal
   * qilinmagan" to'lov bir xil match_amount'ga ega bo'lolmaydi (DB unique index) — shuning
   * uchun kolliziyada boshqa offset bilan qayta uriniladi. 25 urinishdan keyin ham
   * topilmasa (deyarli imkonsiz — 1000 tadan 1000tasi band bo'lishi kerak), baribir
   * buyurtma yaratiladi, faqat match_amount'siz (order#/summa oynasi fallback orqali
   * baribir moslashtiriladi — hech qachon xarid to'xtab qolmaydi).
   */
  async createWithMatchAmount(
    params: Omit<CreatePaymentParams, 'matchAmount' | 'expiresAt'>,
    expiresInMinutes: number,
    runner: QueryRunner = this.db,
  ): Promise<PaymentRow> {
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60_000)

    // Asosiy summaning oxirgi ikki xonasini nolga aylantiramiz (Yuzlar xonasigacha yaxlitlash)
    // Masalan: 2500 -> 2500, 2579 -> 2500, 2000 -> 2000
    const baseAmount = Math.floor(params.amount / 100) * 100

    for (let attempt = 0; attempt < MATCH_AMOUNT_ATTEMPTS; attempt++) {
      // 10 dan 99 gacha bo'lgan mutlaqo tasodifiy 2 xonali son
      const offset = 10 + Math.floor(Math.random() * 90)
      try {
        // Endi yakuniy summa har doim asosiy summadan maksimal 99 so'mga farq qiladi
        // Masalan: 2000 + 45 = 2045 so'm
        return await this.create({ ...params, matchAmount: baseAmount + offset, expiresAt }, runner)
      } catch (err) {
        if (!isUniqueViolation(err)) throw err
      }
    }
    return this.create({ ...params, matchAmount: null, expiresAt }, runner)
  }

  async findById(id: string, runner: QueryRunner = this.db): Promise<PaymentRow | null> {
    const { rows } = await runner.query<PaymentRow>('select * from payments where id = $1', [id]);
    return rows[0] ?? null;
  }

  /** Referral bonusi faqat userning BIRINCHI to'lovida berilishi kerak — shuni aniqlash uchun. */
  async countCompleted(userId: string, runner: QueryRunner = this.db): Promise<number> {
    const { rows } = await runner.query<{ count: string }>(
      `select count(*) as count from payments where user_id = $1 and status = 'completed'`,
      [userId],
    );
    return Number(rows[0].count);
  }

  /** Bitta to'lovni user/o'yin/paket nomi bilan birga — chek yuklanganda to'liq xabar matnini qurish uchun. */
  async findByIdWithDetails(id: string): Promise<PaymentDetailRow | null> {
    const { rows } = await this.db.query<PaymentDetailRow>(`${DETAIL_SELECT} where p.id = $1`, [id]);
    return rows[0] ?? null;
  }

  async listByUser(userId: string, limit = 50): Promise<PaymentRow[]> {
    const { rows } = await this.db.query<PaymentRow>(
      'select * from payments where user_id = $1 order by created_at desc limit $2',
      [userId, limit],
    );
    return rows;
  }

  /** Foydalanuvchining o'z tarixi — o'yin/paket nomi bilan (ekranda "PUBG Mobile · 60 UC" ko'rsatish uchun). */
  async listByUserWithDetails(userId: string, limit = 50): Promise<PaymentDetailRow[]> {
    const { rows } = await this.db.query<PaymentDetailRow>(
      `${DETAIL_SELECT} where p.user_id = $1 order by p.created_at desc limit $2`,
      [userId, limit],
    );
    return rows;
  }

  async listByStatus(status: PaymentStatus, limit = 100): Promise<PaymentRow[]> {
    const { rows } = await this.db.query<PaymentRow>(
      'select * from payments where status = $1 order by created_at asc limit $2',
      [status, limit],
    );
    return rows;
  }

  /** Navbat (pending_review) — kimniki ekanini ham ko'rsatish uchun user/game/package bilan qo'shib. */
  async listPendingWithDetails(limit = 100): Promise<PaymentDetailRow[]> {
    const { rows } = await this.db.query<PaymentDetailRow>(
      `${DETAIL_SELECT} where p.status = 'pending_review' order by p.created_at asc limit $1`,
      [limit],
    );
    return rows;
  }

  /** Buyurtmalar tarixi — hal qilingan (completed/cancelled) va muddati o'tgan to'lovlar, oxirgi holat vaqti bo'yicha. */
  async listDecidedWithDetails(limit = 100): Promise<PaymentDetailRow[]> {
    const { rows } = await this.db.query<PaymentDetailRow>(
      `${DETAIL_SELECT} where p.status in ('completed', 'cancelled', 'expired') order by p.updated_at desc limit $1`,
      [limit],
    );
    return rows;
  }

  async setTelegramAlertMessageId(id: string, messageId: number): Promise<void> {
    await this.db.query('update payments set telegram_alert_message_id = $2 where id = $1', [id, messageId]);
  }

  /** Chek yuklangandan keyin signal xabari rasmli xabar bilan almashtiriladi — buni belgilab qo'yamiz. */
  async setTelegramAlert(id: string, messageId: number, isPhoto: boolean): Promise<void> {
    await this.db.query('update payments set telegram_alert_message_id = $2, telegram_alert_is_photo = $3 where id = $1', [
      id,
      messageId,
      isPhoto,
    ]);
  }

  async setReceiptMessageId(id: string, messageId: number): Promise<void> {
    await this.db.query('update payments set receipt_message_id = $2 where id = $1', [id, messageId]);
  }

  async setReceiptUrl(id: string, url: string): Promise<void> {
    await this.db.query('update payments set receipt_url = $2 where id = $1', [id, url]);
  }

  /**
   * Faqat 'pending_review' holatidagi to'lovni yangi holatga o'tkazadi.
   * Agar boshqa admin/tugma allaqachon hal qilgan bo'lsa — 0 qator qaytadi (poyga holati himoyalangan).
   */
  async decide(
    id: string,
    newStatus: Extract<PaymentStatus, 'completed' | 'cancelled'>,
    adminId: bigint,
    reason: string | null,
    runner: QueryRunner = this.db,
  ): Promise<PaymentRow | null> {
    const { rows } = await runner.query<PaymentRow>(
      `update payments
       set status = $2, admin_id = $3, reject_reason = $4, updated_at = now()
       where id = $1 and status = 'pending_review'
       returning *`,
      [id, newStatus, adminId, reason],
    );
    return rows[0] ?? null;
  }

  /**
   * Admin xato bosgan holat uchun — hal qilingan (completed/cancelled) to'lovni yana
   * 'pending_review'ga qaytaradi. `previous_status` orqali chaqiruvchi moliyaviy
   * ta'sirlarni (balans/keshbek/zaxira) qaytarish kerakmi yo'qmi bilib oladi.
   */
  async undo(id: string, runner: QueryRunner = this.db): Promise<(PaymentRow & { previous_status: PaymentStatus }) | null> {
    const { rows } = await runner.query<PaymentRow & { previous_status: PaymentStatus }>(
      `with old as (
         select status from payments where id = $1 and status in ('completed', 'cancelled')
       )
       update payments
       set status = 'pending_review', admin_id = null, reject_reason = null, updated_at = now()
       from old
       where payments.id = $1
       returning payments.*, old.status as previous_status`,
      [id],
    );
    return rows[0] ?? null;
  }

  /** PayCore orqali yetkazish natijasini yozadi (approve paytida yoki keyinroq polling orqali). */
  async setSupplierResult(
    id: string,
    result: {
      orderId?: number;
      status: 'processing' | 'completed' | 'failed';
      details?: Record<string, unknown> | null;
      error?: string | null;
      provider?: 'paycore' | 'moogold' | 'coindrop';
    },
    runner: QueryRunner = this.db,
  ): Promise<PaymentRow> {
    const { rows } = await runner.query<PaymentRow>(
      `update payments
       set supplier_order_id = coalesce($2, supplier_order_id),
           supplier_status = $3,
           supplier_details = $4,
           supplier_error = $5,
           supplier_provider = coalesce($6, supplier_provider),
           updated_at = now()
       where id = $1
       returning *`,
      [
        id,
        result.orderId ?? null,
        result.status,
        result.details ? JSON.stringify(result.details) : null,
        result.error ?? null,
        result.provider ?? null,
      ],
    );
    return rows[0];
  }

  /** Fon poller uchun — hali PayCore'da 'processing' holatida turgan buyurtmalar. */
  async listProcessingSupplierOrders(): Promise<PaymentRow[]> {
    const { rows } = await this.db.query<PaymentRow>(
      `select * from payments where supplier_status = 'processing' and supplier_order_id is not null`,
    );
    return rows;
  }

  /**
   * SMS/notification webhook uchun — user o'tkazma "Izoh"iga yozgan buyurtma raqami
   * (#orderNo) matnda topilsa, shu orqali ANIQ (bir xil summadagi boshqa to'lovlar bilan
   * chalkashmaydigan) moslashtirish uchun.
   */
  async findPendingByOrderNo(orderNo: number): Promise<PaymentRow | null> {
    const { rows } = await this.db.query<PaymentRow>(
      `select * from payments where order_no = $1 and status = 'pending_review' and method in ('card', 'atm', 'foreign')`,
      [orderNo],
    );
    return rows[0] ?? null;
  }

  /**
   * SMS/notification webhook uchun — `match_amount` bo'yicha ANIQ moslashtirish (asosiy yo'l).
   * `match_amount` DB darajasida noyob (faqat bitta 'pending_review' qator unga ega bo'la
   * oladi) — shuning uchun bu har doim eng ko'pi bilan bitta natija qaytaradi, hech qachon
   * noaniq bo'lmaydi.
   */
  async findPendingByMatchAmount(matchAmount: number): Promise<PaymentRow | null> {
    const { rows } = await this.db.query<PaymentRow>(
      `select * from payments where match_amount = $1 and status = 'pending_review'`,
      [matchAmount],
    );
    return rows[0] ?? null;
  }

  /**
   * Zaxira yo'l — bankdan kelgan SMS/notification'dagi summaga mos, hali kutilayotgan
   * to'lov(lar)ni topadi (yaqinda yaratilganlar orasidan, `match_amount` mos kelmagan yoki
   * mavjud bo'lmagan holatlar uchun). Bir nechta qator qaytsa — chaqiruvchi buni "noaniq"
   * deb hisoblab avtomatik tasdiqlamaydi (pul masalasida noaniqlikda xato qilmaslik kerak).
   */
  async listPendingByAmount(amount: number, windowMinutes: number): Promise<PaymentRow[]> {
    const { rows } = await this.db.query<PaymentRow>(
      `select * from payments
       where status = 'pending_review' and method in ('card', 'atm', 'foreign') and amount = $1
         and created_at > now() - ($2 || ' minutes')::interval
       order by created_at asc`,
      [amount, windowMinutes],
    );
    return rows;
  }

  /** Fon xizmati uchun — muddati o'tgan (`expires_at` allaqachon o'tib ketgan) kutilayotgan to'lovlarni `expired`ga o'tkazadi. */
  async expireOverduePending(): Promise<PaymentRow[]> {
    const { rows } = await this.db.query<PaymentRow>(
      `update payments
       set status = 'expired', updated_at = now()
       where status = 'pending_review' and expires_at is not null and expires_at < now()
       returning *`,
    );
    return rows;
  }
}
