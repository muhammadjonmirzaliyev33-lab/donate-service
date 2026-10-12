import { Controller, Get } from '@nestjs/common';

/** Render/uptime monitorlar uchun — auth kerak emas. */
@Controller()
export class HealthController {
  @Get(['/', 'health'])
  health() {
    return { status: 'ok' };
  }
}
