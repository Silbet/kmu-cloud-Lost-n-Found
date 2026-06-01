import { HttpStatus, Injectable } from '@nestjs/common';
import { LostReportStatus, MatchStatus } from '@prisma/client';
import { ApiError } from '../common/api-error';
import { toLostReport } from '../common/mappers';
import { MatchingService } from '../matching/matching.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matching: MatchingService,
  ) {}

  async create(userId: string, dto: CreateReportDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const report = await this.prisma.lostReport.create({
      data: {
        reporterId: user.id,
        reporterName: user.name,
        reporterContact: dto.reporterContact,
        itemName: dto.itemName,
        category: dto.category,
        lostPlace: dto.lostPlace,
        lostAt: new Date(dto.lostDate),
        description: dto.description,
      },
    });
    await this.matching.recomputeForReport(report.id);
    return this.findOne(report.id);
  }

  async findMine(userId: string) {
    const reports = await this.prisma.lostReport.findMany({
      where: { reporterId: userId },
      orderBy: { createdAt: 'desc' },
    });
    return reports.map(toLostReport);
  }

  async findOne(reportId: string) {
    const report = await this.prisma.lostReport.findUnique({
      where: { id: reportId },
    });
    if (!report) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'NOT_FOUND', '신고를 찾을 수 없습니다.');
    }
    return toLostReport(report);
  }

  async update(userId: string, reportId: string, dto: UpdateReportDto) {
    const report = await this.getOwnedReport(userId, reportId);
    if (
      report.status !== LostReportStatus.RECEIVED &&
      report.status !== LostReportStatus.MATCH_CANDIDATE
    ) {
      throw new ApiError(HttpStatus.CONFLICT, 'INVALID_STATUS', '수정할 수 없는 신고 상태입니다.');
    }

    const activeRequest = await this.prisma.match.count({
      where: {
        reportId,
        status: MatchStatus.CONFIRM_REQUESTED,
      },
    });
    if (activeRequest > 0) {
      throw new ApiError(HttpStatus.CONFLICT, 'ACTIVE_CONFIRMATION', '확인 요청 진행 중에는 수정할 수 없습니다.');
    }

    await this.prisma.lostReport.update({
      where: { id: reportId },
      data: {
        itemName: dto.itemName,
        category: dto.category,
        lostPlace: dto.lostPlace,
        lostAt: dto.lostDate ? new Date(dto.lostDate) : undefined,
        description: dto.description,
        reporterContact: dto.reporterContact,
      },
    });
    await this.matching.recomputeForReport(reportId);
    return this.findOne(reportId);
  }

  async delete(userId: string, reportId: string) {
    const report = await this.getOwnedReport(userId, reportId);
    if (report.status === LostReportStatus.FOUND || report.status === LostReportStatus.CLOSED) {
      throw new ApiError(HttpStatus.CONFLICT, 'INVALID_STATUS', '삭제할 수 없는 신고 상태입니다.');
    }
    await this.prisma.lostReport.delete({ where: { id: reportId } });
  }

  async finalize(reportId: string) {
    const report = await this.prisma.lostReport.findUnique({ where: { id: reportId } });
    if (!report) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'NOT_FOUND', '신고를 찾을 수 없습니다.');
    }
    if (report.status !== LostReportStatus.FOUND) {
      throw new ApiError(HttpStatus.CONFLICT, 'INVALID_STATUS', '찾기완료 상태만 종료할 수 있습니다.');
    }
    const updated = await this.prisma.lostReport.update({
      where: { id: reportId },
      data: { status: LostReportStatus.CLOSED },
    });
    return toLostReport(updated);
  }

  private async getOwnedReport(userId: string, reportId: string) {
    const report = await this.prisma.lostReport.findUnique({
      where: { id: reportId },
    });
    if (!report) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'NOT_FOUND', '신고를 찾을 수 없습니다.');
    }
    if (report.reporterId !== userId) {
      throw new ApiError(HttpStatus.FORBIDDEN, 'FORBIDDEN', '본인 신고만 처리할 수 있습니다.');
    }
    return report;
  }
}
