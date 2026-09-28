import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { updateDealStageSchema } from '@/lib/validations/deal';
import { recordAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.DEALS_UPDATE, orgIdHeader);

    const body = await req.json();
    const { dealId, stageId, status } = updateDealStageSchema.parse(body);

    const deal = await prisma.deal.findFirst({
      where: { id: dealId, organizationId: context.organization.id },
      include: { stage: true },
    });

    if (!deal) {
      return NextResponse.json({ success: false, error: 'Deal not found or access denied' }, { status: 404 });
    }

    const newStage = await prisma.pipelineStage.findFirst({
      where: { id: stageId, organizationId: context.organization.id },
    });

    if (!newStage) {
      return NextResponse.json({ success: false, error: 'Target stage not found' }, { status: 404 });
    }

    const oldStageName = deal.stage.name;

    // Automatically update deal status if target stage is Closed Won / Closed Lost
    let newStatus = status || deal.status;
    if (newStage.name.toLowerCase().includes('won')) {
      newStatus = 'WON';
    } else if (newStage.name.toLowerCase().includes('lost')) {
      newStatus = 'LOST';
    }

    const updatedDeal = await prisma.deal.update({
      where: { id: dealId },
      data: {
        stageId: newStage.id,
        status: newStatus,
      },
      include: { stage: true, company: { select: { id: true, name: true } } },
    });

    // Create Activity History record
    await prisma.activity.create({
      data: {
        organizationId: context.organization.id,
        type: 'SYSTEM',
        title: `Deal moved to stage: ${newStage.name}`,
        description: `Stage updated from "${oldStageName}" to "${newStage.name}" by ${context.user.name}.`,
        dealId: deal.id,
        companyId: deal.companyId,
        contactId: deal.contactId,
        createdById: context.user.id,
      },
    });

    // Record Audit Log
    await recordAuditLog({
      organizationId: context.organization.id,
      userId: context.user.id,
      action: 'DEAL_STAGE_CHANGE',
      entity: 'Deal',
      entityId: deal.id,
      metadata: { fromStage: oldStageName, toStage: newStage.name, amount: deal.amount },
    });

    return NextResponse.json({ success: true, deal: updatedDeal });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to move deal stage';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}
