import { Module } from '@nestjs/common';
import { NotificationPublisherService } from './notification-publisher.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationPublisherService],
  exports: [NotificationPublisherService],
})
export class NotificationsModule {}
