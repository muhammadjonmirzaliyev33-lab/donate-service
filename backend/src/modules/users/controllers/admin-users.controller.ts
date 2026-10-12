import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { UsersService } from '../services/users.service';

@UseGuards(AdminGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  listAll() {
    return this.usersService.listAll();
  }
}
