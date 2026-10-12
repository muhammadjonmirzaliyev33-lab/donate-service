import { z } from 'zod';

// Diqqat: default'siz — .partial() bilan birga default'lar yuborilmagan maydonlarni ham
// standart qiymatga qaytarib qo'yadi (zod'ning tuzog'i), shu sabab faqat createPackageSchema'da beriladi.
const baseFields = {
  label: z.string().min(1),
  amount: z.number().int().positive(),
  bonus: z.number().int().positive().nullable().optional(),
  price: z.number().int().positive(),
  badge: z.enum(['x2', 'top']).nullable().optional(),
  groupName: z.string(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
  // PayCore'dagi aniq nominalga bog'lash (kategoriya o'yinning o'zida — games.supplierCategory).
  // Berilsa, tasdiqlangan xarid avtomatik shu yerdan yetkaziladi. Bo'sh (null) — qo'lda yetkaziladi.
  supplierSlug: z.string().nullable().optional(),
  // Faqat 'vpn' kategoriyasi uchun — qurilmalar soni (PayCore order body'dagi `devices`).
  extraQty: z.number().int().positive().nullable().optional(),
  icon: z.string().nullable().optional(),
};

export const createPackageSchema = z.object({
  ...baseFields,
  groupName: z.string().default('Barchasi'),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const updatePackageSchema = z.object(baseFields).partial();

export type CreatePackageInput = z.infer<typeof createPackageSchema>;
export type UpdatePackageInput = z.infer<typeof updatePackageSchema>;
