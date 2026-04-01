import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InsightStyle } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { NOTIFICATION_EMAIL_STYLES } from '../users/notification-schedule.seed';
import { styleDigestEmailHtml, styleDigestEmailSubject } from './style-digest-email';
import { zonedWallParts } from './zoned-time.util';

const NOTIFIABLE_STYLES = new Set<InsightStyle>(NOTIFICATION_EMAIL_STYLES);

/**
 * Next insight to email for this style: prefer never-emailed, then rotate by least-recently emailed
 * so the queue cycles after every insight has been sent at least once.
 */
async function pickNextInsightForDigest(
  prisma: PrismaService,
  userId: string,
  style: InsightStyle,
) {
  const include = { book: { select: { title: true } } } as const;
  let insight = await prisma.insight.findFirst({
    where: { userId, style, morningDigestSentAt: null },
    orderBy: { updatedAt: 'desc' },
    include,
  });
  if (!insight) {
    insight = await prisma.insight.findFirst({
      where: { userId, style, morningDigestSentAt: { not: null } },
      orderBy: { morningDigestSentAt: 'asc' },
      include,
    });
  }
  return insight;
}

function isDatabaseUnavailableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes("Can't reach database server") ||
    error.message.includes('P1001') ||
    error.message.includes('ECONNREFUSED')
  );
}

@Injectable()
export class MorningDigestService {
  private readonly logger = new Logger(MorningDigestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Every minute: for each enabled per-style schedule, if local wall time matches (user `deliveryTimeZone`)
   * and we have not sent that style today, email one unsent insight of that style.
   */
  async runMorningBoostTick(): Promise<void> {
    const now = new Date();
    const clientUrl = (this.config.get<string>('CLIENT_URL') ?? 'https://page2action.com').replace(/\/$/, '');
    const insightsUrl = `${clientUrl}/insights`;

    const users = await this.prisma.user.findMany({
      where: {
        notificationSchedules: { some: { enabled: true } },
      },
      select: {
        id: true,
        email: true,
        name: true,
        deliveryTimeZone: true,
        notificationSchedules: {
          where: { enabled: true },
          select: { style: true, localHour: true, localMinute: true },
        },
      },
    });

    let sent = 0;

    for (const user of users) {
      let nowParts: { ymd: string; hour: number; minute: number };
      try {
        nowParts = zonedWallParts(now, user.deliveryTimeZone);
      } catch {
        this.logger.warn(`Invalid deliveryTimeZone for user ${user.id}: ${user.deliveryTimeZone}`);
        continue;
      }

      for (const sch of user.notificationSchedules) {
        if (nowParts.hour !== sch.localHour || nowParts.minute !== sch.localMinute) {
          continue;
        }

        const last = await this.prisma.userNotificationLastSend.findUnique({
          where: { userId_style: { userId: user.id, style: sch.style } },
        });

        if (last) {
          try {
            const lastParts = zonedWallParts(last.lastSentAt, user.deliveryTimeZone);
            if (lastParts.ymd === nowParts.ymd) {
              continue;
            }
          } catch {
            /* send allowed */
          }
        }

        const insight = await pickNextInsightForDigest(this.prisma, user.id, sch.style);

        if (!insight) {
          continue;
        }

        const html = styleDigestEmailHtml({
          style: sch.style,
          name: user.name ?? '',
          bookTitle: insight.book.title,
          contentHtml: insight.content,
          insightsUrl,
        });

        const subject = styleDigestEmailSubject(sch.style);
        const ok = await this.email.send(user.email, subject, html);

        if (ok) {
          const sentAt = new Date();
          await this.prisma.$transaction([
            this.prisma.insight.update({
              where: { id: insight.id },
              data: { morningDigestSentAt: sentAt },
            }),
            this.prisma.userNotificationLastSend.upsert({
              where: { userId_style: { userId: user.id, style: sch.style } },
              create: { userId: user.id, style: sch.style, lastSentAt: sentAt },
              update: { lastSentAt: sentAt },
            }),
          ]);
          sent += 1;
          this.logger.log(`${sch.style} digest sent to ${user.email} (insight ${insight.id})`);
        } else {
          this.logger.warn(`${sch.style} digest failed for ${user.email} (insight ${insight.id})`);
        }
      }
    }

    if (sent > 0) {
      this.logger.log(`Insight digest tick: ${sent} sent`);
    }
  }

  /**
   * Send the next unsent insight for this style immediately (same email as scheduled digest).
   */
  async sendNextDigestEmailNow(
    userId: string,
    style: InsightStyle,
  ): Promise<{ sent: boolean; message: string }> {
    if (!NOTIFIABLE_STYLES.has(style)) {
      throw new BadRequestException('This notification style cannot be emailed');
    }

    const clientUrl = (this.config.get<string>('CLIENT_URL') ?? 'https://page2action.com').replace(/\/$/, '');
    const insightsUrl = `${clientUrl}/insights`;

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });
      if (!user) {
        return { sent: false, message: 'User not found' };
      }

      const insight = await pickNextInsightForDigest(this.prisma, userId, style);

      if (!insight) {
        return {
          sent: false,
          message: 'No insight with this style yet. Add one in the app and assign this style.',
        };
      }

      const html = styleDigestEmailHtml({
        style,
        name: user.name ?? '',
        bookTitle: insight.book.title,
        contentHtml: insight.content,
        insightsUrl,
      });
      const subject = styleDigestEmailSubject(style);
      const ok = await this.email.send(user.email, subject, html);

      if (!ok) {
        return { sent: false, message: 'Email could not be sent. Check server email settings.' };
      }

      const sentAt = new Date();
      await this.prisma.$transaction([
        this.prisma.insight.update({
          where: { id: insight.id },
          data: { morningDigestSentAt: sentAt },
        }),
        this.prisma.userNotificationLastSend.upsert({
          where: { userId_style: { userId, style } },
          create: { userId, style, lastSentAt: sentAt },
          update: { lastSentAt: sentAt },
        }),
      ]);

      this.logger.log(`${style} send-now to ${user.email} (insight ${insight.id})`);
      return { sent: true, message: 'Sent.' };
    } catch (error) {
      if (isDatabaseUnavailableError(error)) {
        this.logger.warn(`send-now DB unavailable for user ${userId}`);
        return {
          sent: false,
          message: 'Database is temporarily unavailable. Please try again in a moment.',
        };
      }

      this.logger.error(`send-now failed for user ${userId}`, error instanceof Error ? error.stack : undefined);
      return {
        sent: false,
        message: 'Could not process send now. Please try again.',
      };
    }
  }
}
