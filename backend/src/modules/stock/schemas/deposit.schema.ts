import { z } from 'zod';

export const depositSchema = z.object({
  amount: z.number().int().positive(),
  note: z.string().max(500).optional(),
});

export type DepositInput = z.infer<typeof depositSchema>;
