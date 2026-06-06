import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { ScheduledJobsService } from './scheduled-jobs.service';

@Module({
  imports: [NotificationsModule],
  providers: [ScheduledJobsService],
  exports: [ScheduledJobsService],
})
export class ScheduledJobsModule {}
