import { z } from 'zod';

// Diqqat: default'siz — .partial() bilan birga default'lar yuborilmagan maydonlarni ham
// standart qiymatga qaytarib qo'yadi (zod'ning tuzog'i), shu sabab faqat createPaymentCardSchema'da beriladi.
const baseFields = {
  bankName: z.string().min(1),
  cardNumber: z.string().min(4),
  holderName: z.string().min(1),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
};

export const createPaymentCardSchema = z.object({
  ...baseFields,
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const updatePaymentCardSchema = z.object(baseFields).partial();

export type CreatePaymentCardInput = z.infer<typeof createPaymentCardSchema>;
export type UpdatePaymentCardInput = z.infer<typeof updatePaymentCardSchema>;
