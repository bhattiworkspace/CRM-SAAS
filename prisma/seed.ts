import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from '../src/lib/permissions';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting CRM SaaS Database Seed...');

  // 1. Seed System Permissions
  const permissionEntries = Object.entries(PERMISSIONS);
  for (const [key, code] of permissionEntries) {
    const category = code.split('.')[0];
    const name = key.replace(/_/g, ' ');
    await prisma.permission.upsert({
      where: { code },
      update: { name, category },
      create: {
        code,
        name,
        category,
        description: `Permission to perform ${name}`,
      },
    });
  }
  console.log('✅ System Permissions seeded.');

  // 2. Create Global System Roles
  const rolesMap: Record<string, string> = {};
  for (const roleName of ['Owner', 'Admin', 'Sales Manager', 'Sales Representative']) {
    const existing = await prisma.role.findFirst({
      where: { name: roleName, organizationId: null },
    });

    let role = existing;
    if (!role) {
      role = await prisma.role.create({
        data: {
          name: roleName,
          description: `Global default role: ${roleName}`,
          isSystem: true,
        },
      });
    }
    rolesMap[roleName] = role.id;

    // Attach permissions to Role
    const permissionCodes = DEFAULT_ROLE_PERMISSIONS[roleName] || [];
    for (const code of permissionCodes) {
      const perm = await prisma.permission.findUnique({ where: { code } });
      if (perm) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: perm.id,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: perm.id,
          },
        });
      }
    }
  }
  console.log('✅ System Roles & RolePermissions seeded.');

  // 3. Create Password Hash
  const passwordHash = await bcrypt.hash('password123', 10);

  // 4. Create Primary Demo User & Acme Corp Organization
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@acme.com' },
    update: { passwordHash },
    create: {
      name: 'Alex Rivera (Demo)',
      email: 'demo@acme.com',
      passwordHash,
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    },
  });

  const salesUser = await prisma.user.upsert({
    where: { email: 'sales@acme.com' },
    update: { passwordHash },
    create: {
      name: 'Sarah Jenkins',
      email: 'sales@acme.com',
      passwordHash,
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    },
  });

  const acmeOrg = await prisma.organization.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Enterprise Solutions',
      slug: 'acme-corp',
      industry: 'Software & Technology',
      phone: '+1 (555) 123-4567',
      email: 'contact@acme.com',
      website: 'https://acme.example.com',
      address: '100 Enterprise Way, San Francisco, CA',
      country: 'United States',
      timezone: 'America/Los_Angeles',
    },
  });

  // Attach Memberships
  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: demoUser.id,
        organizationId: acmeOrg.id,
      },
    },
    update: { roleId: rolesMap['Owner'], status: 'ACTIVE' },
    create: {
      userId: demoUser.id,
      organizationId: acmeOrg.id,
      roleId: rolesMap['Owner'],
      status: 'ACTIVE',
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: salesUser.id,
        organizationId: acmeOrg.id,
      },
    },
    update: { roleId: rolesMap['Sales Representative'], status: 'ACTIVE' },
    create: {
      userId: salesUser.id,
      organizationId: acmeOrg.id,
      roleId: rolesMap['Sales Representative'],
      status: 'ACTIVE',
    },
  });

  console.log('✅ Acme Corp & Users created.');

  // 5. Create Secondary Organization (Beta Systems) for Tenant Isolation Testing
  const betaUser = await prisma.user.upsert({
    where: { email: 'beta@beta.com' },
    update: { passwordHash },
    create: {
      name: 'Brian Vance',
      email: 'beta@beta.com',
      passwordHash,
    },
  });

  const betaOrg = await prisma.organization.upsert({
    where: { slug: 'beta-systems' },
    update: {},
    create: {
      name: 'Beta Systems Inc.',
      slug: 'beta-systems',
      industry: 'Manufacturing',
      phone: '+1 (555) 999-8888',
      email: 'info@betasystems.example.com',
      website: 'https://betasystems.example.com',
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: betaUser.id,
        organizationId: betaOrg.id,
      },
    },
    update: { roleId: rolesMap['Owner'], status: 'ACTIVE' },
    create: {
      userId: betaUser.id,
      organizationId: betaOrg.id,
      roleId: rolesMap['Owner'],
      status: 'ACTIVE',
    },
  });

  // Also add demoUser to Beta Systems as a Sales Rep to test org switching
  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: demoUser.id,
        organizationId: betaOrg.id,
      },
    },
    update: { roleId: rolesMap['Sales Representative'], status: 'ACTIVE' },
    create: {
      userId: demoUser.id,
      organizationId: betaOrg.id,
      roleId: rolesMap['Sales Representative'],
      status: 'ACTIVE',
    },
  });

  console.log('✅ Beta Systems Organization created.');

  // 6. Create Database-Driven Pipeline & Stages for Acme Corp
  const acmePipeline = await prisma.pipeline.create({
    data: {
      organizationId: acmeOrg.id,
      name: 'Standard B2B Sales Pipeline',
      isDefault: true,
      stages: {
        create: [
          { organizationId: acmeOrg.id, name: 'New Lead', order: 1, probability: 10, color: '#64748b' },
          { organizationId: acmeOrg.id, name: 'Qualification', order: 2, probability: 30, color: '#3b82f6' },
          { organizationId: acmeOrg.id, name: 'Proposal Sent', order: 3, probability: 60, color: '#8b5cf6' },
          { organizationId: acmeOrg.id, name: 'Negotiation', order: 4, probability: 80, color: '#f59e0b' },
          { organizationId: acmeOrg.id, name: 'Closed Won', order: 5, probability: 100, color: '#10b981' },
          { organizationId: acmeOrg.id, name: 'Closed Lost', order: 6, probability: 0, color: '#ef4444' },
        ],
      },
    },
    include: { stages: true },
  });

  const stagesMap = acmePipeline.stages.reduce((acc, stage) => {
    acc[stage.name] = stage;
    return acc;
  }, {} as Record<string, typeof acmePipeline.stages[0]>);

  console.log('✅ Acme Sales Pipeline & Stages created.');

  // 7. Seed Companies for Acme Corp
  const comp1 = await prisma.company.create({
    data: {
      organizationId: acmeOrg.id,
      name: 'Starlight Global',
      domain: 'starlight.example.com',
      industry: 'Financial Services',
      phone: '+1 (555) 321-7654',
      website: 'https://starlight.example.com',
      address: '50 Wall St, New York, NY',
    },
  });

  const comp2 = await prisma.company.create({
    data: {
      organizationId: acmeOrg.id,
      name: 'OmniCloud Technologies',
      domain: 'omnicloud.example.com',
      industry: 'Cloud Computing',
      phone: '+1 (555) 987-1234',
      website: 'https://omnicloud.example.com',
      address: '200 Tech Highway, San Jose, CA',
    },
  });

  // 8. Seed Contacts for Acme Corp
  const contact1 = await prisma.contact.create({
    data: {
      organizationId: acmeOrg.id,
      companyId: comp1.id,
      firstName: 'David',
      lastName: 'Miller',
      email: 'david.m@starlight.example.com',
      phone: '+1 (555) 321-9988',
      title: 'VP of Engineering',
      ownerId: demoUser.id,
    },
  });

  const contact2 = await prisma.contact.create({
    data: {
      organizationId: acmeOrg.id,
      companyId: comp2.id,
      firstName: 'Elena',
      lastName: 'Rostova',
      email: 'elena@omnicloud.example.com',
      phone: '+1 (555) 987-4433',
      title: 'Chief Technology Officer',
      ownerId: salesUser.id,
    },
  });

  // 9. Seed Leads for Acme Corp
  await prisma.lead.createMany({
    data: [
      {
        organizationId: acmeOrg.id,
        firstName: 'Michael',
        lastName: 'Chang',
        title: 'Director of IT',
        email: 'm.chang@innovate.example.com',
        phone: '+1 (555) 444-5555',
        companyName: 'Innovate AI Corp',
        status: 'NEW',
        priority: 'HIGH',
        source: 'Business Finder',
        ownerId: demoUser.id,
      },
      {
        organizationId: acmeOrg.id,
        firstName: 'Sophia',
        lastName: 'Martinez',
        title: 'Operations Manager',
        email: 'smartinez@nexus.example.com',
        phone: '+1 (555) 666-7777',
        companyName: 'Nexus Global',
        status: 'QUALIFIED',
        priority: 'URGENT',
        source: 'Website Contact',
        ownerId: salesUser.id,
      },
      {
        organizationId: acmeOrg.id,
        firstName: 'Robert',
        lastName: 'Taylor',
        title: 'Head of Purchasing',
        email: 'rtaylor@summit.example.com',
        phone: '+1 (555) 111-2222',
        companyName: 'Summit Industries',
        status: 'CONTACTED',
        priority: 'MEDIUM',
        source: 'Referral',
        ownerId: demoUser.id,
      },
    ],
  });

  console.log('✅ Acme Companies, Contacts, and Leads seeded.');

  // 10. Seed Deals for Acme Corp
  await prisma.deal.create({
    data: {
      organizationId: acmeOrg.id,
      pipelineId: acmePipeline.id,
      stageId: stagesMap['Proposal Sent'].id,
      companyId: comp1.id,
      contactId: contact1.id,
      name: 'Starlight - Enterprise Annual License',
      amount: 45000,
      expectedCloseDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      status: 'OPEN',
      ownerId: demoUser.id,
    },
  });

  await prisma.deal.create({
    data: {
      organizationId: acmeOrg.id,
      pipelineId: acmePipeline.id,
      stageId: stagesMap['Negotiation'].id,
      companyId: comp2.id,
      contactId: contact2.id,
      name: 'OmniCloud - Infrastructure Migration',
      amount: 120000,
      expectedCloseDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'OPEN',
      ownerId: salesUser.id,
    },
  });

  await prisma.deal.create({
    data: {
      organizationId: acmeOrg.id,
      pipelineId: acmePipeline.id,
      stageId: stagesMap['Closed Won'].id,
      companyId: comp1.id,
      contactId: contact1.id,
      name: 'Starlight - Pilot Implementation',
      amount: 15000,
      status: 'WON',
      ownerId: demoUser.id,
    },
  });

  console.log('✅ Acme Deals seeded.');

  // 11. Seed Activities & Tasks
  await prisma.activity.create({
    data: {
      organizationId: acmeOrg.id,
      type: 'MEETING',
      title: 'Discovery Call with CTO Elena Rostova',
      description: 'Reviewed cloud architecture requirements and security compliance standards.',
      companyId: comp2.id,
      contactId: contact2.id,
      createdById: salesUser.id,
    },
  });

  await prisma.task.create({
    data: {
      organizationId: acmeOrg.id,
      title: 'Send revised SLA proposal to Starlight Global',
      description: 'Include 99.99% uptime guarantee clause.',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      priority: 'HIGH',
      status: 'PENDING',
      assignedToId: demoUser.id,
      companyId: comp1.id,
    },
  });

  // 12. Seed Beta Systems isolated records
  const betaPipeline = await prisma.pipeline.create({
    data: {
      organizationId: betaOrg.id,
      name: 'Beta Systems Pipeline',
      isDefault: true,
      stages: {
        create: [
          { organizationId: betaOrg.id, name: 'Lead', order: 1, probability: 20 },
          { organizationId: betaOrg.id, name: 'Won', order: 2, probability: 100 },
        ],
      },
    },
  });

  await prisma.lead.create({
    data: {
      organizationId: betaOrg.id,
      firstName: 'Beta Isolated',
      lastName: 'Secret Lead',
      companyName: 'Beta Private Co',
      status: 'NEW',
      ownerId: betaUser.id,
    },
  });

  console.log('✅ Beta Systems isolated records seeded.');

  // 13. Seed Billing Plans
  const plansData = [
    {
      name: 'Free',
      tier: 0,
      isDefault: true,
      description: 'Basic features for individuals and tiny teams',
      entitlements: [
        { moduleCode: 'AI', usageLimit: 50 },
        { moduleCode: 'EMAIL', usageLimit: 100 },
        { moduleCode: 'AUTOMATION', usageLimit: 50 },
        { moduleCode: 'BUSINESS_FINDER_PRO', usageLimit: 100 },
        { moduleCode: 'ENRICHMENT', usageLimit: 10 },
      ]
    },
    {
      name: 'Starter',
      tier: 1,
      isDefault: false,
      description: 'Essential tools for growing sales teams',
      entitlements: [
        { moduleCode: 'AI', usageLimit: 500 },
        { moduleCode: 'EMAIL', usageLimit: 1000 },
        { moduleCode: 'WHATSAPP', usageLimit: 500 },
        { moduleCode: 'SMS', usageLimit: 250 },
        { moduleCode: 'AUTOMATION', usageLimit: 500 },
        { moduleCode: 'BUSINESS_FINDER_PRO', usageLimit: 1000 },
        { moduleCode: 'ENRICHMENT', usageLimit: 100 },
        { moduleCode: 'ANALYTICS_ADVANCED', usageLimit: null },
      ]
    },
    {
      name: 'Professional',
      tier: 2,
      isDefault: false,
      description: 'Advanced capabilities for scale and automation',
      entitlements: [
        { moduleCode: 'AI', usageLimit: 5000 },
        { moduleCode: 'EMAIL', usageLimit: 10000 },
        { moduleCode: 'WHATSAPP', usageLimit: 5000 },
        { moduleCode: 'SMS', usageLimit: 2500 },
        { moduleCode: 'AUTOMATION', usageLimit: 5000 },
        { moduleCode: 'BUSINESS_FINDER_PRO', usageLimit: 5000 },
        { moduleCode: 'ENRICHMENT', usageLimit: 500 },
        { moduleCode: 'ANALYTICS_ADVANCED', usageLimit: null },
      ]
    },
    {
      name: 'Enterprise',
      tier: 3,
      isDefault: false,
      description: 'Unlimited access and enterprise-grade controls',
      entitlements: [
        { moduleCode: 'AI', usageLimit: null },
        { moduleCode: 'EMAIL', usageLimit: null },
        { moduleCode: 'WHATSAPP', usageLimit: null },
        { moduleCode: 'SMS', usageLimit: null },
        { moduleCode: 'AUTOMATION', usageLimit: null },
        { moduleCode: 'ENRICHMENT', usageLimit: null },
        { moduleCode: 'ANALYTICS_ADVANCED', usageLimit: null },
        { moduleCode: 'BUSINESS_FINDER_PRO', usageLimit: null },
      ]
    }
  ];

  const planIds: Record<string, string> = {};
  for (const p of plansData) {
    const existing = await prisma.plan.findFirst({ where: { name: p.name } });
    let plan = existing;
    if (!plan) {
      plan = await prisma.plan.create({
        data: {
          name: p.name,
          tier: p.tier,
          isDefault: p.isDefault,
          description: p.description,
        }
      });
    } else {
      plan = await prisma.plan.update({
        where: { id: plan.id },
        data: {
          tier: p.tier,
          isDefault: p.isDefault,
          description: p.description,
        }
      });
    }
    planIds[p.name] = plan.id;
    
    for (const ent of p.entitlements) {
      await prisma.planEntitlement.upsert({
        where: {
          planId_moduleCode: {
            planId: plan.id,
            moduleCode: ent.moduleCode,
          }
        },
        update: {
          usageLimit: ent.usageLimit,
        },
        create: {
          planId: plan.id,
          moduleCode: ent.moduleCode,
          usageLimit: ent.usageLimit,
        }
      });
    }
  }
  console.log('✅ Billing Plans seeded.');

  // 14. Create Subscriptions
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

  await prisma.subscription.upsert({
    where: { organizationId: acmeOrg.id },
    update: {
      planId: planIds['Professional'],
      currentPeriodStart: startOfMonth,
      currentPeriodEnd: endOfMonth,
    },
    create: {
      organizationId: acmeOrg.id,
      planId: planIds['Professional'],
      currentPeriodStart: startOfMonth,
      currentPeriodEnd: endOfMonth,
    }
  });

  await prisma.subscription.upsert({
    where: { organizationId: betaOrg.id },
    update: {
      planId: planIds['Free'],
      currentPeriodStart: startOfMonth,
      currentPeriodEnd: endOfMonth,
    },
    create: {
      organizationId: betaOrg.id,
      planId: planIds['Free'],
      currentPeriodStart: startOfMonth,
      currentPeriodEnd: endOfMonth,
    }
  });
  console.log('✅ Subscriptions seeded.');

  console.log('🎉 Database Seeding Complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
