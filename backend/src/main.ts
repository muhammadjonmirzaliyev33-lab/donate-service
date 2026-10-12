import { setDefaultResultOrder } from 'node:dns';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from './app.module';

// Ko‘p bulutli hostinglarda IPv6 ulanishlari muammo tug‘dirishi mumkin.
// Shu sababli DNS natijalarida IPv4 manzillariga ustuvorlik beramiz.
setDefaultResultOrder('ipv4first');

/**
 * FRONTEND_ORIGIN vergul bilan ajratilgan bir nechta origin'ni
 * qo‘llab-quvvatlaydi.
 *
 * Masalan:
 * FRONTEND_ORIGIN=https://example.com,https://www.example.com
 *
 * Agar FRONTEND_ORIGIN sozlanmagan bo‘lsa, barcha origin'larga
 * ruxsat beriladi. Bu holat development uchun qulay.
 */
function buildCorsOriginCheck(frontendOrigin: string | undefined) {
  const allowedOrigins = (frontendOrigin ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  // FRONTEND_ORIGIN sozlanmagan bo‘lsa, barcha origin'larga ruxsat beriladi.
  if (allowedOrigins.length === 0) {
    return true;
  }

  return (
    origin: string | undefined,
    callback: (error: Error | null, allow?: boolean) => void,
  ) => {
    // Origin mavjud bo‘lmasa, masalan curl yoki server-to-server request bo‘lsa,
    // request'ga ruxsat beramiz.
    if (!origin) {
      return callback(null, true);
    }

    // Origin ruxsat etilgan ro‘yxatda bo‘lsa, request'ga ruxsat beramiz.
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Ruxsat etilmagan origin uchun exception tashlamaymiz.
    // Shu sababli NestJS ExceptionsHandler'da katta stack trace chiqmaydi.
    return callback(null, false);
  };
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Docker image ichida frontend build'i /app/public'ga qo'yiladi — Mini App shu serverning
  // o'zidan ochiladi (alohida Vercel shart emas). Router hash'da ishlaydi, shuning uchun
  // API route'lari bilan to'qnashuv yo'q: static faqat mavjud fayllarni (index.html, assets) beradi.
  const publicDir = join(process.cwd(), 'public');
  if (existsSync(publicDir)) {
    app.useStaticAssets(publicDir, { index: 'index.html', maxAge: '1h' });
  }

  app.enableCors({
    origin: buildCorsOriginCheck(process.env.FRONTEND_ORIGIN || process.env.RENDER_EXTERNAL_URL),
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;

  await app.listen(port);

  console.log(`Server ishga tushdi: http://localhost:${port}`);
}

bootstrap();
