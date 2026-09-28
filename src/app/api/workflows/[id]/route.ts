import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { workflowUpdateSchema } from '@/lib/validations/workflow';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.WORKFLOWS_VIEW, orgIdHeader);

    const workflow = await prisma.workflow.findFirst({
      where: { id: params.id, organizationId: context.organization.id },
      include: { conditions: true, actions: { orderBy: { order: 'asc' } }, executions: { take: 10, orderBy: { startedAt: 'desc' } } }
    });

    if (!workflow) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: workflow });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.WORKFLOWS_MANAGE, orgIdHeader);

    const body = await req.json();
    const validated = workflowUpdateSchema.parse(body);

    const workflow = await prisma.workflow.findFirst({
      where: { id: params.id, organizationId: context.organization.id }
    });
    if (!workflow) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const updated = await prisma.$transaction(async (tx) => {
      const updateData: any = {};
      if (validated.name !== undefined) updateData.name = validated.name;
      if (validated.description !== undefined) updateData.description = validated.description;
      if (validated.triggerType !== undefined) updateData.triggerType = validated.triggerType;
      if (validated.isActive !== undefined) updateData.status = validated.isActive ? 'ACTIVE' : 'DRAFT';

      await tx.workflow.update({ where: { id: params.id }, data: updateData });

      if (validated.conditions) {
        await tx.workflowCondition.deleteMany({ where: { workflowId: params.id } });
        await Promise.all(validated.conditions.map((cond: any) => 
          tx.workflowCondition.create({ data: { ...cond, workflowId: params.id } })
        ));
      }

      if (validated.actions) {
        await tx.workflowAction.deleteMany({ where: { workflowId: params.id } });
        await Promise.all(validated.actions.map((act: any, idx: number) => 
          tx.workflowAction.create({ data: { ...act, workflowId: params.id, order: idx } })
        ));
      }

      return tx.workflow.findUnique({ where: { id: params.id }, include: { conditions: true, actions: { orderBy: { order: 'asc' } } } });
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.WORKFLOWS_MANAGE, orgIdHeader);

    const workflow = await prisma.workflow.findFirst({
      where: { id: params.id, organizationId: context.organization.id }
    });
    if (!workflow) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    await prisma.workflow.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true, message: 'Deleted' });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}
