import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { PatchUserNotificationsDto } from './dto/patch-user-notifications.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me/notifications')
  @UseGuards(JwtAuthGuard)
  getNotifications(@CurrentUser() user: AuthUser) {
    return this.users.getUserNotifications(user.id);
  }

  @Patch('me/notifications')
  @UseGuards(JwtAuthGuard)
  patchNotifications(@CurrentUser() user: AuthUser, @Body() dto: PatchUserNotificationsDto) {
    return this.users.patchUserNotifications(user.id, dto);
  }
}
