const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const tasks = await prisma.task.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  });
  console.log('Recent Tasks:', tasks);
}

check().finally(() => prisma.$disconnect());
