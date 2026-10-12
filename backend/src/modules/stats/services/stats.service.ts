import { Injectable } from '@nestjs/common';
import { StatsRepository } from '../repositories/stats.repository';
import { toOverviewDto, toTopGameDto, type LowStockDto, type OverviewDto, type TopGameDto } from '../dto/stats.dto';

@Injectable()
export class StatsService {
  constructor(private readonly statsRepository: StatsRepository) {}

  async overview(): Promise<OverviewDto> {
    const row = await this.statsRepository.overview();
    return toOverviewDto(row);
  }

  /** Eng ko'p sotilayotgan o'yinlar — daromad bo'yicha kamayish tartibida. */
  async topGames(days: number, limit: number): Promise<TopGameDto[]> {
    const rows = await this.statsRepository.topGames(days, limit);
    return rows.map(toTopGameDto);
  }

  /** Zaxirasi tugab qolgan/kam qolgan o'yinlar — admin qayta to'ldirishi kerak bo'lganlar. */
  async lowStock(threshold = 0): Promise<LowStockDto[]> {
    const rows = await this.statsRepository.lowStock(threshold);
    return rows.map((r) => ({ gameId: r.game_id, name: r.name, balance: Number(r.balance) }));
  }
}
