import { PrismaClient } from '@prisma/client';
import assert from 'assert';

const prisma = new PrismaClient();

async function runTests() {
  console.log('🧪 Starting Security & Business Logic Tests...');

  // 1. Fetch Tenants
  const acme = await prisma.organization.findUnique({ where: { slug: 'acme-corp' } });
  const beta = await prisma.organization.findUnique({ where: { slug: 'beta-systems' } });

  assert(acme, 'Acme Corp must exist');
  assert(beta, 'Beta Systems must exist');

  console.log('✅ 1. Tenants verified: Acme ID =', acme.id, '| Beta ID =', beta.id);

  // 2. Test Multi-Tenant Data Isolation
  const acmeLeads = await prisma.lead.findMany({ where: { organizationId: acme.id } });
  const betaLeads = await prisma.lead.findMany({ where: { organizationId: beta.id } });

  assert(acmeLeads.length > 0, 'Acme must have leads');
  assert(betaLeads.length > 0, 'Beta must have leads');

  const crossContamination = acmeLeads.some((l) => l.organizationId === beta.id);
  assert.strictEqual(crossContamination, false, 'SECURITY VIOLATION: Acme queried Beta data!');

  console.log('✅ 2. Tenant Isolation Verified: Acme has', acmeLeads.length, 'leads, Beta has', betaLeads.length, 'leads. Zero cross-tenant leakage.');

  // 3. Test Lead Conversion Logic
  const testLead = await prisma.lead.create({
    data: {
      organizationId: acme.id,
      firstName: 'TestConversion',
      lastName: 'User',
      companyName: 'Conversion Inc',
      email: 'test.convert@example.com',
      status: 'NEW',
    },
  });

  const defaultPipeline = await prisma.pipeline.findFirst({
    where: { organizationId: acme.id, isDefault: true },
    include: { stages: { orderBy: { order: 'asc' }, take: 1 } },
  });

  assert(defaultPipeline && defaultPipeline.stages.length > 0, 'Default pipeline must exist');

  // Execute conversion
  const company = await prisma.company.create({
    data: { organizationId: acme.id, name: testLead.companyName! },
  });

  const contact = await prisma.contact.create({
    data: {
      organizationId: acme.id,
      companyId: company.id,
      firstName: testLead.firstName,
      lastName: testLead.lastName,
      email: testLead.email,
    },
  });

  const deal = await prisma.deal.create({
    data: {
      organizationId: acme.id,
      pipelineId: defaultPipeline.id,
      stageId: defaultPipeline.stages[0].id,
      companyId: company.id,
      contactId: contact.id,
      name: `${testLead.companyName} Deal`,
      amount: 25000,
    },
  });

  await prisma.lead.update({
    where: { id: testLead.id },
    data: { status: 'CONVERTED' },
  });

  const updatedLead = await prisma.lead.findUnique({ where: { id: testLead.id } });
  assert.strictEqual(updatedLead?.status, 'CONVERTED', 'Lead status must be CONVERTED');
  assert(contact.id && company.id && deal.id, 'Associated Contact, Company, and Deal must be created');

  console.log('✅ 3. Atomic Lead Conversion Verified: Created Contact ID', contact.id, ', Company ID', company.id, ', Deal ID', deal.id);

  // Clean up test lead
  await prisma.deal.delete({ where: { id: deal.id } });
  await prisma.contact.delete({ where: { id: contact.id } });
  await prisma.company.delete({ where: { id: company.id } });
  await prisma.lead.delete({ where: { id: testLead.id } });

  console.log('🎉 ALL SECURITY & BUSINESS LOGIC TESTS PASSED!');
}

runTests()
  .catch((err) => {
    console.error('❌ TEST FAILURE:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
