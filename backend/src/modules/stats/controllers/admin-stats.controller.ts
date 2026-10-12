import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { StatsService } from '../services/stats.service';

@UseGuards(AdminGuard)
@Controller('admin/stats')
export class AdminStatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('overview')
  overview() {
    return this.statsService.overview();
  }

  @Get('top-games')
  topGames(@Query('days') days?: string, @Query('limit') limit?: string) {
    const parsedDays = Number.parseInt(days ?? '', 10);
    const parsedLimit = Number.parseInt(limit ?? '', 10);
    return this.statsService.topGames(parsedDays > 0 ? parsedDays : 7, parsedLimit > 0 ? parsedLimit : 10);
  }

  @Get('low-stock')
  lowStock(@Query('threshold') threshold?: string) {
    const parsed = Number.parseInt(threshold ?? '', 10);
    return this.statsService.lowStock(Number.isFinite(parsed) ? parsed : 0);
  }
}
