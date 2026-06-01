import { HttpStatus, Injectable } from '@nestjs/common';
import { FoundItemStatus, LostReportStatus, MatchStatus, PickupStatus } from '@prisma/client';
import { ApiError } from '../common/api-error';
import { toFoundItem, toMatch } from '../common/mappers';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForReport(reportId: string) {
    const matches = await this.prisma.match.findMany({
      where: { reportId },
      include: { item: true },
      orderBy: { createdAt: 'desc' },
    });
    return matches.map((match) => ({ ...toMatch(match), item: toFoundItem(match.item) }));
  }

  async listPending() {
    const matches = await this.prisma.match.findMany({
      where: { status: MatchStatus.CONFIRM_REQUESTED },
      include: { item: true },
      orderBy: { requestedAt: 'desc' },
    });
    return matches.map((match) => ({ ...toMatch(match), item: toFoundItem(match.item) }));
  }

  async confirm(userId: string, matchId: string) {
    const match = await this.getMatch(matchId);
    const report = await this.prisma.lostReport.findUniqueOrThrow({ where: { id: match.reportId } });
    if (report.reporterId !== userId) {
      throw new ApiError(HttpStatus.FORBIDDEN, 'FORBIDDEN', '본인 신고만 확인 요청할 수 있습니다.');
    }
    if (match.status !== MatchStatus.ACTIVE && match.status !== MatchStatus.REJECTED) {
      throw new ApiError(HttpStatus.CONFLICT, 'INVALID_STATUS', '확인 요청할 수 없는 매칭 상태입니다.');
    }
    const active = await this.prisma.match.count({
      where: {
        reportId: match.reportId,
        status: { in: [MatchStatus.CONFIRM_REQUESTED, MatchStatus.APPROVED] },
      },
    });
    if (active > 0) {
      throw new ApiError(HttpStatus.CONFLICT, 'ACTIVE_CONFIRMATION', '이미 진행 중인 확인 요청이 있습니다.');
    }
    const updated = await this.prisma.match.update({
      where: { id: matchId },
      data: { status: MatchStatus.CONFIRM_REQUESTED, requestedAt: new Date() },
    });
    return toMatch(updated);
  }

  async approve(matchId: string) {
    const match = await this.getMatch(matchId);
    if (match.status !== MatchStatus.CONFIRM_REQUESTED) {
      throw new ApiError(HttpStatus.CONFLICT, 'INVALID_STATUS', '승인할 수 없는 매칭 상태입니다.');
    }
    const config = await this.prisma.systemConfig.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
    const pickupCode = this.pickupCode();
    const now = new Date();
    const autoCancelAt = new Date(now);
    autoCancelAt.setDate(autoCancelAt.getDate() + config.pickupAutoCancelDays);

    const updated = await this.prisma.$transaction(async (tx) => {
      const approved = await tx.match.update({
        where: { id: matchId },
        data: { status: MatchStatus.APPROVED, reviewedAt: now },
      });
      await tx.lostReport.update({
        where: { id: match.reportId },
        data: { status: LostReportStatus.FOUND },
      });
      await tx.foundItem.update({
        where: { id: match.itemId },
        data: { status: FoundItemStatus.PICKUP_WAITING },
      });
      await tx.pickup.create({
        data: {
          matchId,
          reportId: match.reportId,
          itemId: match.itemId,
          pickupCode,
          status: PickupStatus.WAITING,
          waitingStartedAt: now,
          autoCancelAt,
        },
      });
      const report = await tx.lostReport.findUnique({ where: { id: match.reportId } });
      if (report) {
        await tx.notification.create({
          data: {
            userId: report.reporterId,
            type: '확인요청승인',
            title: '확인 요청이 승인되었습니다.',
            message: '수령 코드가 발급되었습니다. 보관소에서 수령을 진행하세요.',
            link: `/reports/${report.id}`,
          },
        });
      }
      return approved;
    });

    return toMatch(updated);
  }

  async reject(matchId: string, reason?: string) {
    const match = await this.getMatch(matchId);
    if (match.status !== MatchStatus.CONFIRM_REQUESTED) {
      throw new ApiError(HttpStatus.CONFLICT, 'INVALID_STATUS', '반려할 수 없는 매칭 상태입니다.');
    }
    const updated = await this.prisma.match.update({
      where: { id: matchId },
      data: {
        status: MatchStatus.REJECTED,
        rejectReason: reason,
        reviewedAt: new Date(),
      },
    });
    return toMatch(updated);
  }

  async claim(userId: string, itemId: string, reportId: string) {
    const report = await this.prisma.lostReport.findUnique({ where: { id: reportId } });
    const item = await this.prisma.foundItem.findUnique({ where: { id: itemId } });
    if (!report || !item) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'NOT_FOUND', '신고 또는 습득물을 찾을 수 없습니다.');
    }
    if (report.reporterId !== userId) {
      throw new ApiError(HttpStatus.FORBIDDEN, 'FORBIDDEN', '본인 신고만 요청할 수 있습니다.');
    }
    if (item.status !== FoundItemStatus.STORED) {
      throw new ApiError(HttpStatus.CONFLICT, 'INVALID_STATUS', '보관중인 습득물만 요청할 수 있습니다.');
    }
    const match = await this.prisma.match.upsert({
      where: { reportId_itemId: { reportId, itemId } },
      update: { status: MatchStatus.CONFIRM_REQUESTED, requestedAt: new Date() },
      create: { reportId, itemId, status: MatchStatus.CONFIRM_REQUESTED, requestedAt: new Date() },
    });
    await this.prisma.lostReport.update({
      where: { id: reportId },
      data: { status: LostReportStatus.MATCH_CANDIDATE },
    });
    return toMatch(match);
  }

  private async getMatch(matchId: string) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'NOT_FOUND', '매칭을 찾을 수 없습니다.');
    }
    return match;
  }

  private pickupCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }
}
