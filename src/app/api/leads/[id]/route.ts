import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { leadSchema } from '@/lib/validations/lead';
import { recordAuditLog } from '@/lib/audit';
import { dispatchWorkflowTrigger } from '@/lib/services/workflow-dispatcher';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.LEADS_VIEW, orgIdHeader);

    const lead = await prisma.lead.findFirst({
      where: {
        id: params.id,
        organizationId: context.organization.id,
      },
      include: {
        owner: { select: { id: true, name: true, email: true, image: true } },
        activities: {
          orderBy: { createdAt: 'desc' },
          include: { createdBy: { select: { id: true, name: true } } },
        },
        tasks: {
          orderBy: { createdAt: 'desc' },
          include: { assignedTo: { select: { id: true, name: true } } },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, lead });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch lead';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.LEADS_UPDATE, orgIdHeader);

    const body = await req.json();
    
    const existing = await prisma.lead.findFirst({
      where: { id: params.id, organizationId: context.organization.id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Lead not found or access denied' }, { status: 404 });
    }

    const updatedLead = await prisma.lead.update({
      where: { id: params.id },
      data: { status: body.status },
    });

    await recordAuditLog({
      organizationId: context.organization.id,
      userId: context.user.id,
      action: 'UPDATE_STATUS',
      entity: 'Lead',
      entityId: updatedLead.id,
      metadata: { status: updatedLead.status },
    });

    return NextResponse.json({ success: true, lead: updatedLead });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to update lead status';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.LEADS_UPDATE, orgIdHeader);

    const body = await req.json();
    const validatedData = leadSchema.parse(body);

    // Verify tenant ownership directly in database query
    const existing = await prisma.lead.findFirst({
      where: { id: params.id, organizationId: context.organization.id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Lead not found or access denied' }, { status: 404 });
    }

    const updatedLead = await prisma.lead.update({
      where: { id: params.id },
      data: validatedData,
    });

    await recordAuditLog({
      organizationId: context.organization.id,
      userId: context.user.id,
      action: 'UPDATE',
      entity: 'Lead',
      entityId: updatedLead.id,
      metadata: { changes: validatedData },
    });

    if (existing.status !== 'QUALIFIED' && updatedLead.status === 'QUALIFIED') {
      await dispatchWorkflowTrigger(context.organization.id, 'LEAD_QUALIFIED', { leadId: updatedLead.id, ...updatedLead });
    }

    return NextResponse.json({ success: true, lead: updatedLead });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to update lead';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.LEADS_DELETE, orgIdHeader);

    const existing = await prisma.lead.findFirst({
      where: { id: params.id, organizationId: context.organization.id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Lead not found or access denied' }, { status: 404 });
    }

    await prisma.lead.delete({
      where: { id: params.id },
    });

    await recordAuditLog({
      organizationId: context.organization.id,
      userId: context.user.id,
      action: 'DELETE',
      entity: 'Lead',
      entityId: params.id,
    });

    return NextResponse.json({ success: true, message: 'Lead deleted successfully' });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to delete lead';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}
