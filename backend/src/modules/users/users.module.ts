import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersController } from './controllers/users.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { UsersService } from './services/users.service';
import { UsersRepository } from './repositories/users.repository';

@Module({
  imports: [AuthModule],
  controllers: [UsersController, AdminUsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
