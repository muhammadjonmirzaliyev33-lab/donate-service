export interface SettingsRow {
  average_processing_minutes: number;
  support_username: string | null;
  channel_url: string | null;
  referral_fixed_bonus: string;
  referral_percent: string;
  profile_name: string | null;
  profile_handle: string | null;
  profile_id: string | null;
  updated_at: Date;
}

export interface SettingsDto {
  averageProcessingMinutes: number;
  supportUsername: string | null;
  channelUrl: string | null;
  referralFixedBonus: number;
  referralPercent: number;
  profileName: string | null;
  profileHandle: string | null;
  profileId: string | null;
}

export function toSettingsDto(row: SettingsRow): SettingsDto {
  return {
    averageProcessingMinutes: row.average_processing_minutes,
    supportUsername: row.support_username,
    channelUrl: row.channel_url,
    referralFixedBonus: Number(row.referral_fixed_bonus),
    referralPercent: Number(row.referral_percent),
    profileName: row.profile_name,
    profileHandle: row.profile_handle,
    profileId: row.profile_id,
  };
}
