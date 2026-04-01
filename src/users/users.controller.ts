import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { MorningDigestService } from '../digest/morning-digest.service';
import { PatchUserNotificationsDto } from './dto/patch-user-notifications.dto';
import { SendNotificationNowDto } from './dto/send-notification-now.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly digest: MorningDigestService,
  ) {}

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

  @Post('me/notifications/send-now')
  @UseGuards(JwtAuthGuard)
  sendNotificationNow(@CurrentUser() user: AuthUser, @Body() dto: SendNotificationNowDto) {
    return this.digest.sendNextDigestEmailNow(user.id, dto.style);
  }
}
