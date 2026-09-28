import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { taskSchema } from '@/lib/validations/task';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.TASKS_VIEW, orgIdHeader);

    const status = searchParams.get('status');
    const priority = searchParams.get('priority');

    const where: Record<string, unknown> = {
      organizationId: context.organization.id,
    };

    if (status) where.status = status;
    if (priority) where.priority = priority;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, email: true, image: true } },
        lead: { select: { id: true, firstName: true, lastName: true, companyName: true } },
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        deal: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, tasks });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch tasks';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.TASKS_CREATE, orgIdHeader);

    const body = await req.json();
    const validatedData = taskSchema.parse(body);

    const task = await prisma.task.create({
      data: {
        ...validatedData,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        organizationId: context.organization.id,
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    await recordAuditLog({
      organizationId: context.organization.id,
      userId: context.user.id,
      action: 'CREATE',
      entity: 'Task',
      entityId: task.id,
      metadata: { title: task.title, priority: task.priority },
    });

    return NextResponse.json({ success: true, task }, { status: 201 });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to create task';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}
