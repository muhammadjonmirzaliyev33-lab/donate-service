import { z } from 'zod';

const methodSchema = z.enum(['card', 'atm', 'foreign', 'balance']);

export const createPurchaseSchema = z.object({
  gameId: z.string().min(1),
  packageId: z.string().uuid(),
  method: methodSchema,
  // O'yinga qarab har xil: {"playerId":"123456789","server":"6"}. Kod o'zgarmasdan
  // yangi o'yin/yangi maydon qo'shilaveradi — shuning uchun qattiq sxema emas, erkin JSON.
  playerInfo: z.record(z.string(), z.string()).default({}),
});

export const createTopupSchema = z.object({
  amount: z.number().int().min(2000, "Kamida 2 000 so'm"),
  method: z.enum(['card', 'atm', 'foreign']),
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type CreateTopupInput = z.infer<typeof createTopupSchema>;
