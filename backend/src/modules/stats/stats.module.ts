import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminStatsController } from './controllers/admin-stats.controller';
import { StatsService } from './services/stats.service';
import { StatsRepository } from './repositories/stats.repository';

@Module({
  imports: [AuthModule],
  controllers: [AdminStatsController],
  providers: [StatsService, StatsRepository],
})
export class StatsModule {}
