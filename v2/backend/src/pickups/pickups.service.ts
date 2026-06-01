import { HttpStatus, Injectable } from '@nestjs/common';
import { FoundItemStatus, LostReportStatus, MatchStatus, PickupStatus } from '@prisma/client';
import { ApiError } from '../common/api-error';
import { fromPickupCancelReason, toPickup } from '../common/mappers';
import { PrismaService } from '../prisma/prisma.service';
import { VerifyPickupDto } from './dto/verify-pickup.dto';

@Injectable()
export class PickupsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(pickupId: string) {
    return toPickup(await this.getPickup(pickupId));
  }

  async byReport(reportId: string) {
    const pickup = await this.prisma.pickup.findFirst({
      where: { reportId, status: PickupStatus.WAITING },
    });
    return pickup ? toPickup(pickup) : null;
  }

  async waiting() {
    const pickups = await this.prisma.pickup.findMany({
      where: { status: PickupStatus.WAITING },
      orderBy: { waitingStartedAt: 'desc' },
    });
    return pickups.map(toPickup);
  }

  async verify(pickupId: string, dto: VerifyPickupDto) {
    const pickup = await this.getPickup(pickupId);
    const report = await this.prisma.lostReport.findUnique({ where: { id: pickup.reportId } });
    const mismatches: ('name' | 'contact' | 'code')[] = [];
    if (!report || report.reporterName !== dto.name) mismatches.push('name');
    if (!report || report.reporterContact !== dto.contact) mismatches.push('contact');
    if (pickup.pickupCode !== dto.code) mismatches.push('code');
    return { allMatched: mismatches.length === 0, mismatches };
  }

  async complete(pickupId: string, verifierId?: string) {
    const pickup = await this.getPickup(pickupId);
    if (pickup.status !== PickupStatus.WAITING) {
      throw new ApiError(HttpStatus.CONFLICT, 'INVALID_STATUS', '수령대기 상태만 완료할 수 있습니다.');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const completed = await tx.pickup.update({
        where: { id: pickupId },
        data: { status: PickupStatus.COMPLETED, completedAt: new Date(), verifierId },
      });
      await tx.foundItem.update({
        where: { id: pickup.itemId },
        data: { status: FoundItemStatus.PICKUP_COMPLETED },
      });
      await tx.lostReport.update({
        where: { id: pickup.reportId },
        data: { status: LostReportStatus.CLOSED },
      });
      await tx.match.update({
        where: { id: pickup.matchId },
        data: { status: MatchStatus.INACTIVE },
      });
      return completed;
    });
    return toPickup(updated);
  }

  async cancel(pickupId: string, reason: string) {
    const pickup = await this.getPickup(pickupId);
    if (pickup.status !== PickupStatus.WAITING) {
      throw new ApiError(HttpStatus.CONFLICT, 'INVALID_STATUS', '수령대기 상태만 취소할 수 있습니다.');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const cancelled = await tx.pickup.update({
        where: { id: pickupId },
        data: {
          status: PickupStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: fromPickupCancelReason(reason),
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
      return cancelled;
    });
    return toPickup(updated);
  }

  private async getPickup(pickupId: string) {
    const pickup = await this.prisma.pickup.findUnique({ where: { id: pickupId } });
    if (!pickup) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'NOT_FOUND', '수령 정보를 찾을 수 없습니다.');
    }
    return pickup;
  }
}
