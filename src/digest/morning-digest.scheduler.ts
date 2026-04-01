import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { MorningDigestService } from './morning-digest.service';

/**
 * Fires every minute (UTC). Each user's chosen wall time is evaluated in their own IANA zone.
 */
@Injectable()
export class MorningDigestScheduler implements OnModuleInit {
  private readonly logger = new Logger(MorningDigestScheduler.name);

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly digest: MorningDigestService,
  ) {}

  onModuleInit(): void {
    let job: CronJob;
    try {
      job = new CronJob(
        '* * * * *',
        () => {
          void this.digest.runMorningBoostTick().catch((err) => {
            this.logger.error(`Morning boost tick failed: ${(err as Error).message}`, (err as Error).stack);
          });
        },
        null,
        false,
        'UTC',
      );
    } catch (err) {
      this.logger.error(`Morning boost cron failed to start: ${(err as Error).message}`);
      return;
    }

    this.schedulerRegistry.addCronJob('morningBoostDigest', job);
    job.start();
    this.logger.log('Morning boost scheduler: every minute (per-user local time + timezone)');
  }
}
