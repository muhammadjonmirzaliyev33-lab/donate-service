import { z } from 'zod';

const serverOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

// Standart qiymatsiz (default'siz) — yangilashda faqat YUBORILGAN maydonlar o'zgaradi.
// Diqqat: agar bu yerga .default() qo'shsangiz, .partial() bilan birga updateGameSchema
// yuborilmagan maydonlarni HAM standart qiymatga qaytarib qo'yadi (zod'ning tuzog'i) —
// shu sabab default'lar faqat createGameSchema'da, alohida qo'shiladi.
const baseFields = {
  name: z.string().min(1),
  category: z.string(),
  currencyName: z.string().min(1),
  gradient: z.string(),
  icon: z.string().nullable().optional(),
  requiresServer: z.boolean(),
  serverOptions: z.array(serverOptionSchema).nullable().optional(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
  // Yetkazib beruvchining o'yin identifikatori — berilsa, xarid oldidan playerId shu orqali
  // tekshiriladi va (paketlar slug'ga ega bo'lsa) tasdiqlangach avtomatik yetkaziladi.
  // paycore: kategoriya slug'i (masalan "free-fire") · moogold: product_id (masalan "7847")
  // · coindrop: game_key (masalan "mobile-legends").
  supplierCategory: z.string().nullable().optional(),
  supplierProvider: z.enum(['paycore', 'moogold', 'coindrop']).optional(),
  // Faqat moogold uchun: 1 = direct top-up, 2 = eVoucher.
  supplierOrderCategory: z.number().int().positive().nullable().optional(),
};

export const createGameSchema = z.object({
  id: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9_]+$/, "id faqat lotin kichik harflar, raqam va '_' bo'lishi mumkin"),
  ...baseFields,
  category: z.string().default(''),
  gradient: z.string().default('linear-gradient(160deg,#222,#333)'),
  requiresServer: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const updateGameSchema = z.object(baseFields).partial();

export type CreateGameInput = z.infer<typeof createGameSchema>;
export type UpdateGameInput = z.infer<typeof updateGameSchema>;

export const verifyPlayerSchema = z.object({
  playerId: z.string().min(1),
  server: z.string().optional(),
});

export type VerifyPlayerInput = z.infer<typeof verifyPlayerSchema>;
