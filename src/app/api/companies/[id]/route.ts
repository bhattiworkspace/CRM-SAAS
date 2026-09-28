import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { companySchema } from '@/lib/validations/company';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.COMPANIES_VIEW, orgIdHeader);

    const company = await prisma.company.findFirst({
      where: {
        id: params.id,
        organizationId: context.organization.id,
      },
      include: {
        contacts: {
          orderBy: { createdAt: 'desc' },
          include: { owner: { select: { id: true, name: true } } },
        },
        deals: {
          orderBy: { createdAt: 'desc' },
          include: { stage: true, owner: { select: { id: true, name: true } } },
        },
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

    if (!company) {
      return NextResponse.json({ success: false, error: 'Company not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ success: true, company });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch company';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.COMPANIES_UPDATE, orgIdHeader);

    const body = await req.json();
    const validatedData = companySchema.parse(body);

    const existing = await prisma.company.findFirst({
      where: { id: params.id, organizationId: context.organization.id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Company not found or access denied' }, { status: 404 });
    }

    const updatedCompany = await prisma.company.update({
      where: { id: params.id },
      data: validatedData,
    });

    await recordAuditLog({
      organizationId: context.organization.id,
      userId: context.user.id,
      action: 'UPDATE',
      entity: 'Company',
      entityId: updatedCompany.id,
      metadata: { name: updatedCompany.name },
    });

    return NextResponse.json({ success: true, company: updatedCompany });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to update company';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.COMPANIES_DELETE, orgIdHeader);

    const existing = await prisma.company.findFirst({
      where: { id: params.id, organizationId: context.organization.id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Company not found or access denied' }, { status: 404 });
    }

    await prisma.company.delete({
      where: { id: params.id },
    });

    await recordAuditLog({
      organizationId: context.organization.id,
      userId: context.user.id,
      action: 'DELETE',
      entity: 'Company',
      entityId: params.id,
    });

    return NextResponse.json({ success: true, message: 'Company deleted successfully' });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to delete company';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}
