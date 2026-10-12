import { z } from 'zod';

export const createPromoCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/, "Kod faqat lotin harflar, raqam, '_' va '-' dan iborat bo'lishi kerak"),
  bonusAmount: z.number().int().positive(),
  expiresAt: z.coerce.date().nullable().optional(),
});

export const updatePromoCodeSchema = z.object({
  bonusAmount: z.number().int().positive().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const redeemPromoCodeSchema = z.object({
  code: z.string().trim().min(1),
});

export type CreatePromoCodeInput = z.infer<typeof createPromoCodeSchema>;
export type UpdatePromoCodeInput = z.infer<typeof updatePromoCodeSchema>;
export type RedeemPromoCodeInput = z.infer<typeof redeemPromoCodeSchema>;
