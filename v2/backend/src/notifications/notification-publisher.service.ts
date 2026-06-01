import { Injectable } from '@nestjs/common';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { getAwsRegion, requiredEnv } from '../config/cloud.config';

interface NotificationPublishInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
}

@Injectable()
export class NotificationPublisherService {
  private readonly sns = new SNSClient({ region: getAwsRegion() });

  async publish(notification: NotificationPublishInput) {
    if (!this.shouldPublishToSns()) {
      return { mode: 'in-app' };
    }

    await this.sns.send(
      new PublishCommand({
        TopicArn: requiredEnv('SNS_NOTIFICATION_TOPIC_ARN'),
        Subject: notification.title.slice(0, 100),
        Message: JSON.stringify(notification),
        MessageAttributes: {
          type: {
            DataType: 'String',
            StringValue: notification.type,
          },
          userId: {
            DataType: 'String',
            StringValue: notification.userId,
          },
        },
      }),
    );

    return { mode: 'sns' };
  }

  private shouldPublishToSns() {
    return (
      process.env.NOTIFICATION_PUBLISH_MODE === 'sns' &&
      Boolean(process.env.SNS_NOTIFICATION_TOPIC_ARN)
    );
  }
}
