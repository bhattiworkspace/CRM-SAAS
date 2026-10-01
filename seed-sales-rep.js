const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedData() {
  try {
    // 1. Find a sales representative
    const salesRepRole = await prisma.role.findFirst({
      where: { name: 'Sales Representative' },
      include: { memberships: { include: { user: true } } }
    });

    if (!salesRepRole || salesRepRole.memberships.length === 0) {
      console.log('No sales representative found.');
      return;
    }

    const salesRep = salesRepRole.memberships[0].user;
    const organizationId = salesRepRole.memberships[0].organizationId;

    console.log(`Found Sales Rep: ${salesRep.name} (${salesRep.email}) in Org: ${organizationId}`);

    // Lead data template
    const leadsData = [
      { firstName: 'Alice', lastName: 'Johnson', email: 'alice@example.com', company: 'TechCorp', status: 'NEW', priority: 'LOW', val: 5000 },
      { firstName: 'Bob', lastName: 'Smith', email: 'bob@example.com', company: 'Globex', status: 'CONTACTED', priority: 'MEDIUM', val: 12000 },
      { firstName: 'Charlie', lastName: 'Brown', email: 'charlie@example.com', company: 'Soylent', status: 'QUALIFIED', priority: 'HIGH', val: 35000 },
      { firstName: 'Diana', lastName: 'Prince', email: 'diana@example.com', company: 'Wayne Ent', status: 'PROPOSAL', priority: 'URGENT', val: 80000 },
      { firstName: 'Ethan', lastName: 'Hunt', email: 'ethan@example.com', company: 'IMF', status: 'CLOSED_WON', priority: 'HIGH', val: 150000 },
      { firstName: 'Fiona', lastName: 'Gallagher', email: 'fiona@example.com', company: 'Patsy', status: 'CLOSED_LOST', priority: 'LOW', val: 2500 },
      { firstName: 'George', lastName: 'Costanza', email: 'george@example.com', company: 'Vandelay', status: 'NEW', priority: 'MEDIUM', val: 8500 },
      { firstName: 'Hannah', lastName: 'Abbott', email: 'hannah@example.com', company: 'Hogwarts', status: 'QUALIFIED', priority: 'HIGH', val: 42000 },
      { firstName: 'Ian', lastName: 'Malcolm', email: 'ian@example.com', company: 'InGen', status: 'PROPOSAL', priority: 'URGENT', val: 95000 },
      { firstName: 'Julia', lastName: 'Child', email: 'julia@example.com', company: 'PBS', status: 'CLOSED_WON', priority: 'MEDIUM', val: 28000 },
    ];

    const today = new Date();
    
    // Create leads and tasks
    for (const [index, data] of leadsData.entries()) {
      const lead = await prisma.lead.create({
        data: {
          organizationId: organizationId,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          companyName: data.company,
          status: data.status,
          priority: data.priority,
          source: 'Website',
          estimatedValue: data.val,
          ownerId: salesRep.id,
        }
      });

      console.log(`Created Lead: ${lead.firstName} ${lead.lastName}`);

      // Add a follow up task for every lead
      // Stagger dates: some overdue, some today, some tomorrow
      let dueDate = new Date();
      if (index % 3 === 0) dueDate.setDate(today.getDate() - 1); // Overdue
      else if (index % 3 === 1) dueDate.setDate(today.getDate()); // Today
      else dueDate.setDate(today.getDate() + 1); // Tomorrow

      await prisma.task.create({
        data: {
          organizationId: organizationId,
          title: `Follow up with ${lead.firstName} (${data.status})`,
          dueDate: dueDate,
          priority: data.priority,
          status: index % 4 === 0 ? 'COMPLETED' : 'PENDING',
          assignedToId: salesRep.id,
          leadId: lead.id
        }
      });
      console.log(`- Created Task for Lead`);
    }

    console.log('Successfully seeded 10 leads and tasks for the Sales Representative!');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedData();
