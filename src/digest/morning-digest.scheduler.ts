import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { MorningDigestService } from './morning-digest.service';

@Injectable()
export class MorningDigestScheduler implements OnModuleInit {
  private readonly logger = new Logger(MorningDigestScheduler.name);

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly digest: MorningDigestService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    if (this.config.get<string>('MORNING_DIGEST_ENABLED') === 'false') {
      this.logger.log('Morning digest cron not registered (MORNING_DIGEST_ENABLED=false)');
      return;
    }

    const cronExpr = this.config.get<string>('MORNING_DIGEST_CRON') ?? '0 6 * * *';
    const timeZone = this.config.get<string>('MORNING_DIGEST_TZ') ?? 'UTC';

    const job = new CronJob(
      cronExpr,
      () => {
        void this.digest.runMorningBoostEmails().catch((err) => {
          this.logger.error(`Morning digest run failed: ${(err as Error).message}`, (err as Error).stack);
        });
      },
      null,
      false,
      timeZone,
    );

    this.schedulerRegistry.addCronJob('morningBoostDigest', job);
    job.start();
    this.logger.log(`Morning digest scheduled: "${cronExpr}" (${timeZone})`);
  }
}
