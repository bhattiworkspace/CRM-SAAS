import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { leadSchema } from '@/lib/validations/lead';
import { recordAuditLog } from '@/lib/audit';
import { dispatchWorkflowTrigger } from '@/lib/services/workflow-dispatcher';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.LEADS_VIEW, orgIdHeader);

    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const priority = searchParams.get('priority');

    const where: Record<string, unknown> = {
      organizationId: context.organization.id,
    };

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { companyName: { contains: search } },
      ];
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true },
        },
        tasks: {
          where: {
            status: 'PENDING'
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, leads });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch leads';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.LEADS_CREATE, orgIdHeader);

    const body = await req.json();
    const validatedData = leadSchema.parse(body);

    const lead = await prisma.lead.create({
      data: {
        ...validatedData,
        organizationId: context.organization.id,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    await recordAuditLog({
      organizationId: context.organization.id,
      userId: context.user.id,
      action: 'CREATE',
      entity: 'Lead',
      entityId: lead.id,
      metadata: { name: `${lead.firstName} ${lead.lastName}`, company: lead.companyName },
    });

    await dispatchWorkflowTrigger(context.organization.id, 'LEAD_CREATED', { leadId: lead.id, ...lead });

    return NextResponse.json({ success: true, lead }, { status: 201 });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to create lead';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}
