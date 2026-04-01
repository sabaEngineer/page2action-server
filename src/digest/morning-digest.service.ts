import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InsightStyle } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { styleDigestEmailHtml, styleDigestEmailSubject } from './style-digest-email';
import { zonedWallParts } from './zoned-time.util';

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

        const insight = await this.prisma.insight.findFirst({
          where: {
            userId: user.id,
            style: sch.style,
            morningDigestSentAt: null,
          },
          orderBy: { updatedAt: 'desc' },
          include: { book: { select: { title: true } } },
        });

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
}
