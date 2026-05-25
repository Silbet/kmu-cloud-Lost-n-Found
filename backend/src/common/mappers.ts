import {
  FoundItemStatus,
  LostReportStatus,
  MatchStatus,
  PickupCancelReason,
  PickupStatus,
  UserRole,
  type FoundItem,
  type LostReport,
  type Match,
  type Notification,
  type Pickup,
  type User,
} from '@prisma/client';

export function toPublicRole(role: UserRole) {
  if (role === UserRole.ADMIN) return '운영관리자';
  if (role === UserRole.MANAGER) return '보관소관리자';
  return '일반사용자';
}

export function toPublicUser(user: User) {
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    contact: user.contact,
    roles: [toPublicRole(user.role)],
    pendingApproval: user.pendingApproval,
  };
}

export function toLostReportStatus(status: LostReportStatus) {
  const map = {
    RECEIVED: '접수',
    MATCH_CANDIDATE: '매칭후보있음',
    FOUND: '찾기완료',
    CLOSED: '종료',
  } as const;
  return map[status];
}

export function fromLostReportStatus(status?: string): LostReportStatus | undefined {
  if (!status) return undefined;
  if (status === '접수' || status === 'RECEIVED') return LostReportStatus.RECEIVED;
  if (status === '매칭후보있음' || status === 'MATCH_CANDIDATE') return LostReportStatus.MATCH_CANDIDATE;
  if (status === '찾기완료' || status === 'FOUND') return LostReportStatus.FOUND;
  if (status === '종료' || status === 'CLOSED') return LostReportStatus.CLOSED;
  return undefined;
}

export function toFoundItemStatus(status: FoundItemStatus) {
  const map = {
    REGISTERED: '등록',
    STORED: '보관중',
    PICKUP_WAITING: '수령대기',
    PICKUP_COMPLETED: '수령완료',
    DISPOSAL_PENDING: '폐기예정',
  } as const;
  return map[status];
}

export function fromFoundItemStatus(status?: string): FoundItemStatus | undefined {
  if (!status) return undefined;
  if (status === '등록' || status === 'REGISTERED') return FoundItemStatus.REGISTERED;
  if (status === '보관중' || status === 'STORED') return FoundItemStatus.STORED;
  if (status === '수령대기' || status === 'PICKUP_WAITING') return FoundItemStatus.PICKUP_WAITING;
  if (status === '수령완료' || status === 'PICKUP_COMPLETED') return FoundItemStatus.PICKUP_COMPLETED;
  if (status === '폐기예정' || status === 'DISPOSAL_PENDING') return FoundItemStatus.DISPOSAL_PENDING;
  return undefined;
}

export function toMatchStatus(status: MatchStatus) {
  const map = {
    ACTIVE: '활성',
    CONFIRM_REQUESTED: '확인요청중',
    APPROVED: '승인',
    REJECTED: '반려',
    INACTIVE: '비활성',
  } as const;
  return map[status];
}

export function toPickupStatus(status: PickupStatus) {
  const map = {
    WAITING: '수령대기',
    COMPLETED: '수령완료',
    CANCELLED: '취소',
  } as const;
  return map[status];
}

export function fromPickupCancelReason(reason: string): PickupCancelReason {
  if (reason === '관리자취소' || reason === 'MANAGER_CANCELLED') return PickupCancelReason.MANAGER_CANCELLED;
  if (reason === '시스템자동취소' || reason === 'SYSTEM_AUTO_CANCELLED') return PickupCancelReason.SYSTEM_AUTO_CANCELLED;
  return PickupCancelReason.REPORTER_CANCELLED;
}

export function toLostReport(report: LostReport) {
  return {
    reportId: report.id,
    reporterId: report.reporterId,
    reporterName: report.reporterName,
    reporterContact: report.reporterContact,
    itemName: report.itemName,
    category: report.category,
    lostPlace: report.lostPlace,
    lostDate: report.lostAt.toISOString(),
    description: report.description,
    status: toLostReportStatus(report.status),
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}

export function toFoundItem(item: FoundItem) {
  return {
    itemId: item.id,
    finderId: item.finderId ?? undefined,
    finderName: item.finderName ?? undefined,
    finderContact: item.finderContact ?? undefined,
    itemName: item.itemName,
    category: item.category,
    foundPlace: item.foundPlace,
    foundDate: item.foundAt.toISOString(),
    description: item.description,
    imageUrl: item.imageUrl ?? undefined,
    storageLocation: item.storageLocation ?? undefined,
    status: toFoundItemStatus(item.status),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function toMatch(match: Match) {
  return {
    matchId: match.id,
    reportId: match.reportId,
    itemId: match.itemId,
    status: toMatchStatus(match.status),
    rejectReason: match.rejectReason ?? undefined,
    createdAt: match.createdAt.toISOString(),
    updatedAt: match.updatedAt.toISOString(),
  };
}

export function toPickup(pickup: Pickup) {
  return {
    pickupId: pickup.id,
    matchId: pickup.matchId,
    reportId: pickup.reportId,
    itemId: pickup.itemId,
    pickupCode: pickup.pickupCode,
    status: toPickupStatus(pickup.status),
    waitingStartedAt: pickup.waitingStartedAt.toISOString(),
    autoCancelAt: pickup.autoCancelAt.toISOString(),
    completedAt: pickup.completedAt?.toISOString(),
    cancelledAt: pickup.cancelledAt?.toISOString(),
    cancelReason: pickup.cancelReason ?? undefined,
  };
}

export function toNotification(notification: Notification) {
  return {
    notificationId: notification.id,
    userId: notification.userId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    link: notification.link ?? undefined,
    isRead: notification.isRead,
    createdAt: notification.createdAt.toISOString(),
  };
}
