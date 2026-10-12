import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { RatingController } from './controllers/rating.controller';
import { RatingService } from './services/rating.service';
import { RatingRepository } from './repositories/rating.repository';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [RatingController],
  providers: [RatingService, RatingRepository],
})
export class RatingModule {}
