import { z } from 'zod';

// sms-webhook.schema.ts ichida o'zgartiring:
export const paymentWebhookSchema = z.object({
  secretKey: z.string().optional(),
  deviceToken: z.string().optional(),
  source: z.enum(['sms', 'notification']).default('sms'),
  text: z.string().optional().default(''), // min(1) o'rniga ixtiyoriy va default bo'sh string qildik
  from: z.string().optional(),
  app: z.string().optional(),
  title: z.string().optional(),
});

export type PaymentWebhookInput = z.infer<typeof paymentWebhookSchema>;
