import { Module } from '@nestjs/common';
import { MorningDigestService } from './morning-digest.service';
import { MorningDigestScheduler } from './morning-digest.scheduler';

@Module({
  providers: [MorningDigestService, MorningDigestScheduler],
  exports: [MorningDigestService],
})
export class DigestModule {}
