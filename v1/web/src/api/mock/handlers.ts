import type {
  CancelReason,
  CreateFoundItemRequest,
  CreateLostReportRequest,
  FoundItem,
  LoginRequest,
  LoginResponse,
  LostReport,
  Match,
  MatchWithItem,
  Notification,
  Pickup,
  SignupRequest,
  SystemConfig,
  UpdateLostReportRequest,
  User,
} from '@/types';
import { addDaysIso, mockStorage, nowIso, uid, type MockDB } from './storage';

class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function delay<T>(value: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function currentToken(): string | null {
  return localStorage.getItem('lf_auth_token');
}

function currentUser(db: MockDB): User | null {
  const token = currentToken();
  if (!token) return null;
  const userId = db.tokens[token];
  if (!userId) return null;
  return db.users.find((u) => u.userId === userId) ?? null;
}

function requireUser(db: MockDB): User {
  const u = currentUser(db);
  if (!u) throw new ApiError(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
  return u;
}

function pickupCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function withinDays(a: string, b: string, days: number): boolean {
  const diff = Math.abs(new Date(a).getTime() - new Date(b).getTime());
  return diff <= days * 24 * 60 * 60 * 1000;
}

function pushNotification(
  db: MockDB,
  n: Omit<Notification, 'notificationId' | 'createdAt' | 'isRead'> & { isRead?: boolean },
) {
  db.notifications.unshift({
    notificationId: uid('n'),
    isRead: false,
    createdAt: nowIso(),
    ...n,
  });
}

// ---------- Auth ----------
export async function mockSignup(payload: SignupRequest): Promise<{ user: User }> {
  return delay(
    mockStorage.update((db) => {
      if (db.users.some((u) => u.email === payload.email)) {
        throw new ApiError(409, 'EMAIL_EXISTS', '이미 등록된 이메일입니다.');
      }
      const isManager = payload.role === '보관소관리자';
      const user: User = {
        userId: uid('u'),
        email: payload.email,
        name: payload.name,
        contact: payload.contact,
        roles: [isManager ? '보관소관리자' : '일반사용자'],
        pendingApproval: isManager ? true : false,
      };
      db.users.push(user);
      db.passwords[payload.email] = payload.password;
      // 보관소 관리자 신청 시 운영자에게 알림
      if (isManager) {
        const admins = db.users.filter((u) => u.roles.includes('운영관리자'));
        for (const admin of admins) {
          pushNotification(db, {
            userId: admin.userId,
            type: '보관소관리자승인요청',
            title: '보관소 관리자 승인 요청',
            message: `${user.name}님이 보관소 관리자로 가입을 신청했습니다.`,
            link: '/admin/manager-approvals',
          });
        }
      }
      return { user };
    }),
  );
}

export async function mockLogin(payload: LoginRequest): Promise<LoginResponse> {
  return delay(
    mockStorage.update((db) => {
      const user = db.users.find((u) => u.email === payload.email);
      if (!user || db.passwords[payload.email] !== payload.password) {
        throw new ApiError(401, 'INVALID_CREDENTIALS', '학교 이메일 또는 비밀번호가 올바르지 않습니다.');
      }
      const token = uid('tok');
      db.tokens[token] = user.userId;
      return { token, user };
    }),
  );
}

export async function mockLogout(): Promise<void> {
  return delay(
    mockStorage.update((db) => {
      const token = currentToken();
      if (token) delete db.tokens[token];
    }),
  );
}

export async function mockMe(): Promise<User> {
  return delay(
    mockStorage.update((db) => {
      return requireUser(db);
    }),
  );
}

export async function mockChangePassword(oldPassword: string, newPassword: string): Promise<void> {
  return delay(
    mockStorage.update((db) => {
      const user = requireUser(db);
      if (db.passwords[user.email] !== oldPassword) {
        throw new ApiError(400, 'WRONG_PASSWORD', '현재 비밀번호가 올바르지 않습니다.');
      }
      db.passwords[user.email] = newPassword;
    }),
  );
}

// ---------- Admin: Manager Approval ----------
export async function mockListPendingManagers(): Promise<User[]> {
  return delay(
    mockStorage.update((db) => {
      requireUser(db);
      return db.users.filter((u) => u.roles.includes('보관소관리자') && u.pendingApproval);
    }),
  );
}

export async function mockApproveManager(userId: string): Promise<User> {
  return delay(
    mockStorage.update((db) => {
      requireUser(db);
      const user = db.users.find((u) => u.userId === userId);
      if (!user) throw new ApiError(404, 'NOT_FOUND', '사용자를 찾을 수 없습니다.');
      user.pendingApproval = false;
      return user;
    }),
  );
}

export async function mockRejectManager(userId: string): Promise<void> {
  return delay(
    mockStorage.update((db) => {
      requireUser(db);
      db.users = db.users.filter((u) => u.userId !== userId);
    }),
  );
}

export async function mockCreateAdminAccount(payload: {
  email: string; password: string; name: string; contact: string;
}): Promise<User> {
  return delay(
    mockStorage.update((db) => {
      requireUser(db);
      if (db.users.some((u) => u.email === payload.email)) {
        throw new ApiError(409, 'EMAIL_EXISTS', '이미 등록된 이메일입니다.');
      }
      const user: User = {
        userId: uid('u'),
        email: payload.email,
        name: payload.name,
        contact: payload.contact,
        roles: ['운영관리자'],
      };
      db.users.push(user);
      db.passwords[payload.email] = payload.password;
      return user;
    }),
  );
}

// ---------- Reports ----------
function recomputeMatches(db: MockDB, report: LostReport) {
  db.matches = db.matches.filter(
    (m) => m.reportId !== report.reportId || m.status === '승인' || m.status === '비활성',
  );
  const eligibleStatuses: FoundItem['status'][] = ['보관중', '수령대기'];
  const candidates = db.items.filter(
    (it) =>
      eligibleStatuses.includes(it.status) &&
      it.category === report.category &&
      withinDays(it.foundDate, report.lostDate, db.config.matchDateRangeDays) &&
      (it.foundPlace.includes(report.lostPlace) || report.lostPlace.includes(it.foundPlace)),
  );
  for (const item of candidates) {
    const exists = db.matches.find((m) => m.reportId === report.reportId && m.itemId === item.itemId);
    if (exists) continue;
    db.matches.push({
      matchId: uid('m'),
      reportId: report.reportId,
      itemId: item.itemId,
      status: '활성',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  }
  const hasActiveMatches = db.matches.some(
    (m) => m.reportId === report.reportId && (m.status === '활성' || m.status === '확인요청중' || m.status === '반려'),
  );
  if (report.status === '접수' || report.status === '매칭후보있음') {
    report.status = hasActiveMatches ? '매칭후보있음' : '접수';
  }
  report.updatedAt = nowIso();
  if (candidates.length > 0) {
    pushNotification(db, {
      userId: report.reporterId,
      type: '매칭후보생성',
      title: '새 매칭 후보',
      message: `새 매칭 후보가 ${candidates.length}건 발견되었습니다.`,
      link: `/reports/${report.reportId}`,
    });
  }
}

export async function mockCreateLostReport(payload: CreateLostReportRequest): Promise<LostReport> {
  return delay(
    mockStorage.update((db) => {
      const user = requireUser(db);
      const report: LostReport = {
        reportId: uid('r'),
        reporterId: user.userId,
        reporterName: user.name,
        reporterContact: payload.reporterContact || user.contact,
        itemName: payload.itemName,
        category: payload.category,
        lostPlace: payload.lostPlace,
        lostDate: payload.lostDate,
        description: payload.description,
        status: '접수',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      db.reports.push(report);
      recomputeMatches(db, report);
      return report;
    }),
  );
}

export async function mockListMyReports(): Promise<LostReport[]> {
  return delay(
    mockStorage.update((db) => {
      const user = requireUser(db);
      return db.reports
        .filter((r) => r.reporterId === user.userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }),
  );
}

export async function mockGetReport(reportId: string): Promise<LostReport> {
  return delay(
    mockStorage.update((db) => {
      const r = db.reports.find((x) => x.reportId === reportId);
      if (!r) throw new ApiError(404, 'NOT_FOUND', '신고를 찾을 수 없습니다.');
      return r;
    }),
  );
}

export async function mockUpdateLostReport(
  reportId: string,
  patch: UpdateLostReportRequest,
): Promise<LostReport> {
  return delay(
    mockStorage.update((db) => {
      const r = db.reports.find((x) => x.reportId === reportId);
      if (!r) throw new ApiError(404, 'NOT_FOUND', '신고를 찾을 수 없습니다.');
      if (r.status !== '접수' && r.status !== '매칭후보있음') {
        throw new ApiError(409, 'INVALID_STATUS', '이미 처리된 신고는 수정할 수 없습니다.');
      }
      const hasActiveConfirm = db.matches.some((m) => m.reportId === reportId && m.status === '확인요청중');
      if (hasActiveConfirm) {
        throw new ApiError(409, 'ACTIVE_CONFIRMATION', '확인 요청 진행 중에는 신고를 수정할 수 없습니다.');
      }
      Object.assign(r, patch);
      r.updatedAt = nowIso();
      recomputeMatches(db, r);
      return r;
    }),
  );
}

export async function mockDeleteLostReport(reportId: string): Promise<void> {
  return delay(
    mockStorage.update((db) => {
      const r = db.reports.find((x) => x.reportId === reportId);
      if (!r) throw new ApiError(404, 'NOT_FOUND', '신고를 찾을 수 없습니다.');
      if (r.status !== '접수' && r.status !== '매칭후보있음') {
        throw new ApiError(409, 'INVALID_STATUS', '이미 처리된 신고는 삭제할 수 없습니다.');
      }
      const hasActiveConfirm = db.matches.some((m) => m.reportId === reportId && m.status === '확인요청중');
      if (hasActiveConfirm) {
        throw new ApiError(409, 'ACTIVE_CONFIRMATION', '확인 요청 진행 중에는 삭제할 수 없습니다.');
      }
      db.matches = db.matches.filter((m) => m.reportId !== reportId);
      db.reports = db.reports.filter((x) => x.reportId !== reportId);
    }),
  );
}

export async function mockFinalizeReport(reportId: string): Promise<LostReport> {
  return delay(
    mockStorage.update((db) => {
      requireUser(db);
      const r = db.reports.find((x) => x.reportId === reportId);
      if (!r) throw new ApiError(404, 'NOT_FOUND', '신고를 찾을 수 없습니다.');
      if (r.status !== '찾기완료') {
        throw new ApiError(409, 'INVALID_STATUS', '찾기완료 상태인 신고만 종료할 수 있습니다.');
      }
      r.status = '종료';
      r.updatedAt = nowIso();
      return r;
    }),
  );
}

// ---------- Items ----------
export async function mockCreateFoundItem(payload: CreateFoundItemRequest): Promise<FoundItem> {
  return delay(
    mockStorage.update((db) => {
      const user = requireUser(db);
      const item: FoundItem = {
        itemId: uid('i'),
        finderId: user.userId,
        finderName: user.name,
        finderContact: user.contact,
        itemName: payload.itemName,
        category: payload.category,
        foundPlace: payload.foundPlace,
        foundDate: payload.foundDate,
        description: payload.description,
        imageUrl: payload.imageUrl,
        status: '등록',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      db.items.push(item);
      return item;
    }),
  );
}

export async function mockListMyItems(): Promise<FoundItem[]> {
  return delay(
    mockStorage.update((db) => {
      const user = requireUser(db);
      return db.items
        .filter((it) => it.finderId === user.userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }),
  );
}

export async function mockListAllItems(): Promise<FoundItem[]> {
  return delay(
    mockStorage.update((db) => {
      return [...db.items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }),
  );
}

export async function mockDeleteItem(itemId: string): Promise<void> {
  return delay(
    mockStorage.update((db) => {
      const it = db.items.find((x) => x.itemId === itemId);
      if (!it) throw new ApiError(404, 'NOT_FOUND', '습득물을 찾을 수 없습니다.');
      if (it.status !== '등록') {
        throw new ApiError(409, 'INVALID_STATUS', '등록 상태에서만 삭제할 수 있습니다.');
      }
      db.items = db.items.filter((x) => x.itemId !== itemId);
    }),
  );
}

export async function mockSetStorage(itemId: string, storageLocation: string): Promise<FoundItem> {
  return delay(
    mockStorage.update((db) => {
      const it = db.items.find((x) => x.itemId === itemId);
      if (!it) throw new ApiError(404, 'NOT_FOUND', '습득물을 찾을 수 없습니다.');
      it.storageLocation = storageLocation;
      if (it.status === '등록') {
        it.status = '보관중';
        for (const r of db.reports) {
          if (r.status === '접수' || r.status === '매칭후보있음') {
            recomputeMatches(db, r);
          }
        }
      }
      it.updatedAt = nowIso();
      return it;
    }),
  );
}

export async function mockSetItemStatus(itemId: string, status: FoundItem['status']): Promise<FoundItem> {
  return delay(
    mockStorage.update((db) => {
      const it = db.items.find((x) => x.itemId === itemId);
      if (!it) throw new ApiError(404, 'NOT_FOUND', '습득물을 찾을 수 없습니다.');
      it.status = status;
      it.updatedAt = nowIso();
      return it;
    }),
  );
}

// ---------- Matches ----------
export async function mockListMatchesForReport(reportId: string): Promise<MatchWithItem[]> {
  return delay(
    mockStorage.update((db) => {
      const matches = db.matches.filter((m) => m.reportId === reportId);
      return matches.map((m) => {
        const item = db.items.find((i) => i.itemId === m.itemId);
        return { ...m, item: item! };
      });
    }),
  );
}

export async function mockListPendingConfirmations(): Promise<MatchWithItem[]> {
  return delay(
    mockStorage.update((db) => {
      return db.matches
        .filter((m) => m.status === '확인요청중')
        .map((m) => {
          const item = db.items.find((i) => i.itemId === m.itemId);
          return { ...m, item: item! };
        });
    }),
  );
}

export async function mockConfirmMatch(matchId: string): Promise<Match> {
  return delay(
    mockStorage.update((db) => {
      const m = db.matches.find((x) => x.matchId === matchId);
      if (!m) throw new ApiError(404, 'NOT_FOUND', '매칭을 찾을 수 없습니다.');
      const activeOnReport = db.matches.some(
        (x) => x.reportId === m.reportId && x.status === '확인요청중',
      );
      if (activeOnReport) {
        throw new ApiError(409, 'ACTIVE_CONFIRMATION', '이미 진행 중인 확인 요청이 있습니다.');
      }
      m.status = '확인요청중';
      m.updatedAt = nowIso();
      return m;
    }),
  );
}

export async function mockApproveMatch(matchId: string): Promise<Match> {
  return delay(
    mockStorage.update((db) => {
      const m = db.matches.find((x) => x.matchId === matchId);
      if (!m) throw new ApiError(404, 'NOT_FOUND', '매칭을 찾을 수 없습니다.');
      m.status = '승인';
      m.updatedAt = nowIso();
      // Create pickup
      const pickup: Pickup = {
        pickupId: uid('p'),
        matchId: m.matchId,
        reportId: m.reportId,
        itemId: m.itemId,
        pickupCode: pickupCode(),
        status: '수령대기',
        waitingStartedAt: nowIso(),
        autoCancelAt: addDaysIso(db.config.pickupAutoCancelDays),
      };
      db.pickups.push(pickup);
      // Item → 수령대기
      const it = db.items.find((i) => i.itemId === m.itemId);
      if (it) { it.status = '수령대기'; it.updatedAt = nowIso(); }
      // Report → 찾기완료 (승인 시점에 찾기완료로 변경)
      const report = db.reports.find((r) => r.reportId === m.reportId);
      if (report) {
        report.status = '찾기완료';
        report.updatedAt = nowIso();
        pushNotification(db, {
          userId: report.reporterId,
          type: '확인요청승인',
          title: '확인 요청 승인',
          message: '확인 요청이 승인되었습니다. 수령 코드를 확인하세요.',
          link: `/pickups/${pickup.pickupId}`,
        });
      }
      return m;
    }),
  );
}

export async function mockRejectMatch(matchId: string, reason?: string): Promise<Match> {
  return delay(
    mockStorage.update((db) => {
      const m = db.matches.find((x) => x.matchId === matchId);
      if (!m) throw new ApiError(404, 'NOT_FOUND', '매칭을 찾을 수 없습니다.');
      m.status = '반려';
      m.rejectReason = reason;
      m.updatedAt = nowIso();
      const report = db.reports.find((r) => r.reportId === m.reportId);
      if (report) {
        pushNotification(db, {
          userId: report.reporterId,
          type: '확인요청반려',
          title: '확인 요청 반려',
          message: `확인 요청이 반려되었습니다. (사유: ${reason ?? '미기재'})`,
          link: `/reports/${report.reportId}`,
        });
      }
      return m;
    }),
  );
}

// ---------- Pickups ----------
export async function mockGetPickup(pickupId: string): Promise<Pickup> {
  return delay(
    mockStorage.update((db) => {
      const p = db.pickups.find((x) => x.pickupId === pickupId);
      if (!p) throw new ApiError(404, 'NOT_FOUND', '수령 정보를 찾을 수 없습니다.');
      return p;
    }),
  );
}

export async function mockGetPickupByReport(reportId: string): Promise<Pickup | null> {
  return delay(
    mockStorage.update((db) => {
      return db.pickups.find((p) => p.reportId === reportId && p.status === '수령대기') ?? null;
    }),
  );
}

export async function mockListWaitingPickups(): Promise<Pickup[]> {
  return delay(
    mockStorage.update((db) => {
      return db.pickups.filter((p) => p.status === '수령대기');
    }),
  );
}

export async function mockVerifyPickup(
  pickupId: string,
  body: { name: string; contact: string; code: string },
): Promise<{ allMatched: boolean; mismatches: ('name' | 'contact' | 'code')[] }> {
  return delay(
    mockStorage.update((db) => {
      const p = db.pickups.find((x) => x.pickupId === pickupId);
      if (!p) throw new ApiError(404, 'NOT_FOUND', '수령 정보를 찾을 수 없습니다.');
      const report = db.reports.find((r) => r.reportId === p.reportId);
      const mismatches: ('name' | 'contact' | 'code')[] = [];
      if (!report || report.reporterName !== body.name) mismatches.push('name');
      if (!report || report.reporterContact !== body.contact) mismatches.push('contact');
      if (p.pickupCode !== body.code) mismatches.push('code');
      return { allMatched: mismatches.length === 0, mismatches };
    }),
  );
}

export async function mockCompletePickup(pickupId: string): Promise<Pickup> {
  return delay(
    mockStorage.update((db) => {
      const p = db.pickups.find((x) => x.pickupId === pickupId);
      if (!p) throw new ApiError(404, 'NOT_FOUND', '수령 정보를 찾을 수 없습니다.');
      p.status = '수령완료';
      p.completedAt = nowIso();
      const it = db.items.find((i) => i.itemId === p.itemId);
      if (it) { it.status = '수령완료'; it.updatedAt = nowIso(); }
      // 수령 완료 시 신고 → 종료 (자동)
      const r = db.reports.find((x) => x.reportId === p.reportId);
      if (r) { r.status = '종료'; r.updatedAt = nowIso(); }
      // 해당 습득물의 매칭 비활성
      db.matches.forEach((m) => {
        if (m.itemId === p.itemId) { m.status = '비활성'; m.updatedAt = nowIso(); }
      });
      return p;
    }),
  );
}

export async function mockCancelPickup(pickupId: string, reason: CancelReason): Promise<Pickup> {
  return delay(
    mockStorage.update((db) => {
      const p = db.pickups.find((x) => x.pickupId === pickupId);
      if (!p) throw new ApiError(404, 'NOT_FOUND', '수령 정보를 찾을 수 없습니다.');
      p.status = '취소';
      p.cancelledAt = nowIso();
      p.cancelReason = reason;
      const it = db.items.find((i) => i.itemId === p.itemId);
      if (it) { it.status = '보관중'; it.updatedAt = nowIso(); }
      // 수령 대기 취소 → 신고 다시 매칭후보있음
      const r = db.reports.find((x) => x.reportId === p.reportId);
      if (r) { r.status = '매칭후보있음'; r.updatedAt = nowIso(); }
      const m = db.matches.find((x) => x.matchId === p.matchId);
      if (m) { m.status = '활성'; m.updatedAt = nowIso(); }
      if (r) {
        pushNotification(db, {
          userId: r.reporterId,
          type: '수령대기취소',
          title: '수령 대기 취소',
          message: '수령 대기가 취소되었습니다. 다시 확인 요청할 수 있습니다.',
          link: `/reports/${r.reportId}`,
        });
      }
      return p;
    }),
  );
}

// ---------- Search ----------
function maskName(name: string): string {
  if (name.length <= 1) return '*';
  return name[0] + '*'.repeat(Math.max(1, name.length - 1));
}
function maskContact(c: string): string {
  return c.replace(/\d(?=\d{4})/g, '*');
}

export async function mockSearchLost(params: {
  category?: string; place?: string; dateFrom?: string; dateTo?: string; keyword?: string; status?: string;
}): Promise<LostReport[]> {
  return delay(
    mockStorage.update((db) => {
      const isLoggedIn = !!currentUser(db);
      let list = params.status ? db.reports : db.reports.filter((r) => r.status !== '종료');
      if (params.status) list = list.filter((r) => r.status === params.status);
      if (params.category) list = list.filter((r) => r.category === params.category);
      if (params.place) list = list.filter((r) => r.lostPlace.includes(params.place!));
      if (params.dateFrom) list = list.filter((r) => r.lostDate >= params.dateFrom!);
      if (params.dateTo) list = list.filter((r) => r.lostDate <= params.dateTo!);
      if (params.keyword) {
        const k = params.keyword.toLowerCase();
        list = list.filter((r) =>
          r.itemName.toLowerCase().includes(k) || r.description.toLowerCase().includes(k));
      }
      if (!isLoggedIn) {
        list = list.map((r) => ({
          ...r,
          reporterName: maskName(r.reporterName),
          reporterContact: maskContact(r.reporterContact),
          description: '',
        }));
      }
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }),
  );
}

export async function mockSearchFound(params: {
  category?: string; place?: string; dateFrom?: string; dateTo?: string; keyword?: string; status?: string;
}): Promise<FoundItem[]> {
  return delay(
    mockStorage.update((db) => {
      const isLoggedIn = !!currentUser(db);
      const defaultStatuses = ['보관중', '수령대기', '폐기예정'];
      let list = params.status
        ? db.items.filter((i) => i.status === params.status)
        : db.items.filter((i) => defaultStatuses.includes(i.status));
      if (params.category) list = list.filter((i) => i.category === params.category);
      if (params.place) list = list.filter((i) => i.foundPlace.includes(params.place!));
      if (params.dateFrom) list = list.filter((i) => i.foundDate >= params.dateFrom!);
      if (params.dateTo) list = list.filter((i) => i.foundDate <= params.dateTo!);
      if (params.keyword) {
        const k = params.keyword.toLowerCase();
        list = list.filter((i) =>
          i.itemName.toLowerCase().includes(k) || i.description.toLowerCase().includes(k));
      }
      if (!isLoggedIn) {
        list = list.map((i) => ({
          ...i,
          finderName: i.finderName ? maskName(i.finderName) : undefined,
          finderContact: undefined,
          storageLocation: undefined,
          description: '',
        }));
      }
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }),
  );
}

// ---------- Notifications ----------
export async function mockListNotifications(): Promise<Notification[]> {
  return delay(
    mockStorage.update((db) => {
      const user = requireUser(db);
      return db.notifications
        .filter((n) => n.userId === user.userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }),
  );
}

export async function mockUnreadCount(): Promise<{ count: number }> {
  return delay(
    mockStorage.update((db) => {
      const user = currentUser(db);
      if (!user) return { count: 0 };
      return { count: db.notifications.filter((n) => n.userId === user.userId && !n.isRead).length };
    }),
  );
}

export async function mockMarkRead(id: string): Promise<Notification> {
  return delay(
    mockStorage.update((db) => {
      const n = db.notifications.find((x) => x.notificationId === id);
      if (!n) throw new ApiError(404, 'NOT_FOUND', '알림을 찾을 수 없습니다.');
      n.isRead = true;
      return n;
    }),
  );
}

export async function mockMarkAllRead(): Promise<{ updated: number }> {
  return delay(
    mockStorage.update((db) => {
      const user = requireUser(db);
      let updated = 0;
      db.notifications.forEach((n) => {
        if (n.userId === user.userId && !n.isRead) { n.isRead = true; updated++; }
      });
      return { updated };
    }),
  );
}

// ---------- Admin ----------
export async function mockAdminListReports(): Promise<LostReport[]> {
  return delay(mockStorage.update((db) => [...db.reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt))));
}

export async function mockAdminListItems(): Promise<FoundItem[]> {
  return delay(mockStorage.update((db) => [...db.items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))));
}

export async function mockAdminStats(): Promise<{
  lostReportsByStatus: Record<string, number>;
  foundItemsByStatus: Record<string, number>;
  recentTrend: { date: string; reports: number; items: number }[];
}> {
  return delay(
    mockStorage.update((db) => {
      const lostReportsByStatus: Record<string, number> = {};
      db.reports.forEach((r) => { lostReportsByStatus[r.status] = (lostReportsByStatus[r.status] || 0) + 1; });
      const foundItemsByStatus: Record<string, number> = {};
      db.items.forEach((i) => { foundItemsByStatus[i.status] = (foundItemsByStatus[i.status] || 0) + 1; });
      const recentTrend: { date: string; reports: number; items: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        const next = new Date(d);
        next.setDate(next.getDate() + 1);
        const dStr = d.toISOString().slice(0, 10);
        recentTrend.push({
          date: dStr,
          reports: db.reports.filter((r) => r.createdAt >= d.toISOString() && r.createdAt < next.toISOString()).length,
          items: db.items.filter((it) => it.createdAt >= d.toISOString() && it.createdAt < next.toISOString()).length,
        });
      }
      return { lostReportsByStatus, foundItemsByStatus, recentTrend };
    }),
  );
}

export async function mockAdminUnclaimed(): Promise<FoundItem[]> {
  return delay(
    mockStorage.update((db) => {
      const threshold = Date.now() - db.config.longUnclaimedDays * 24 * 60 * 60 * 1000;
      return db.items.filter(
        (i) => (i.status === '보관중' || i.status === '수령대기') && new Date(i.createdAt).getTime() < threshold,
      );
    }),
  );
}

export async function mockGetConfig(): Promise<SystemConfig> {
  return delay(mockStorage.update((db) => db.config));
}

export async function mockUpdateConfig(patch: Partial<SystemConfig>): Promise<SystemConfig> {
  return delay(
    mockStorage.update((db) => {
      db.config = { ...db.config, ...patch };
      return db.config;
    }),
  );
}

// ---------- Upload ----------
/**
 * 일반사용자가 검색 결과에서 습득물에 직접 확인 요청
 * - 매칭이 없으면 생성 후 즉시 확인요청중으로 전환
 * - 3차 수정 제약 동일 적용: 신고당 하나의 활성 확인 요청만 허용
 */
export async function mockClaimFoundItem(itemId: string, reportId: string): Promise<Match> {
  return delay(
    mockStorage.update((db) => {
      const user = requireUser(db);

      const report = db.reports.find((r) => r.reportId === reportId);
      if (!report) throw new ApiError(404, 'NOT_FOUND', '신고를 찾을 수 없습니다.');
      if (report.reporterId !== user.userId) throw new ApiError(403, 'FORBIDDEN', '본인의 신고만 요청할 수 있습니다.');
      if (report.status !== '접수' && report.status !== '매칭후보있음') {
        throw new ApiError(400, 'INVALID_STATE', '이미 처리된 신고는 요청할 수 없습니다.');
      }

      const item = db.items.find((i) => i.itemId === itemId);
      if (!item) throw new ApiError(404, 'NOT_FOUND', '습득물을 찾을 수 없습니다.');
      if (item.status !== '보관중') throw new ApiError(400, 'INVALID_STATE', '보관 중인 습득물만 요청할 수 있습니다.');

      // 3차 수정 제약: 이미 확인요청중 or 승인된 매칭이 있으면 차단
      const hasActive = db.matches.some(
        (m) => m.reportId === reportId && (m.status === '확인요청중' || m.status === '승인'),
      );
      if (hasActive) {
        throw new ApiError(409, 'ACTIVE_CONFIRMATION', '이미 진행 중인 확인 요청이 있습니다. 처리 후 다시 시도해주세요.');
      }

      // 기존 매칭 재활용 또는 신규 생성
      let match = db.matches.find((m) => m.reportId === reportId && m.itemId === itemId);
      if (match) {
        if (match.status === '확인요청중' || match.status === '승인') {
          throw new ApiError(409, 'ACTIVE_CONFIRMATION', '이미 진행 중인 확인 요청이 있습니다.');
        }
        match.status = '확인요청중';
        match.updatedAt = nowIso();
      } else {
        match = {
          matchId: uid('m'),
          reportId,
          itemId,
          status: '확인요청중',
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        db.matches.push(match);
      }

      // 신고 상태 업데이트
      if (report.status === '접수') {
        report.status = '매칭후보있음';
        report.updatedAt = nowIso();
      }

      // 보관소 관리자에게 알림
      const managers = db.users.filter((u) => u.roles.includes('보관소관리자') && !u.pendingApproval);
      for (const mgr of managers) {
        pushNotification(db, {
          userId: mgr.userId,
          type: '매칭후보생성',
          title: '확인 요청 도착',
          message: `${user.name}님이 "${item.itemName}"에 대해 확인 요청을 보냈습니다.`,
          link: '/manager/confirmations',
        });
      }

      return match;
    }),
  );
}

export async function mockStoreImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      mockStorage.update((db) => {
        const id = uid('img');
        db.images[id] = dataUrl;
      });
      resolve(dataUrl);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export { ApiError };
