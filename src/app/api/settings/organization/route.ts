import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.SETTINGS_VIEW, orgIdHeader);

    const organization = await prisma.organization.findUnique({
      where: { id: context.organization.id },
      include: {
        memberships: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
            role: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, organization });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch settings';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.SETTINGS_MANAGE, orgIdHeader);

    const body = await req.json();

    const updatedOrg = await prisma.organization.update({
      where: { id: context.organization.id },
      data: {
        name: body.name,
        industry: body.industry,
        phone: body.phone,
        email: body.email,
        website: body.website,
        address: body.address,
        country: body.country,
        timezone: body.timezone,
        currency: body.currency,
      },
    });

    await recordAuditLog({
      organizationId: context.organization.id,
      userId: context.user.id,
      action: 'UPDATE',
      entity: 'OrganizationSettings',
      entityId: updatedOrg.id,
      metadata: { name: updatedOrg.name },
    });

    return NextResponse.json({ success: true, organization: updatedOrg });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to update organization';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}
