import { InsightStyle } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Insight styles that can be scheduled for email (Today’s takeaway excluded for now). */
export const NOTIFICATION_EMAIL_STYLES = [
  InsightStyle.MORNING_BOOST,
  InsightStyle.APPLY_TODAY,
  InsightStyle.DO_IT_NOW,
  InsightStyle.SPREAD_THE_IDEA,
] as const;

export type NotifiableInsightStyle = (typeof NOTIFICATION_EMAIL_STYLES)[number];

const DEFAULT_SCHEDULE: Record<NotifiableInsightStyle, { enabled: boolean; h: number; m: number }> = {
  [InsightStyle.MORNING_BOOST]: { enabled: true, h: 6, m: 0 },
  [InsightStyle.APPLY_TODAY]: { enabled: false, h: 9, m: 0 },
  [InsightStyle.DO_IT_NOW]: { enabled: false, h: 12, m: 0 },
  [InsightStyle.SPREAD_THE_IDEA]: { enabled: false, h: 15, m: 0 },
};

export async function seedUserNotificationSchedules(prisma: PrismaService, userId: string): Promise<void> {
  await prisma.$transaction(
    NOTIFICATION_EMAIL_STYLES.map((style) => {
      const d = DEFAULT_SCHEDULE[style];
      return prisma.userNotificationSchedule.upsert({
        where: { userId_style: { userId, style } },
        create: {
          userId,
          style,
          enabled: d.enabled,
          localHour: d.h,
          localMinute: d.m,
        },
        update: {},
      });
    }),
  );
}
