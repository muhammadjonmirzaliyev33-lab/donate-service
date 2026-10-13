import { z } from 'zod';

export const updateSettingsSchema = z.object({
  averageProcessingMinutes: z.number().int().positive().optional(),
  supportUsername: z.string().nullable().optional(),
  channelUrl: z.string().nullable().optional(),
  referralFixedBonus: z.number().int().nonnegative().optional(),
  referralPercent: z.number().nonnegative().max(100).optional(),
  profileName: z.string().max(64).nullable().optional(),
  profileHandle: z.string().max(64).nullable().optional(),
  profileId: z.string().max(32).nullable().optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
