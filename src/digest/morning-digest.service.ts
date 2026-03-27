import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InsightStyle } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { morningBoostEmailHtml } from './morning-boost-email';

@Injectable()
export class MorningDigestService {
  private readonly logger = new Logger(MorningDigestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Sends one unsent Morning Boost insight per user (most recently updated first).
   * Marks the insight with morningDigestSentAt so it is not sent again.
   */
  async runMorningBoostEmails(): Promise<void> {
    if (this.config.get<string>('MORNING_DIGEST_ENABLED') === 'false') {
      this.logger.log('Morning digest disabled (MORNING_DIGEST_ENABLED=false)');
      return;
    }

    const clientUrl = (this.config.get<string>('CLIENT_URL') ?? 'https://page2action.com').replace(/\/$/, '');
    const insightsUrl = `${clientUrl}/insights`;

    const users = await this.prisma.user.findMany({
      select: { id: true, email: true, name: true },
    });

    let sent = 0;
    let skipped = 0;

    for (const user of users) {
      const insight = await this.prisma.insight.findFirst({
        where: {
          userId: user.id,
          style: InsightStyle.MORNING_BOOST,
          morningDigestSentAt: null,
        },
        orderBy: { updatedAt: 'desc' },
        include: { book: { select: { title: true } } },
      });

      if (!insight) {
        skipped += 1;
        continue;
      }

      const html = morningBoostEmailHtml({
        name: user.name ?? '',
        bookTitle: insight.book.title,
        contentHtml: insight.content,
        insightsUrl,
      });

      const ok = await this.email.send(user.email, '☀️ Your Morning Boost — Page2Action', html);

      if (ok) {
        await this.prisma.insight.update({
          where: { id: insight.id },
          data: { morningDigestSentAt: new Date() },
        });
        sent += 1;
        this.logger.log(`Morning boost sent to ${user.email} (insight ${insight.id})`);
      } else {
        this.logger.warn(`Morning boost failed for ${user.email} (insight ${insight.id})`);
      }
    }

    this.logger.log(`Morning digest finished: ${sent} sent, ${skipped} users had no pending boost`);
  }
}
