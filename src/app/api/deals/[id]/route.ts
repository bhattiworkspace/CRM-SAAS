import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { dealSchema } from '@/lib/validations/deal';
import { recordAuditLog } from '@/lib/audit';
import { dispatchWorkflowTrigger } from '@/lib/services/workflow-dispatcher';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.DEALS_VIEW, orgIdHeader);

    const deal = await prisma.deal.findFirst({
      where: {
        id: params.id,
        organizationId: context.organization.id,
      },
      include: {
        pipeline: true,
        stage: true,
        company: true,
        contact: true,
        owner: { select: { id: true, name: true, email: true, image: true } },
        activities: { orderBy: { createdAt: 'desc' }, include: { createdBy: { select: { id: true, name: true } } } },
        tasks: { orderBy: { createdAt: 'desc' }, include: { assignedTo: { select: { id: true, name: true } } } },
      },
    });

    if (!deal) {
      return NextResponse.json({ success: false, error: 'Deal not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deal });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch deal';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.DEALS_UPDATE, orgIdHeader);

    const body = await req.json();
    const validatedData = dealSchema.parse(body);

    const existing = await prisma.deal.findFirst({
      where: { id: params.id, organizationId: context.organization.id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Deal not found or access denied' }, { status: 404 });
    }

    const updatedDeal = await prisma.deal.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        expectedCloseDate: validatedData.expectedCloseDate ? new Date(validatedData.expectedCloseDate) : null,
      },
      include: { stage: true },
    });

    await recordAuditLog({
      organizationId: context.organization.id,
      userId: context.user.id,
      action: 'UPDATE',
      entity: 'Deal',
      entityId: updatedDeal.id,
      metadata: { name: updatedDeal.name, amount: updatedDeal.amount },
    });

    if (existing.stageId !== updatedDeal.stageId) {
      await dispatchWorkflowTrigger(context.organization.id, 'DEAL_STAGE_CHANGED', { dealId: updatedDeal.id, ...updatedDeal });
    }

    if (
      (existing.status !== 'WON' && updatedDeal.status === 'WON') ||
      updatedDeal.stage.name.toLowerCase().includes('closed won')
    ) {
      await dispatchWorkflowTrigger(context.organization.id, 'DEAL_WON', { dealId: updatedDeal.id, ...updatedDeal });
    } else if (
      (existing.status !== 'LOST' && updatedDeal.status === 'LOST') ||
      updatedDeal.stage.name.toLowerCase().includes('closed lost')
    ) {
      await dispatchWorkflowTrigger(context.organization.id, 'DEAL_LOST', { dealId: updatedDeal.id, ...updatedDeal });
    }

    return NextResponse.json({ success: true, deal: updatedDeal });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to update deal';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.DEALS_DELETE, orgIdHeader);

    const existing = await prisma.deal.findFirst({
      where: { id: params.id, organizationId: context.organization.id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Deal not found or access denied' }, { status: 404 });
    }

    await prisma.deal.delete({
      where: { id: params.id },
    });

    await recordAuditLog({
      organizationId: context.organization.id,
      userId: context.user.id,
      action: 'DELETE',
      entity: 'Deal',
      entityId: params.id,
    });

    return NextResponse.json({ success: true, message: 'Deal deleted successfully' });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to delete deal';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}
