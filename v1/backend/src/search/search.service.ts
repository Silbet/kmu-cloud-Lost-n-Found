import { Injectable } from '@nestjs/common';
import { FoundItemStatus, LostReportStatus } from '@prisma/client';
import {
  fromFoundItemStatus,
  fromLostReportStatus,
  toFoundItem,
  toLostReport,
} from '../common/mappers';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async searchLost(params: Record<string, string>, loggedIn: boolean) {
    const status = fromLostReportStatus(params.status);
    const reports = await this.prisma.lostReport.findMany({
      where: {
        status: status ?? { not: LostReportStatus.CLOSED },
        category: params.category || undefined,
        lostPlace: params.place ? { contains: params.place } : undefined,
        lostAt: this.dateRange(params.dateFrom, params.dateTo),
        OR: params.keyword
          ? [
              { itemName: { contains: params.keyword } },
              { description: { contains: params.keyword } },
            ]
          : undefined,
      },
      orderBy: { createdAt: 'desc' },
    });
    return reports.map((report) => {
      const dto = toLostReport(report);
      if (!loggedIn) {
        dto.reporterName = this.maskName(dto.reporterName);
        dto.reporterContact = this.maskContact(dto.reporterContact);
        dto.description = '';
      }
      return dto;
    });
  }

  async searchFound(params: Record<string, string>, loggedIn: boolean) {
    const status = fromFoundItemStatus(params.status);
    const items = await this.prisma.foundItem.findMany({
      where: {
        status: status ?? {
          in: [FoundItemStatus.STORED, FoundItemStatus.PICKUP_WAITING, FoundItemStatus.DISPOSAL_PENDING],
        },
        category: params.category || undefined,
        foundPlace: params.place ? { contains: params.place } : undefined,
        foundAt: this.dateRange(params.dateFrom, params.dateTo),
        OR: params.keyword
          ? [
              { itemName: { contains: params.keyword } },
              { description: { contains: params.keyword } },
            ]
          : undefined,
      },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((item) => {
      const dto = toFoundItem(item);
      if (!loggedIn) {
        dto.finderName = dto.finderName ? this.maskName(dto.finderName) : undefined;
        dto.finderContact = undefined;
        dto.storageLocation = undefined;
        dto.description = '';
      }
      return dto;
    });
  }

  private dateRange(dateFrom?: string, dateTo?: string) {
    if (!dateFrom && !dateTo) return undefined;
    return {
      gte: dateFrom ? new Date(dateFrom) : undefined,
      lte: dateTo ? new Date(dateTo) : undefined,
    };
  }

  private maskName(name: string) {
    if (name.length <= 1) return '*';
    return `${name[0]}${'*'.repeat(Math.max(1, name.length - 1))}`;
  }

  private maskContact(contact: string) {
    return contact.replace(/\d(?=\d{4})/g, '*');
  }
}
