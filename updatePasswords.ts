import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const newPasswordOwner = 'Owner@12345!'; // Secure default
  const newPasswordSales = 'Sales@12345!';

  const hashedOwner = await bcrypt.hash(newPasswordOwner, 10);
  const hashedSales = await bcrypt.hash(newPasswordSales, 10);

  // Update demo@acme.com
  const owner = await prisma.user.updateMany({
    where: { email: 'demo@acme.com' },
    data: { passwordHash: hashedOwner },
  });

  // Update sales@acme.com
  const sales = await prisma.user.updateMany({
    where: { email: 'sales@acme.com' },
    data: { passwordHash: hashedSales },
  });

  console.log('Successfully updated passwords for users:');
  console.log(`- demo@acme.com (New Password: ${newPasswordOwner}) - Updated ${owner.count} rows`);
  console.log(`- sales@acme.com (New Password: ${newPasswordSales}) - Updated ${sales.count} rows`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
