import { NextRequest, NextResponse } from 'next/server';
import { getTenantSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await getTenantSession(orgIdHeader);
    if (!context) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const notifications = await prisma.notification.findMany({
      where: { organizationId: context.organization.id, userId: context.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const pendingTasks = await prisma.task.findMany({
      where: {
        organizationId: context.organization.id,
        assignedToId: context.user.id,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      include: { lead: true },
      orderBy: { dueDate: 'asc' },
      take: 10
    });

    const pendingLeads = await prisma.lead.findMany({
      where: {
        organizationId: context.organization.id,
        ownerId: context.user.id,
        status: 'NEW',
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    const taskNotifications = pendingTasks.map(task => {
      const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
      return {
        id: `task-${task.id}`,
        title: isOverdue ? 'Overdue Follow-up' : 'Pending Follow-up',
        message: `${task.title}${task.lead ? ` for ${task.lead.firstName} ${task.lead.lastName}` : ''}`,
        link: '/tasks',
        isRead: false,
        createdAt: task.createdAt,
        type: isOverdue ? 'OVERDUE_TASK' : 'PENDING_TASK'
      };
    });

    const leadNotifications = pendingLeads.map(lead => {
      return {
        id: `lead-${lead.id}`,
        title: 'New Pending Lead',
        message: `${lead.firstName} ${lead.lastName}${lead.companyName ? ` at ${lead.companyName}` : ''}`,
        link: `/leads`,
        isRead: false,
        createdAt: lead.createdAt,
        type: 'PENDING_LEAD'
      };
    });

    const allNotifications = [...taskNotifications, ...leadNotifications, ...notifications].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ success: true, data: allNotifications });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await getTenantSession(orgIdHeader);
    if (!context) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    
    if (body.all) {
      await prisma.notification.updateMany({
        where: { organizationId: context.organization.id, userId: context.user.id, isRead: false },
        data: { isRead: true }
      });
    } else if (body.ids && Array.isArray(body.ids)) {
      await prisma.notification.updateMany({
        where: { organizationId: context.organization.id, userId: context.user.id, id: { in: body.ids } },
        data: { isRead: true }
      });
    }

    return NextResponse.json({ success: true, message: 'Updated' });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}
