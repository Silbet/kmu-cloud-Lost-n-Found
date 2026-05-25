import { PrismaClient, UserRole } from '@prisma/client';

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

  await prisma.user.upsert({
    where: { email: 'admin@kookmin.ac.kr' },
    update: {},
    create: {
      email: 'admin@kookmin.ac.kr',
      passwordHash: 'CHANGE_ME',
      name: '운영관리자',
      contact: '010-0000-0000',
      role: UserRole.ADMIN,
      pendingApproval: false,
    },
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
