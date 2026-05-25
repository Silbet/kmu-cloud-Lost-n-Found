import { ConflictException, Injectable } from '@nestjs/common';
import { FoundItemStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { toFoundItem, toLostReport, toPublicUser } from '../common/mappers';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateConfigDto } from './dto/update-config.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async reports() {
    const reports = await this.prisma.lostReport.findMany({ orderBy: { createdAt: 'desc' } });
    return reports.map(toLostReport);
  }

  async items() {
    const items = await this.prisma.foundItem.findMany({ orderBy: { createdAt: 'desc' } });
    return items.map(toFoundItem);
  }

  async stats() {
    const reports = await this.prisma.lostReport.groupBy({
      by: ['status'],
      _count: { status: true },
    });
    const items = await this.prisma.foundItem.groupBy({
      by: ['status'],
      _count: { status: true },
    });
    return {
      lostReportsByStatus: Object.fromEntries(reports.map((r) => [r.status, r._count.status])),
      foundItemsByStatus: Object.fromEntries(items.map((i) => [i.status, i._count.status])),
      recentTrend: [],
    };
  }

  async unclaimed() {
    const config = await this.getConfigRaw();
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - config.longUnclaimedDays);
    const items = await this.prisma.foundItem.findMany({
      where: {
        status: { in: [FoundItemStatus.STORED, FoundItemStatus.PICKUP_WAITING] },
        createdAt: { lt: threshold },
      },
      orderBy: { createdAt: 'asc' },
    });
    return items.map(toFoundItem);
  }

  async getConfig() {
    const config = await this.getConfigRaw();
    return {
      longUnclaimedDays: config.longUnclaimedDays,
      pickupAutoCancelDays: config.pickupAutoCancelDays,
      matchDateRangeDays: config.matchDateRangeDays,
    };
  }

  async updateConfig(dto: UpdateConfigDto) {
    const config = await this.prisma.systemConfig.upsert({
      where: { id: 1 },
      update: dto,
      create: { id: 1, ...dto },
    });
    return {
      longUnclaimedDays: config.longUnclaimedDays,
      pickupAutoCancelDays: config.pickupAutoCancelDays,
      matchDateRangeDays: config.matchDateRangeDays,
    };
  }

  async pendingManagers() {
    const users = await this.prisma.user.findMany({
      where: { role: UserRole.MANAGER, pendingApproval: true },
      orderBy: { createdAt: 'desc' },
    });
    return users.map(toPublicUser);
  }

  async approveManager(userId: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { pendingApproval: false },
    });
    return toPublicUser(user);
  }

  async rejectManager(userId: string) {
    await this.prisma.user.delete({ where: { id: userId } });
  }

  async createAdmin(dto: CreateAdminDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException({ error: { code: 'EMAIL_EXISTS', message: '이미 등록된 이메일입니다.' } });
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: await bcrypt.hash(dto.password, 10),
        name: dto.name,
        contact: dto.contact,
        role: UserRole.ADMIN,
      },
    });
    return toPublicUser(user);
  }

  private getConfigRaw() {
    return this.prisma.systemConfig.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
  }
}
