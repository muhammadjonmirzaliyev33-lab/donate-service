import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../guards/admin.guard';

/** Frontend shu orqali "joriy foydalanuvchi admin'mi?" tekshiradi (masalan pastki menyuda Admin tugmasini ko'rsatish/yashirish uchun). */
@UseGuards(AdminGuard)
@Controller('admin/ping')
export class AdminPingController {
  @Get()
  ping() {
    return { ok: true };
  }
}
