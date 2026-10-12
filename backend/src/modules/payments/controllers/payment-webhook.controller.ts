import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { paymentWebhookSchema, type PaymentWebhookInput } from '../schemas/sms-webhook.schema';
import { PaymentMatcherService } from '../services/payment-matcher.service';

/**
 * Telefondagi SMS Forwarder yoki Notification Listener dasturi shu manzilga POST qiladi
 * (Click/Payme/bank SMS'i yoki push notification'i kelganda). Telegram initData bilan
 * emas — o'zining tokeni bilan himoyalangan (auth qilingan foydalanuvchi emas, alohida
 * qurilma; bir nechta qurilma uchun bir nechta token qo'llab-quvvatlanadi).
 */
@Controller('webhooks')
export class PaymentWebhookController {
  constructor(private readonly matcher: PaymentMatcherService) {}

  @Post('payment')
  receivePayment(@Body(new ZodValidationPipe(paymentWebhookSchema)) body: PaymentWebhookInput) {
    return this.process(body);
  }

  /** Eski manzil — allaqachon sozlangan SMS Forwarder qurilmalari uchun ishlab turadi. */
  @Post('sms')
  receiveSms(@Body(new ZodValidationPipe(paymentWebhookSchema)) body: PaymentWebhookInput) {
    return this.process({ ...body, source: 'sms' });
  }

  private async process(body: PaymentWebhookInput) {
    const token = body.deviceToken ?? body.secretKey ?? '';
    if (!this.matcher.isValidToken(token)) {
      throw new UnauthorizedException("Noto'g'ri qurilma tokeni");
    }
    const text = [body.title, body.text].filter(Boolean).join('\n');
    await this.matcher.handle(body.source, text);
    return { ok: true };
  }
}
