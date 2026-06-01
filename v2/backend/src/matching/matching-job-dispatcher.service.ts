import { Injectable } from '@nestjs/common';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { getAwsRegion, requiredEnv } from '../config/cloud.config';
import { MatchingService } from './matching.service';
import { MatchingJobMessage, MatchingJobTarget } from './matching-job.types';

@Injectable()
export class MatchingJobDispatcherService {
  private readonly sqs = new SQSClient({ region: getAwsRegion() });

  constructor(private readonly matching: MatchingService) {}

  async dispatch(target: MatchingJobTarget, id: string) {
    if (this.shouldUseQueue()) {
      await this.sendToQueue({ target, id, requestedAt: new Date().toISOString() });
      return { mode: 'queue' };
    }

    await this.runInline(target, id);
    return { mode: 'inline' };
  }

  private shouldUseQueue() {
    return process.env.MATCHING_MODE === 'queue' && Boolean(process.env.SQS_MATCHING_QUEUE_URL);
  }

  private async sendToQueue(message: MatchingJobMessage) {
    await this.sqs.send(
      new SendMessageCommand({
        QueueUrl: requiredEnv('SQS_MATCHING_QUEUE_URL'),
        MessageBody: JSON.stringify(message),
      }),
    );
  }

  private async runInline(target: MatchingJobTarget, id: string) {
    if (target === 'report') {
      await this.matching.recomputeForReport(id);
      return;
    }
    await this.matching.recomputeForItem(id);
  }
}
