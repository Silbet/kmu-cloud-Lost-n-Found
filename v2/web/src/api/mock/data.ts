import type {
  FoundItem,
  LostReport,
  Match,
  Notification,
  Pickup,
  SystemConfig,
  User,
} from '@/types';
import type { MockDB } from './storage';

function iso(daysAgo: number, hour = 12): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function addDays(base: string, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function seedData(): MockDB {
  // ----- Users (10명) -----
  // 일반사용자 5명 (기존 분실자+습득자 통합)
  const users: User[] = [
    { userId: 'u_user1', email: 'user1@kookmin.ac.kr', name: '김민준', contact: '010-1111-0001', roles: ['일반사용자'] },
    { userId: 'u_user2', email: 'user2@kookmin.ac.kr', name: '이서연', contact: '010-1111-0002', roles: ['일반사용자'] },
    { userId: 'u_user3', email: 'user3@kookmin.ac.kr', name: '박지호', contact: '010-1111-0003', roles: ['일반사용자'] },
    { userId: 'u_user4', email: 'user4@kookmin.ac.kr', name: '최수아', contact: '010-1111-0004', roles: ['일반사용자'] },
    { userId: 'u_user5', email: 'user5@kookmin.ac.kr', name: '정다은', contact: '010-1111-0005', roles: ['일반사용자'] },
    // 보관소 관리자 2명 (1명 승인됨, 1명 승인 대기)
    { userId: 'u_mgr',       email: 'manager@kookmin.ac.kr',         name: '강관리', contact: '010-3333-0001', roles: ['보관소관리자'], pendingApproval: false },
    { userId: 'u_mgr_pend',  email: 'manager.pending@kookmin.ac.kr', name: '윤대기', contact: '010-3333-0002', roles: ['보관소관리자'], pendingApproval: true  },
    // 운영 관리자 1명
    { userId: 'u_admin', email: 'admin@kookmin.ac.kr', name: '운영자', contact: '010-4444-0001', roles: ['운영관리자'] },
  ];

  const passwords: Record<string, string> = {};
  users.forEach((u) => (passwords[u.email] = 'password'));

  // ----- Reports (12건: 접수3, 매칭후보있음4, 찾기완료3, 종료2) -----
  // ※ 새 플로우: 매칭 승인 → 찾기완료, 수령완료 → 종료
  const reports: LostReport[] = [
    // 접수 3
    { reportId: 'r_01', reporterId: 'u_user1', reporterName: '김민준', reporterContact: '010-1111-0001', itemName: '검정 백팩', category: '가방', lostPlace: '북악관 1층', lostDate: iso(2), description: '노트북이 들어있음', status: '접수', createdAt: iso(2), updatedAt: iso(2) },
    { reportId: 'r_02', reporterId: 'u_user2', reporterName: '이서연', reporterContact: '010-1111-0002', itemName: '에어팟 프로', category: '전자기기', lostPlace: '경상관 강의실', lostDate: iso(1), description: '흰색 케이스', status: '접수', createdAt: iso(1), updatedAt: iso(1) },
    { reportId: 'r_03', reporterId: 'u_user3', reporterName: '박지호', reporterContact: '010-1111-0003', itemName: '학생증', category: '신분증', lostPlace: '중앙도서관', lostDate: iso(3), description: '경영학과 박**', status: '접수', createdAt: iso(3), updatedAt: iso(3) },
    // 매칭후보있음 4 (아직 승인 전)
    { reportId: 'r_04', reporterId: 'u_user4', reporterName: '최수아', reporterContact: '010-1111-0004', itemName: '아이패드', category: '전자기기', lostPlace: '공학관 5층', lostDate: iso(5), description: '11인치, 회색', status: '매칭후보있음', createdAt: iso(5), updatedAt: iso(4) },
    { reportId: 'r_05', reporterId: 'u_user1', reporterName: '김민준', reporterContact: '010-1111-0001', itemName: '갈색 지갑', category: '지갑', lostPlace: '학생회관', lostDate: iso(4), description: '카드 다수', status: '매칭후보있음', createdAt: iso(4), updatedAt: iso(3) },
    { reportId: 'r_06', reporterId: 'u_user5', reporterName: '정다은', reporterContact: '010-1111-0005', itemName: '우산', category: '기타', lostPlace: '예술관 입구', lostDate: iso(6), description: '검정 장우산', status: '매칭후보있음', createdAt: iso(6), updatedAt: iso(5) },
    // 확인 요청 승인됨 → 찾기완료 (수령 대기 중)
    { reportId: 'r_07', reporterId: 'u_user2', reporterName: '이서연', reporterContact: '010-1111-0002', itemName: '안경', category: '기타', lostPlace: '북악관 열람실', lostDate: iso(7), description: '검정 뿔테', status: '찾기완료', createdAt: iso(7), updatedAt: iso(1) },
    // 찾기완료인데 pickup도 수령대기 중
    { reportId: 'r_04b', reporterId: 'u_user4', reporterName: '최수아', reporterContact: '010-1111-0004', itemName: '아이패드', category: '전자기기', lostPlace: '공학관 5층', lostDate: iso(5), description: '11인치', status: '찾기완료', createdAt: iso(5), updatedAt: iso(0) },
    // 종료 (수령완료 → 자동 종료)
    { reportId: 'r_08', reporterId: 'u_user3', reporterName: '박지호', reporterContact: '010-1111-0003', itemName: '키링', category: '기타', lostPlace: '체육관', lostDate: iso(10), description: '곰 키링', status: '종료', createdAt: iso(10), updatedAt: iso(1) },
    { reportId: 'r_09', reporterId: 'u_user4', reporterName: '최수아', reporterContact: '010-1111-0004', itemName: '텀블러', category: '기타', lostPlace: '학생식당', lostDate: iso(9), description: '스타벅스 텀블러', status: '종료', createdAt: iso(9), updatedAt: iso(1) },
    { reportId: 'r_10', reporterId: 'u_user1', reporterName: '김민준', reporterContact: '010-1111-0001', itemName: '계산기', category: '전자기기', lostPlace: '경상관', lostDate: iso(11), description: '공학용 계산기', status: '종료', createdAt: iso(11), updatedAt: iso(2) },
    { reportId: 'r_11', reporterId: 'u_user2', reporterName: '이서연', reporterContact: '010-1111-0002', itemName: '책', category: '기타', lostPlace: '도서관', lostDate: iso(20), description: '경영학원론 교재', status: '종료', createdAt: iso(20), updatedAt: iso(10) },
    { reportId: 'r_12', reporterId: 'u_user3', reporterName: '박지호', reporterContact: '010-1111-0003', itemName: '머플러', category: '의류', lostPlace: '북악관', lostDate: iso(25), description: '회색 캐시미어', status: '종료', createdAt: iso(25), updatedAt: iso(15) },
  ];

  // ----- Items -----
  const items: FoundItem[] = [
    { itemId: 'i_01', finderId: 'u_user5', finderName: '정다은', finderContact: '010-1111-0005', itemName: '검정 우산', category: '기타', foundPlace: '예술관 입구', foundDate: iso(6), description: '장우산', status: '등록', createdAt: iso(0), updatedAt: iso(0) },
    { itemId: 'i_02', finderId: 'u_user2', finderName: '이서연', finderContact: '010-1111-0002', itemName: '핑크 지갑', category: '지갑', foundPlace: '중앙도서관 1층', foundDate: iso(1), description: '소형', status: '등록', createdAt: iso(0), updatedAt: iso(0) },
    { itemId: 'i_03', finderId: 'u_user1', finderName: '김민준', finderContact: '010-1111-0001', itemName: '아이패드', category: '전자기기', foundPlace: '공학관 5층', foundDate: iso(5), description: '회색 11인치', status: '보관중', storageLocation: '보관함 A-12', createdAt: iso(5), updatedAt: iso(4) },
    { itemId: 'i_04', finderId: 'u_user2', finderName: '이서연', finderContact: '010-1111-0002', itemName: '갈색 장지갑', category: '지갑', foundPlace: '학생회관 2층', foundDate: iso(4), description: '카드 여러장', status: '보관중', storageLocation: '보관함 B-03', createdAt: iso(4), updatedAt: iso(3) },
    { itemId: 'i_05', finderId: 'u_user3', finderName: '박지호', finderContact: '010-1111-0003', itemName: '검정 우산', category: '기타', foundPlace: '예술관', foundDate: iso(6), description: '장우산', status: '보관중', storageLocation: '보관함 C-01', createdAt: iso(6), updatedAt: iso(5) },
    { itemId: 'i_06', finderId: 'u_user5', finderName: '정다은', finderContact: '010-1111-0005', itemName: '검정 안경', category: '기타', foundPlace: '북악관 열람실', foundDate: iso(7), description: '뿔테', status: '보관중', storageLocation: '보관함 A-01', createdAt: iso(7), updatedAt: iso(6) },
    { itemId: 'i_07', finderId: 'u_user1', finderName: '김민준', finderContact: '010-1111-0001', itemName: '에어팟', category: '전자기기', foundPlace: '경상관 강의실', foundDate: iso(1), description: '흰색', status: '보관중', storageLocation: '보관함 A-05', createdAt: iso(1), updatedAt: iso(1) },
    { itemId: 'i_08', finderId: 'u_user2', finderName: '이서연', finderContact: '010-1111-0002', itemName: '학생증', category: '신분증', foundPlace: '중앙도서관', foundDate: iso(3), description: '경영학과', status: '보관중', storageLocation: '보관함 D-02', createdAt: iso(3), updatedAt: iso(3) },
    // 수령대기 2 (매칭 승인됨 → 찾기완료인 신고들에 연결)
    { itemId: 'i_09', finderId: 'u_user3', finderName: '박지호', finderContact: '010-1111-0003', itemName: '검정 백팩', category: '가방', foundPlace: '북악관 1층', foundDate: iso(2), description: '노트북 포함', status: '수령대기', storageLocation: '보관함 E-01', createdAt: iso(2), updatedAt: iso(0) },
    { itemId: 'i_10', finderId: 'u_user1', finderName: '김민준', finderContact: '010-1111-0001', itemName: '뿔테 안경', category: '기타', foundPlace: '북악관 열람실', foundDate: iso(7), description: '검정색', status: '수령대기', storageLocation: '보관함 B-10', createdAt: iso(7), updatedAt: iso(0) },
    // 수령완료 3 → 신고는 종료
    { itemId: 'i_11', finderId: 'u_user2', finderName: '이서연', finderContact: '010-1111-0002', itemName: '곰 키링', category: '기타', foundPlace: '체육관', foundDate: iso(10), description: '갈색', status: '수령완료', storageLocation: '보관함 A-09', createdAt: iso(10), updatedAt: iso(1) },
    { itemId: 'i_12', finderId: 'u_user3', finderName: '박지호', finderContact: '010-1111-0003', itemName: '스타벅스 텀블러', category: '기타', foundPlace: '학생식당', foundDate: iso(9), description: '흰색', status: '수령완료', storageLocation: '보관함 A-10', createdAt: iso(9), updatedAt: iso(1) },
    { itemId: 'i_13', finderId: 'u_user1', finderName: '김민준', finderContact: '010-1111-0001', itemName: '공학용 계산기', category: '전자기기', foundPlace: '경상관', foundDate: iso(11), description: '카시오', status: '수령완료', storageLocation: '보관함 A-11', createdAt: iso(11), updatedAt: iso(2) },
    // 폐기예정 2
    { itemId: 'i_14', finderId: 'u_user2', finderName: '이서연', finderContact: '010-1111-0002', itemName: '낡은 우산', category: '기타', foundPlace: '북문', foundDate: iso(50), description: '망가짐', status: '폐기예정', storageLocation: '폐기예정함', createdAt: iso(50), updatedAt: iso(1) },
    { itemId: 'i_15', finderId: 'u_user3', finderName: '박지호', finderContact: '010-1111-0003', itemName: '오래된 노트', category: '기타', foundPlace: '도서관', foundDate: iso(60), description: '훼손', status: '폐기예정', storageLocation: '폐기예정함', createdAt: iso(60), updatedAt: iso(1) },
  ];

  // ----- Matches -----
  const matches: Match[] = [
    // 활성 매칭 (아직 확인 요청 전)
    { matchId: 'm_01', reportId: 'r_04', itemId: 'i_03', status: '활성', createdAt: iso(4), updatedAt: iso(4) },
    { matchId: 'm_02', reportId: 'r_05', itemId: 'i_04', status: '활성', createdAt: iso(3), updatedAt: iso(3) },
    { matchId: 'm_03', reportId: 'r_06', itemId: 'i_05', status: '활성', createdAt: iso(5), updatedAt: iso(5) },
    // 확인요청중
    { matchId: 'm_04', reportId: 'r_06', itemId: 'i_01', status: '확인요청중', createdAt: iso(5), updatedAt: iso(1) },
    { matchId: 'm_05', reportId: 'r_05', itemId: 'i_07', status: '확인요청중', createdAt: iso(3), updatedAt: iso(0) },
    // 승인됨 → 신고 찾기완료, pickup 수령대기
    { matchId: 'm_06', reportId: 'r_07', itemId: 'i_10', status: '승인', createdAt: iso(6), updatedAt: iso(1) },
    { matchId: 'm_07', reportId: 'r_04b', itemId: 'i_09', status: '승인', createdAt: iso(2), updatedAt: iso(0) },
    // 반려
    { matchId: 'm_08', reportId: 'r_06', itemId: 'i_02', status: '반려', rejectReason: '사진과 실물이 다름', createdAt: iso(5), updatedAt: iso(2) },
    // 비활성 (수령완료 → 종료)
    { matchId: 'm_09', reportId: 'r_08', itemId: 'i_11', status: '비활성', createdAt: iso(9), updatedAt: iso(1) },
    { matchId: 'm_10', reportId: 'r_09', itemId: 'i_12', status: '비활성', createdAt: iso(8), updatedAt: iso(1) },
  ];

  // ----- Pickups -----
  const pickups: Pickup[] = [
    // 수령대기 2건
    { pickupId: 'p_01', matchId: 'm_06', reportId: 'r_07', itemId: 'i_10', pickupCode: '482913', status: '수령대기', waitingStartedAt: iso(1), autoCancelAt: addDays(iso(1), 3) },
    { pickupId: 'p_02', matchId: 'm_07', reportId: 'r_04b', itemId: 'i_09', pickupCode: '173852', status: '수령대기', waitingStartedAt: iso(0), autoCancelAt: addDays(iso(0), 3) },
    // 수령완료 2건 (신고 종료)
    { pickupId: 'p_03', matchId: 'm_09', reportId: 'r_08', itemId: 'i_11', pickupCode: '910283', status: '수령완료', waitingStartedAt: iso(2), autoCancelAt: addDays(iso(2), 3), completedAt: iso(1) },
    { pickupId: 'p_04', matchId: 'm_10', reportId: 'r_09', itemId: 'i_12', pickupCode: '562719', status: '수령완료', waitingStartedAt: iso(2), autoCancelAt: addDays(iso(2), 3), completedAt: iso(1) },
  ];

  // ----- Notifications -----
  const notifications: Notification[] = [
    { notificationId: 'n_01', userId: 'u_user4', type: '매칭후보생성', title: '새 매칭 후보', message: '새 매칭 후보가 1건 발견되었습니다.', link: '/reports/r_04', isRead: false, createdAt: iso(4) },
    { notificationId: 'n_02', userId: 'u_user1', type: '매칭후보생성', title: '새 매칭 후보', message: '새 매칭 후보가 1건 발견되었습니다.', link: '/reports/r_05', isRead: true, createdAt: iso(3) },
    { notificationId: 'n_03', userId: 'u_user2', type: '확인요청승인', title: '확인 요청 승인됨', message: '확인 요청이 승인되었습니다. 수령 코드를 확인하세요.', link: '/pickups/p_01', isRead: false, createdAt: iso(1) },
    { notificationId: 'n_04', userId: 'u_user5', type: '확인요청반려', title: '확인 요청 반려됨', message: '확인 요청이 반려되었습니다. (사유: 사진과 실물이 다름)', link: '/reports/r_06', isRead: false, createdAt: iso(2) },
    { notificationId: 'n_05', userId: 'u_user2', type: '수령자동취소임박', title: '수령 대기 임박', message: '수령 대기가 곧 자동 취소됩니다. 보관소를 방문해주세요.', link: '/pickups/p_01', isRead: false, createdAt: iso(0) },
    { notificationId: 'n_06', userId: 'u_mgr', type: '폐기검토필요', title: '폐기 검토 대상', message: '보관 30일 경과 물품 2건이 폐기 검토 대상입니다.', link: '/manager/items', isRead: false, createdAt: iso(1) },
    { notificationId: 'n_07', userId: 'u_admin', type: '보관소관리자승인요청', title: '보관소 관리자 승인 요청', message: '윤대기님이 보관소 관리자로 가입을 신청했습니다.', link: '/admin/manager-approvals', isRead: false, createdAt: iso(0) },
  ];

  const config: SystemConfig = { longUnclaimedDays: 30, pickupAutoCancelDays: 3, matchDateRangeDays: 7 };

  return {
    users,
    passwords,
    tokens: {},
    reports,
    items,
    matches,
    pickups,
    notifications,
    config,
    images: {},
  };
}
