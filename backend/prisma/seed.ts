import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

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

  for (const user of demoUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { ...user, passwordHash },
      create: { ...user, passwordHash },
    });
  }
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
