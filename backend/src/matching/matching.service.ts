import { Injectable } from '@nestjs/common';
import { FoundItemStatus, LostReportStatus, MatchStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MatchingService {
  constructor(private readonly prisma: PrismaService) {}

  async recomputeForReport(reportId: string) {
    const report = await this.prisma.lostReport.findUnique({
      where: { id: reportId },
    });
    if (!report) return;

    await this.prisma.match.deleteMany({
      where: {
        reportId,
        status: {
          in: [MatchStatus.ACTIVE, MatchStatus.REJECTED],
        },
      },
    });

    const config = await this.getConfig();
    const from = new Date(report.lostAt);
    from.setDate(from.getDate() - config.matchDateRangeDays);
    const to = new Date(report.lostAt);
    to.setDate(to.getDate() + config.matchDateRangeDays);

    const candidates = await this.prisma.foundItem.findMany({
      where: {
        status: FoundItemStatus.STORED,
        category: report.category,
        foundAt: {
          gte: from,
          lte: to,
        },
      },
    });

    for (const item of candidates) {
      if (!this.placeMatches(report.lostPlace, item.foundPlace)) continue;
      await this.prisma.match.upsert({
        where: {
          reportId_itemId: {
            reportId: report.id,
            itemId: item.id,
          },
        },
        update: {},
        create: {
          reportId: report.id,
          itemId: item.id,
          status: MatchStatus.ACTIVE,
          score: 80,
        },
      });
    }

    const hasMatches = await this.prisma.match.count({
      where: {
        reportId,
        status: {
          in: [MatchStatus.ACTIVE, MatchStatus.CONFIRM_REQUESTED, MatchStatus.REJECTED],
        },
      },
    });

    if (
      report.status === LostReportStatus.RECEIVED ||
      report.status === LostReportStatus.MATCH_CANDIDATE
    ) {
      await this.prisma.lostReport.update({
        where: { id: reportId },
        data: {
          status:
            hasMatches > 0
              ? LostReportStatus.MATCH_CANDIDATE
              : LostReportStatus.RECEIVED,
        },
      });
    }
  }

  async recomputeForItem(itemId: string) {
    const item = await this.prisma.foundItem.findUnique({
      where: { id: itemId },
    });
    if (!item || item.status !== FoundItemStatus.STORED) return;

    const config = await this.getConfig();
    const from = new Date(item.foundAt);
    from.setDate(from.getDate() - config.matchDateRangeDays);
    const to = new Date(item.foundAt);
    to.setDate(to.getDate() + config.matchDateRangeDays);

    const reports = await this.prisma.lostReport.findMany({
      where: {
        status: {
          in: [LostReportStatus.RECEIVED, LostReportStatus.MATCH_CANDIDATE],
        },
        category: item.category,
        lostAt: {
          gte: from,
          lte: to,
        },
      },
    });

    for (const report of reports) {
      if (!this.placeMatches(report.lostPlace, item.foundPlace)) continue;
      await this.prisma.match.upsert({
        where: {
          reportId_itemId: {
            reportId: report.id,
            itemId: item.id,
          },
        },
        update: {},
        create: {
          reportId: report.id,
          itemId: item.id,
          status: MatchStatus.ACTIVE,
          score: 80,
        },
      });
      await this.prisma.lostReport.update({
        where: { id: report.id },
        data: { status: LostReportStatus.MATCH_CANDIDATE },
      });
    }
  }

  private async getConfig() {
    return this.prisma.systemConfig.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
  }

  private placeMatches(a: string, b: string) {
    return a.includes(b) || b.includes(a);
  }
}
