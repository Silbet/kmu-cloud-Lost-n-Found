import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ScheduledJobsService } from '../scheduled-jobs/scheduled-jobs.service';

let scheduledJobsService: ScheduledJobsService | undefined;

async function getScheduledJobsService() {
  if (!scheduledJobsService) {
    const app = await NestFactory.createApplicationContext(AppModule);
    scheduledJobsService = app.get(ScheduledJobsService);
  }
  return scheduledJobsService!;
}

export async function handler(event: unknown) {
  const service = await getScheduledJobsService();
  const result = await service.runDueJobs();
  return {
    status: 'scheduled-jobs-completed',
    receivedAt: new Date().toISOString(),
    result,
    event,
  };
}
