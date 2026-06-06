import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FoundItemStatus, LostReportStatus, MatchStatus, PickupCancelReason, PickupStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ScheduledJobsService {
  private readonly logger = new Logger(ScheduledJobsService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cancelExpiredPickupsCron() {
    const result = await this.cancelExpiredPickups();
    if (result.cancelled > 0) {
      this.logger.log(`Auto-cancelled ${result.cancelled} expired pickups.`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async notifyLongUnclaimedItemsCron() {
    const result = await this.notifyLongUnclaimedItems();
    if (result.notifications > 0) {
      this.logger.log(`Created ${result.notifications} long-unclaimed notifications.`);
    }
  }

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
      await this.prisma.$transaction(async (tx) => {
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
        await tx.notification.create({
          data: {
            userId: pickup.report.reporterId,
            type: '수령대기취소',
            title: '수령 대기가 자동 취소되었습니다.',
            message: '수령 기한이 지나 매칭이 다시 활성화되었습니다.',
            link: `/reports/${pickup.reportId}`,
          },
        });
      });
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
      for (const manager of managers) {
        const link =
          manager.role === UserRole.ADMIN
            ? `/admin/unclaimed?itemId=${item.id}`
            : `/manager/items?itemId=${item.id}`;
        const exists = await this.prisma.notification.findFirst({
          where: {
            userId: manager.id,
            type: '폐기검토필요',
            link,
          },
        });
        if (exists) continue;

        await this.prisma.notification.create({
          data: {
            userId: manager.id,
            type: '폐기검토필요',
            title: '장기 미수령 물품 검토가 필요합니다.',
            message: `${item.itemName} 물품이 장기 미수령 기준을 넘었습니다.`,
            link,
          },
        });
        notifications += 1;
      }
    }

    return { notifications };
  }
}
