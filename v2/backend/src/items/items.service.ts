import { HttpStatus, Injectable } from '@nestjs/common';
import { FoundItemStatus } from '@prisma/client';
import { ApiError } from '../common/api-error';
import { fromFoundItemStatus, toFoundItem } from '../common/mappers';
import { MatchingService } from '../matching/matching.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { SetStorageDto } from './dto/set-storage.dto';

@Injectable()
export class ItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matching: MatchingService,
  ) {}

  async create(userId: string, dto: CreateItemDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const item = await this.prisma.foundItem.create({
      data: {
        finderId: user.id,
        finderName: user.name,
        finderContact: user.contact,
        itemName: dto.itemName,
        category: dto.category,
        foundPlace: dto.foundPlace,
        foundAt: new Date(dto.foundDate),
        description: dto.description,
        imageUrl: dto.imageUrl,
      },
    });
    return toFoundItem(item);
  }

  async findMine(userId: string) {
    const items = await this.prisma.foundItem.findMany({
      where: { finderId: userId },
      orderBy: { createdAt: 'desc' },
    });
    return items.map(toFoundItem);
  }

  async findAll() {
    const items = await this.prisma.foundItem.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return items.map(toFoundItem);
  }

  async remove(itemId: string) {
    const item = await this.getItem(itemId);
    if (item.status !== FoundItemStatus.REGISTERED) {
      throw new ApiError(HttpStatus.CONFLICT, 'INVALID_STATUS', '등록 상태에서만 삭제할 수 있습니다.');
    }
    await this.prisma.foundItem.delete({ where: { id: itemId } });
  }

  async setStorage(itemId: string, dto: SetStorageDto) {
    await this.getItem(itemId);
    const item = await this.prisma.foundItem.update({
      where: { id: itemId },
      data: {
        storageLocation: dto.storageLocation,
        status: FoundItemStatus.STORED,
      },
    });
    await this.matching.recomputeForItem(item.id);
    return toFoundItem(item);
  }

  async setStatus(itemId: string, statusValue: string) {
    await this.getItem(itemId);
    const status = fromFoundItemStatus(statusValue);
    if (!status) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'INVALID_STATUS', '알 수 없는 습득물 상태입니다.');
    }
    const item = await this.prisma.foundItem.update({
      where: { id: itemId },
      data: { status },
    });
    return toFoundItem(item);
  }

  private async getItem(itemId: string) {
    const item = await this.prisma.foundItem.findUnique({ where: { id: itemId } });
    if (!item) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'NOT_FOUND', '습득물을 찾을 수 없습니다.');
    }
    return item;
  }
}
