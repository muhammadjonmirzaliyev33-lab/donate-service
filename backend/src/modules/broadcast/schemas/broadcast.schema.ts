import { z } from 'zod';

export const broadcastSchema = z.object({
  message: z.string().min(1).max(4000),
});

export type BroadcastInput = z.infer<typeof broadcastSchema>;
