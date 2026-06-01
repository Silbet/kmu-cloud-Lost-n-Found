import { Global, Module } from '@nestjs/common';
import { MatchingJobDispatcherService } from './matching-job-dispatcher.service';
import { MatchingService } from './matching.service';

@Global()
@Module({
  providers: [MatchingService, MatchingJobDispatcherService],
  exports: [MatchingService, MatchingJobDispatcherService],
})
export class MatchingModule {}
