import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { MatchingService } from '../matching/matching.service';
import { MatchingJobMessage } from '../matching/matching-job.types';

let matchingService: MatchingService | undefined;

async function getMatchingService(): Promise<MatchingService> {
  if (!matchingService) {
    const app = await NestFactory.createApplicationContext(AppModule);
    matchingService = app.get(MatchingService);
  }
  return matchingService!;
}

export async function handler(event: { Records?: Array<{ body: string }> }) {
  const service = await getMatchingService();

  for (const record of event.Records ?? []) {
    const message = JSON.parse(record.body) as MatchingJobMessage;
    if (message.target === 'report') {
      await service.recomputeForReport(message.id);
      continue;
    }
    if (message.target === 'item') {
      await service.recomputeForItem(message.id);
    }
  }

  return { processed: event.Records?.length ?? 0 };
}
