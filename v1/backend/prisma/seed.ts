import {
  FoundItemStatus,
  LostReportStatus,
  MatchStatus,
  PickupStatus,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function daysAgo(days: number, hour = 12) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function daysFrom(base: Date, days: number) {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return date;
}

async function main() {
  await prisma.systemConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      longUnclaimedDays: 30,
      pickupAutoCancelDays: 3,
      matchDateRangeDays: 7,
    },
  });

  const passwordHash = await bcrypt.hash('password', 10);
  const demoUsers = [
    {
      email: 'user1@kookmin.ac.kr',
      name: '김민준',
      contact: '010-1111-0001',
      role: UserRole.USER,
      pendingApproval: false,
    },
    {
      email: 'user2@kookmin.ac.kr',
      name: '이서연',
      contact: '010-1111-0002',
      role: UserRole.USER,
      pendingApproval: false,
    },
    {
      email: 'user3@kookmin.ac.kr',
      name: '박지호',
      contact: '010-1111-0003',
      role: UserRole.USER,
      pendingApproval: false,
    },
    {
      email: 'user4@kookmin.ac.kr',
      name: '최수아',
      contact: '010-1111-0004',
      role: UserRole.USER,
      pendingApproval: false,
    },
    {
      email: 'manager@kookmin.ac.kr',
      name: '강관리',
      contact: '010-3333-0001',
      role: UserRole.MANAGER,
      pendingApproval: false,
    },
    {
      email: 'manager.pending@kookmin.ac.kr',
      name: '윤대기',
      contact: '010-3333-0002',
      role: UserRole.MANAGER,
      pendingApproval: true,
    },
    {
      email: 'admin@kookmin.ac.kr',
      name: '운영자',
      contact: '010-4444-0001',
      role: UserRole.ADMIN,
      pendingApproval: false,
    },
  ];

  const users = new Map<string, Awaited<ReturnType<typeof prisma.user.upsert>>>();
  for (const user of demoUsers) {
    const savedUser = await prisma.user.upsert({
      where: { email: user.email },
      update: { ...user, passwordHash },
      create: { ...user, passwordHash },
    });
    users.set(savedUser.email, savedUser);
  }

  const user1 = users.get('user1@kookmin.ac.kr')!;
  const user2 = users.get('user2@kookmin.ac.kr')!;
  const user3 = users.get('user3@kookmin.ac.kr')!;
  const user4 = users.get('user4@kookmin.ac.kr')!;
  const manager = users.get('manager@kookmin.ac.kr')!;
  const reportIds = {
    noCandidate: '10000000-0000-4000-8000-000000000001',
    candidate: '10000000-0000-4000-8000-000000000002',
    requested: '10000000-0000-4000-8000-000000000003',
    waiting: '10000000-0000-4000-8000-000000000004',
    completed: '10000000-0000-4000-8000-000000000005',
  };
  const itemIds = {
    registered: '20000000-0000-4000-8000-000000000001',
    candidate: '20000000-0000-4000-8000-000000000002',
    requested: '20000000-0000-4000-8000-000000000003',
    waiting: '20000000-0000-4000-8000-000000000004',
    completed: '20000000-0000-4000-8000-000000000005',
    searchable: '20000000-0000-4000-8000-000000000006',
    disposal: '20000000-0000-4000-8000-000000000007',
  };
  const matchIds = {
    candidate: '30000000-0000-4000-8000-000000000002',
    requested: '30000000-0000-4000-8000-000000000003',
    waiting: '30000000-0000-4000-8000-000000000004',
    completed: '30000000-0000-4000-8000-000000000005',
  };
  const pickupIds = {
    waiting: '40000000-0000-4000-8000-000000000004',
    completed: '40000000-0000-4000-8000-000000000005',
  };

  const oldVerificationReports = await prisma.lostReport.findMany({
    where: { reporterName: { in: ['E2E', 'Flow', 'Reporter'] } },
    select: { id: true },
  });
  const oldVerificationItems = await prisma.foundItem.findMany({
    where: { finderName: { in: ['E2E', 'Flow', 'Finder'] } },
    select: { id: true },
  });
  const oldReportIds = oldVerificationReports.map((report) => report.id);
  const oldItemIds = oldVerificationItems.map((item) => item.id);
  if (oldReportIds.length > 0 || oldItemIds.length > 0) {
    await prisma.pickup.deleteMany({
      where: {
        OR: [
          { reportId: { in: oldReportIds } },
          { itemId: { in: oldItemIds } },
        ],
      },
    });
    await prisma.match.deleteMany({
      where: {
        OR: [
          { reportId: { in: oldReportIds } },
          { itemId: { in: oldItemIds } },
        ],
      },
    });
    await prisma.lostReport.deleteMany({ where: { id: { in: oldReportIds } } });
    await prisma.foundItem.deleteMany({ where: { id: { in: oldItemIds } } });
  }

  await prisma.pickup.deleteMany({ where: { reportId: { in: Object.values(reportIds) } } });
  await prisma.match.deleteMany({ where: { reportId: { in: Object.values(reportIds) } } });

  const reports = [
    {
      reporter: user2,
      id: reportIds.noCandidate,
      itemName: '빨간 체크 머플러',
      category: '의류',
      lostPlace: '미래관 2층 강의실',
      lostAt: daysAgo(1),
      description: '회색 코트와 함께 두고 나온 빨간 체크무늬 머플러입니다.',
      status: LostReportStatus.RECEIVED,
    },
    {
      reporter: user1,
      id: reportIds.candidate,
      itemName: '검정 카드지갑',
      category: '지갑',
      lostPlace: '중앙도서관',
      lostAt: daysAgo(2),
      description: '학생증과 파란색 체크카드가 들어 있습니다.',
      status: LostReportStatus.MATCH_CANDIDATE,
    },
    {
      reporter: user3,
      id: reportIds.requested,
      itemName: '하늘색 텀블러',
      category: '기타',
      lostPlace: '학생회관 카페',
      lostAt: daysAgo(3),
      description: '뚜껑에 작은 별 모양 스티커가 붙어 있습니다.',
      status: LostReportStatus.MATCH_CANDIDATE,
    },
    {
      reporter: user4,
      id: reportIds.waiting,
      itemName: '흰색 무선 이어폰',
      category: '전자기기',
      lostPlace: '북악관 1층 로비',
      lostAt: daysAgo(4),
      description: '투명 케이스 안에 들어 있는 흰색 무선 이어폰입니다.',
      status: LostReportStatus.FOUND,
    },
    {
      reporter: user2,
      id: reportIds.completed,
      itemName: '남색 접이식 우산',
      category: '기타',
      lostPlace: '경상관 입구',
      lostAt: daysAgo(12),
      description: '손잡이에 흰색 이름 스티커가 있습니다.',
      status: LostReportStatus.CLOSED,
    },
  ];
  for (const report of reports) {
    const { reporter, ...data } = report;
    await prisma.lostReport.upsert({
      where: { id: data.id },
      update: {
        reporterId: reporter.id,
        reporterName: reporter.name,
        reporterContact: reporter.contact,
        ...data,
      },
      create: {
        reporterId: reporter.id,
        reporterName: reporter.name,
        reporterContact: reporter.contact,
        ...data,
      },
    });
  }

  const items = [
    {
      finder: user3,
      id: itemIds.registered,
      itemName: '분홍색 필통',
      category: '기타',
      foundPlace: '조형관 1층',
      foundAt: daysAgo(0),
      description: '등록만 된 물품입니다. 관리자가 보관 위치를 입력하는 흐름을 테스트할 수 있습니다.',
      status: FoundItemStatus.REGISTERED,
      storageLocation: null,
    },
    {
      finder: user2,
      id: itemIds.candidate,
      itemName: '검정 카드지갑',
      category: '지갑',
      foundPlace: '중앙도서관 1층',
      foundAt: daysAgo(1),
      description: '학생증이 보이는 검정색 카드지갑입니다.',
      status: FoundItemStatus.STORED,
      storageLocation: '중앙보관소 A-03',
    },
    {
      finder: user4,
      id: itemIds.requested,
      itemName: '하늘색 텀블러',
      category: '기타',
      foundPlace: '학생회관 카페 앞',
      foundAt: daysAgo(2),
      description: '별 모양 스티커가 부착되어 있어 관리자 승인 대기 테스트용입니다.',
      status: FoundItemStatus.STORED,
      storageLocation: '중앙보관소 B-07',
    },
    {
      finder: user2,
      id: itemIds.waiting,
      itemName: '흰색 무선 이어폰',
      category: '전자기기',
      foundPlace: '북악관 1층 로비',
      foundAt: daysAgo(4),
      description: '수령 코드 확인과 수령 완료 처리를 테스트할 수 있습니다.',
      status: FoundItemStatus.PICKUP_WAITING,
      storageLocation: '북악보관소 C-02',
    },
    {
      finder: user3,
      id: itemIds.completed,
      itemName: '남색 접이식 우산',
      category: '기타',
      foundPlace: '경상관 입구',
      foundAt: daysAgo(12),
      description: '이미 수령 완료된 처리 이력입니다.',
      status: FoundItemStatus.PICKUP_COMPLETED,
      storageLocation: '경상보관소 D-01',
    },
    {
      finder: user4,
      id: itemIds.searchable,
      itemName: '은색 보조배터리',
      category: '전자기기',
      foundPlace: '공학관 4층 복도',
      foundAt: daysAgo(5),
      description: '검색 목록에서 확인 가능한 보관중 습득물입니다.',
      status: FoundItemStatus.STORED,
      storageLocation: '공학보관소 E-11',
    },
    {
      finder: user1,
      id: itemIds.disposal,
      itemName: '오래된 검정 장우산',
      category: '기타',
      foundPlace: '정문 안내실',
      foundAt: daysAgo(45),
      description: '장기 미수령으로 폐기 예정 처리된 물품입니다.',
      status: FoundItemStatus.DISPOSAL_PENDING,
      storageLocation: '폐기검토함 F-01',
    },
  ];
  for (const item of items) {
    const { finder, ...data } = item;
    await prisma.foundItem.upsert({
      where: { id: data.id },
      update: {
        finderId: finder.id,
        finderName: finder.name,
        finderContact: finder.contact,
        ...data,
      },
      create: {
        finderId: finder.id,
        finderName: finder.name,
        finderContact: finder.contact,
        ...data,
      },
    });
  }

  const requestedAt = daysAgo(0, 9);
  const waitingStartedAt = daysAgo(1, 14);
  const completedAt = daysAgo(8, 15);
  await prisma.match.createMany({
    data: [
      {
        id: matchIds.candidate,
        reportId: reportIds.candidate,
        itemId: itemIds.candidate,
        status: MatchStatus.ACTIVE,
        score: 80,
      },
      {
        id: matchIds.requested,
        reportId: reportIds.requested,
        itemId: itemIds.requested,
        status: MatchStatus.CONFIRM_REQUESTED,
        score: 80,
        requestedAt,
      },
      {
        id: matchIds.waiting,
        reportId: reportIds.waiting,
        itemId: itemIds.waiting,
        status: MatchStatus.APPROVED,
        score: 80,
        requestedAt: daysAgo(2),
        reviewedAt: waitingStartedAt,
      },
      {
        id: matchIds.completed,
        reportId: reportIds.completed,
        itemId: itemIds.completed,
        status: MatchStatus.INACTIVE,
        score: 80,
        requestedAt: daysAgo(10),
        reviewedAt: daysAgo(9),
      },
    ],
  });

  await prisma.pickup.createMany({
    data: [
      {
        id: pickupIds.waiting,
        matchId: matchIds.waiting,
        reportId: reportIds.waiting,
        itemId: itemIds.waiting,
        pickupCode: '246810',
        status: PickupStatus.WAITING,
        waitingStartedAt,
        autoCancelAt: daysFrom(waitingStartedAt, 3),
      },
      {
        id: pickupIds.completed,
        matchId: matchIds.completed,
        reportId: reportIds.completed,
        itemId: itemIds.completed,
        pickupCode: '135790',
        status: PickupStatus.COMPLETED,
        waitingStartedAt: daysAgo(9),
        autoCancelAt: daysAgo(6),
        completedAt,
        verifierId: manager.id,
      },
    ],
  });

  const notificationIds = [
    '50000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000002',
    '50000000-0000-4000-8000-000000000003',
    '50000000-0000-4000-8000-000000000004',
  ];
  await prisma.notification.deleteMany({ where: { id: { in: notificationIds } } });
  await prisma.notification.createMany({
    data: [
      {
        id: notificationIds[0],
        userId: user1.id,
        type: '매칭후보생성',
        title: '검정 카드지갑 매칭 후보가 있습니다.',
        message: '보관중인 습득물 중 비슷한 물품을 확인해보세요.',
        link: `/reports/${reportIds.candidate}`,
      },
      {
        id: notificationIds[1],
        userId: user4.id,
        type: '확인요청승인',
        title: '흰색 무선 이어폰 수령이 승인되었습니다.',
        message: '수령 코드 246810을 확인하고 보관소를 방문하세요.',
        link: `/reports/${reportIds.waiting}`,
      },
      {
        id: notificationIds[2],
        userId: manager.id,
        type: '확인요청접수',
        title: '하늘색 텀블러 확인 요청이 도착했습니다.',
        message: '분실자 요청을 검토하고 승인 또는 반려 처리하세요.',
        link: '/manager/confirmations',
      },
      {
        id: notificationIds[3],
        userId: manager.id,
        type: '폐기검토필요',
        title: '장기 미수령 물품 검토가 필요합니다.',
        message: '오래된 검정 장우산이 폐기 예정 상태입니다.',
        link: '/manager/items',
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
