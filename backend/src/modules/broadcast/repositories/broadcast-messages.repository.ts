import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import type { BroadcastMessageRow } from '../dto/broadcast-message.dto';

export interface CreateBroadcastMessageInput {
  message: string;
  imageUrls: string[];
  totalRecipients: number;
  createdBy: bigint;
  createdByUsername: string | null;
}

@Injectable()
export class BroadcastMessagesRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(input: CreateBroadcastMessageInput): Promise<BroadcastMessageRow> {
    const { rows } = await this.db.query<BroadcastMessageRow>(
      `insert into broadcast_messages (message, image_urls, total_recipients, created_by, created_by_username)
       values ($1, $2, $3, $4, $5)
       returning *`,
      [input.message, input.imageUrls, input.totalRecipients, input.createdBy.toString(), input.createdByUsername],
    );
    return rows[0];
  }

  async markFinished(id: string, result: { status: 'sent' | 'failed'; sentCount: number; failedCount: number }): Promise<void> {
    await this.db.query(
      `update broadcast_messages set status = $2, sent_count = $3, failed_count = $4, finished_at = now() where id = $1`,
      [id, result.status, result.sentCount, result.failedCount],
    );
  }

  async list(limit: number): Promise<BroadcastMessageRow[]> {
    const { rows } = await this.db.query<BroadcastMessageRow>(`select * from broadcast_messages order by created_at desc limit $1`, [limit]);
    return rows;
  }
}
