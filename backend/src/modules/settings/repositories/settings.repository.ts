import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import type { SettingsRow } from '../dto/settings.dto';
import type { UpdateSettingsInput } from '../schemas/settings.schema';

@Injectable()
export class SettingsRepository {
  constructor(private readonly db: DatabaseService) {}

  async get(): Promise<SettingsRow> {
    const { rows } = await this.db.query<SettingsRow>('select * from app_settings where id = true');
    return rows[0];
  }

  async update(input: UpdateSettingsInput): Promise<SettingsRow> {
    const columnMap: Record<string, string> = {
      averageProcessingMinutes: 'average_processing_minutes',
      supportUsername: 'support_username',
      channelUrl: 'channel_url',
      referralFixedBonus: 'referral_fixed_bonus',
      referralPercent: 'referral_percent',
      profileName: 'profile_name',
      profileHandle: 'profile_handle',
      profileId: 'profile_id',
    };

    const entries = Object.entries(input).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return this.get();

    const setClauses: string[] = [];
    const values: unknown[] = [];
    for (const [key, value] of entries) {
      const column = columnMap[key];
      if (!column) continue;
      values.push(value);
      setClauses.push(`${column} = $${values.length}`);
    }
    setClauses.push('updated_at = now()');

    const { rows } = await this.db.query<SettingsRow>(
      `update app_settings set ${setClauses.join(', ')} where id = true returning *`,
      values,
    );
    return rows[0];
  }
}
