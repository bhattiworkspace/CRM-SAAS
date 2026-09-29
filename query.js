const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.log('Orgs:', await prisma.organization.findMany({ select: { id: true, name: true } }));
}
main().finally(() => prisma.$disconnect());
