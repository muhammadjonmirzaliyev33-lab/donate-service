export interface BroadcastMessageRow {
  id: string;
  message: string;
  image_urls: string[];
  status: 'sending' | 'sent' | 'failed';
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_by: string;
  created_by_username: string | null;
  created_at: Date;
  finished_at: Date | null;
}

export interface BroadcastMessageDto {
  id: string;
  message: string;
  imageUrls: string[];
  status: 'sending' | 'sent' | 'failed';
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdByUsername: string | null;
  createdAt: Date;
  finishedAt: Date | null;
}

export function toBroadcastMessageDto(row: BroadcastMessageRow): BroadcastMessageDto {
  return {
    id: row.id,
    message: row.message,
    imageUrls: row.image_urls,
    status: row.status,
    totalRecipients: row.total_recipients,
    sentCount: row.sent_count,
    failedCount: row.failed_count,
    createdByUsername: row.created_by_username,
    createdAt: row.created_at,
    finishedAt: row.finished_at,
  };
}
