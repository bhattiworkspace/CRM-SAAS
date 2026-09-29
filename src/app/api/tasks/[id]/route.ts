import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { taskSchema } from '@/lib/validations/task';
import { recordAuditLog } from '@/lib/audit';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.TASKS_UPDATE, orgIdHeader);

    const body = await req.json();
    const validatedData = taskSchema.partial().parse(body);

    const existing = await prisma.task.findFirst({
      where: { id: params.id, organizationId: context.organization.id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Task not found or access denied' }, { status: 404 });
    }

    if (context.role.name === 'Sales Representative' && existing.assignedToId !== context.user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized to update this task' }, { status: 403 });
    }

    const updatedTask = await prisma.task.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : undefined,
      },
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    await recordAuditLog({
      organizationId: context.organization.id,
      userId: context.user.id,
      action: 'UPDATE',
      entity: 'Task',
      entityId: updatedTask.id,
      metadata: { status: updatedTask.status, title: updatedTask.title },
    });

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to update task';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.TASKS_DELETE, orgIdHeader);

    const existing = await prisma.task.findFirst({
      where: { id: params.id, organizationId: context.organization.id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Task not found or access denied' }, { status: 404 });
    }

    if (context.role.name === 'Sales Representative' && existing.assignedToId !== context.user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized to delete this task' }, { status: 403 });
    }

    await prisma.task.delete({
      where: { id: params.id },
    });

    await recordAuditLog({
      organizationId: context.organization.id,
      userId: context.user.id,
      action: 'DELETE',
      entity: 'Task',
      entityId: params.id,
    });

    return NextResponse.json({ success: true, message: 'Task deleted successfully' });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to delete task';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}
