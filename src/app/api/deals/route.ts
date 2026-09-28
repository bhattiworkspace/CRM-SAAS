import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { dealSchema } from '@/lib/validations/deal';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.DEALS_VIEW, orgIdHeader);

    const pipelineIdParam = searchParams.get('pipelineId');

    // Fetch active default pipeline if not specified
    let pipelineId = pipelineIdParam;
    if (!pipelineId) {
      const defaultPipeline = await prisma.pipeline.findFirst({
        where: { organizationId: context.organization.id, isDefault: true },
      });
      pipelineId = defaultPipeline?.id || null;
    }

    if (!pipelineId) {
      const anyPipeline = await prisma.pipeline.findFirst({
        where: { organizationId: context.organization.id },
      });
      pipelineId = anyPipeline?.id || null;
    }

    const pipeline = pipelineId
      ? await prisma.pipeline.findFirst({
          where: { id: pipelineId, organizationId: context.organization.id },
          include: {
            stages: { orderBy: { order: 'asc' } },
          },
        })
      : null;

    const deals = await prisma.deal.findMany({
      where: {
        organizationId: context.organization.id,
        ...(pipelineId ? { pipelineId } : {}),
      },
      include: {
        stage: true,
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        owner: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, pipeline, deals });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch deals';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.DEALS_CREATE, orgIdHeader);

    const body = await req.json();
    const validatedData = dealSchema.parse(body);

    const deal = await prisma.deal.create({
      data: {
        ...validatedData,
        expectedCloseDate: validatedData.expectedCloseDate ? new Date(validatedData.expectedCloseDate) : null,
        organizationId: context.organization.id,
      },
      include: {
        stage: true,
        company: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
      },
    });

    await recordAuditLog({
      organizationId: context.organization.id,
      userId: context.user.id,
      action: 'CREATE',
      entity: 'Deal',
      entityId: deal.id,
      metadata: { name: deal.name, amount: deal.amount, stage: deal.stage.name },
    });

    return NextResponse.json({ success: true, deal }, { status: 201 });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to create deal';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}
