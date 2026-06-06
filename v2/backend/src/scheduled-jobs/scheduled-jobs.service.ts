import { Injectable, Logger } from '@nestjs/common';
import { FoundItemStatus, LostReportStatus, MatchStatus, PickupCancelReason, PickupStatus, UserRole } from '@prisma/client';
import { NotificationPublisherService } from '../notifications/notification-publisher.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ScheduledJobsService {
  private readonly logger = new Logger(ScheduledJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationPublisher: NotificationPublisherService,
  ) {}

  async runDueJobs(now = new Date()) {
    const [autoCancelled, longUnclaimed] = await Promise.all([
      this.cancelExpiredPickups(now),
      this.notifyLongUnclaimedItems(now),
    ]);
    return { autoCancelled, longUnclaimed };
  }

  async cancelExpiredPickups(now = new Date()) {
    const pickups = await this.prisma.pickup.findMany({
      where: {
        status: PickupStatus.WAITING,
        autoCancelAt: { lte: now },
      },
      include: { report: true },
    });

    let cancelled = 0;
    for (const pickup of pickups) {
      const notification = await this.prisma.$transaction(async (tx) => {
        await tx.pickup.update({
          where: { id: pickup.id },
          data: {
            status: PickupStatus.CANCELLED,
            cancelledAt: now,
            cancelReason: PickupCancelReason.SYSTEM_AUTO_CANCELLED,
          },
        });
        await tx.foundItem.update({
          where: { id: pickup.itemId },
          data: { status: FoundItemStatus.STORED },
        });
        await tx.lostReport.update({
          where: { id: pickup.reportId },
          data: { status: LostReportStatus.MATCH_CANDIDATE },
        });
        await tx.match.update({
          where: { id: pickup.matchId },
          data: { status: MatchStatus.ACTIVE },
        });
        return tx.notification.create({
          data: {
            userId: pickup.report.reporterId,
            type: '수령대기취소',
            title: '수령 대기가 자동 취소되었습니다.',
            message: '수령 기한이 지나 매칭이 다시 활성화되었습니다.',
            link: `/reports/${pickup.reportId}`,
          },
        });
      });
      await this.notificationPublisher.publish(notification);
      cancelled += 1;
    }

    return { cancelled };
  }

  async notifyLongUnclaimedItems(now = new Date()) {
    const config = await this.prisma.systemConfig.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
    const threshold = new Date(now);
    threshold.setDate(threshold.getDate() - config.longUnclaimedDays);

    const [items, managers] = await Promise.all([
      this.prisma.foundItem.findMany({
        where: {
          status: { in: [FoundItemStatus.STORED, FoundItemStatus.PICKUP_WAITING] },
          createdAt: { lt: threshold },
        },
      }),
      this.prisma.user.findMany({
        where: {
          role: { in: [UserRole.MANAGER, UserRole.ADMIN] },
          pendingApproval: false,
        },
      }),
    ]);

    let notifications = 0;
    for (const item of items) {
      const link = `/admin/unclaimed?itemId=${item.id}`;
      for (const manager of managers) {
        const exists = await this.prisma.notification.findFirst({
          where: {
            userId: manager.id,
            type: '폐기검토필요',
            link,
          },
        });
        if (exists) continue;

        const notification = await this.prisma.notification.create({
          data: {
            userId: manager.id,
            type: '폐기검토필요',
            title: '장기 미수령 물품 검토가 필요합니다.',
            message: `${item.itemName} 물품이 장기 미수령 기준을 넘었습니다.`,
            link,
          },
        });
        await this.notificationPublisher.publish(notification);
        notifications += 1;
      }
    }

    this.logger.log(`Scheduled jobs created ${notifications} long-unclaimed notifications.`);
    return { notifications };
  }
}
