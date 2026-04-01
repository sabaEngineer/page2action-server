import { BadRequestException, Injectable } from '@nestjs/common';
import { InsightStyle, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isValidIanaTimeZone } from '../digest/zoned-time.util';
import { PatchUserNotificationsDto } from './dto/patch-user-notifications.dto';
import {
  NOTIFICATION_EMAIL_STYLES,
  seedUserNotificationSchedules,
} from './notification-schedule.seed';

const NOTIFIABLE_STYLES = new Set<InsightStyle>(NOTIFICATION_EMAIL_STYLES);

export type NotificationScheduleRow = {
  style: InsightStyle;
  enabled: boolean;
  localHour: number;
  localMinute: number;
};

export type UserNotificationsResponse = {
  deliveryTimeZone: string;
  schedules: NotificationScheduleRow[];
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureNotificationSchedules(userId: string): Promise<void> {
    await seedUserNotificationSchedules(this.prisma, userId);
  }

  async getUserNotifications(userId: string): Promise<UserNotificationsResponse> {
    await this.ensureNotificationSchedules(userId);
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        deliveryTimeZone: true,
        notificationSchedules: {
          select: { style: true, enabled: true, localHour: true, localMinute: true },
        },
      },
    });
    const order = new Map<InsightStyle, number>(
      (NOTIFICATION_EMAIL_STYLES as readonly InsightStyle[]).map((s, i) => [s, i]),
    );
    const schedules = [...user.notificationSchedules]
      .filter((row) => NOTIFIABLE_STYLES.has(row.style))
      .sort((a, b) => (order.get(a.style) ?? 99) - (order.get(b.style) ?? 99));
    return {
      deliveryTimeZone: user.deliveryTimeZone,
      schedules,
    };
  }

  async patchUserNotifications(userId: string, dto: PatchUserNotificationsDto): Promise<UserNotificationsResponse> {
    if (
      (dto.enabled !== undefined || dto.localHour !== undefined || dto.localMinute !== undefined) &&
      dto.style === undefined
    ) {
      throw new BadRequestException('Include style when updating schedule fields');
    }

    if (dto.style !== undefined && !NOTIFIABLE_STYLES.has(dto.style)) {
      throw new BadRequestException('This notification style is not available');
    }

    if (dto.deliveryTimeZone !== undefined) {
      const tz = dto.deliveryTimeZone.trim();
      if (!isValidIanaTimeZone(tz)) {
        throw new BadRequestException('Invalid deliveryTimeZone (expected IANA, e.g. Europe/Berlin)');
      }
      await this.prisma.user.update({
        where: { id: userId },
        data: { deliveryTimeZone: tz },
      });
    }

    if (dto.style !== undefined) {
      const hasSchedulePatch =
        dto.enabled !== undefined || dto.localHour !== undefined || dto.localMinute !== undefined;
      if (!hasSchedulePatch) {
        throw new BadRequestException('With style, include enabled and/or localHour/localMinute');
      }

      await this.ensureNotificationSchedules(userId);

      const data: Prisma.UserNotificationScheduleUpdateInput = {};
      if (dto.enabled !== undefined) data.enabled = dto.enabled;
      if (dto.localHour !== undefined) data.localHour = dto.localHour;
      if (dto.localMinute !== undefined) data.localMinute = dto.localMinute;

      await this.prisma.userNotificationSchedule.update({
        where: { userId_style: { userId, style: dto.style } },
        data,
      });
    }

    return this.getUserNotifications(userId);
  }
}
