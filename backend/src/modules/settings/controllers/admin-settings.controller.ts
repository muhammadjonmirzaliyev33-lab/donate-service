import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { SettingsService } from '../services/settings.service';
import { updateSettingsSchema, type UpdateSettingsInput } from '../schemas/settings.schema';

@UseGuards(AdminGuard)
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly service: SettingsService) {}

  /** Admin panellar sozlamalarni shu yerdan o'qiydi (foydalanuvchi tomonidagi `GET /settings` endi initData talab qiladi). */
  @Get()
  get() {
    return this.service.get();
  }

  @Patch()
  update(@Body(new ZodValidationPipe(updateSettingsSchema)) body: UpdateSettingsInput) {
    return this.service.update(body);
  }
}
