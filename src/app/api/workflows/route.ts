import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { workflowSchema } from '@/lib/validations/workflow';
import { canUseFeature } from '@/lib/services/entitlements';

export async function GET(req: NextRequest) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.WORKFLOWS_VIEW, orgIdHeader);

    const workflows = await prisma.workflow.findMany({
      where: { organizationId: context.organization.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: workflows });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.WORKFLOWS_CREATE, orgIdHeader);

    const allowed = await canUseFeature(context.organization.id, 'AUTOMATION');
    if (!allowed) return NextResponse.json({ success: false, error: 'AUTOMATION entitlement not active' }, { status: 403 });

    const body = await req.json();
    const validated = workflowSchema.parse(body);

    const workflow = await prisma.$transaction(async (tx) => {
      const wf = await tx.workflow.create({
        data: {
          organizationId: context.organization.id,
          name: validated.name,
          description: validated.description,
          triggerType: validated.triggerType,
          status: validated.isActive ? 'ACTIVE' : 'DRAFT',
          createdById: context.user.id,
        }
      });
      
      if (validated.conditions && validated.conditions.length > 0) {
        await Promise.all(validated.conditions.map((cond: any) => 
          tx.workflowCondition.create({ data: { ...cond, workflowId: wf.id } })
        ));
      }
      
      if (validated.actions && validated.actions.length > 0) {
        await Promise.all(validated.actions.map((act: any, idx: number) => 
          tx.workflowAction.create({ data: { ...act, workflowId: wf.id, order: idx } })
        ));
      }
      
      return tx.workflow.findUnique({ where: { id: wf.id }, include: { conditions: true, actions: true } });
    });

    return NextResponse.json({ success: true, data: workflow }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}
