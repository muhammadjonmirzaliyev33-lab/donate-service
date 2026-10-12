import { z } from 'zod';

export const updateSettingsSchema = z.object({
  averageProcessingMinutes: z.number().int().positive().optional(),
  supportUsername: z.string().nullable().optional(),
  channelUrl: z.string().nullable().optional(),
  referralFixedBonus: z.number().int().nonnegative().optional(),
  referralPercent: z.number().nonnegative().max(100).optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
