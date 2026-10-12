import { Injectable } from '@nestjs/common';
import { SettingsRepository } from '../repositories/settings.repository';
import { toSettingsDto, type SettingsDto } from '../dto/settings.dto';
import type { UpdateSettingsInput } from '../schemas/settings.schema';

@Injectable()
export class SettingsService {
  constructor(private readonly repository: SettingsRepository) {}

  async get(): Promise<SettingsDto> {
    return toSettingsDto(await this.repository.get());
  }

  async update(input: UpdateSettingsInput): Promise<SettingsDto> {
    return toSettingsDto(await this.repository.update(input));
  }
}
