import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { BotModule } from '../bot/bot.module';
import { UploadsModule } from '../uploads/uploads.module';
import { AdminBroadcastController } from './controllers/admin-broadcast.controller';
import { BroadcastService } from './services/broadcast.service';
import { BroadcastMessagesRepository } from './repositories/broadcast-messages.repository';

@Module({
  imports: [AuthModule, UsersModule, BotModule, UploadsModule],
  controllers: [AdminBroadcastController],
  providers: [BroadcastService, BroadcastMessagesRepository],
})
export class BroadcastModule {}
