import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { activitySchema } from '@/lib/validations/activity';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.ACTIVITIES_VIEW, orgIdHeader);

    const type = searchParams.get('type');

    const where: Record<string, unknown> = {
      organizationId: context.organization.id,
    };

    if (type) where.type = type;

    const activities = await prisma.activity.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true, email: true, image: true } },
        lead: { select: { id: true, firstName: true, lastName: true, companyName: true } },
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        deal: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ success: true, activities });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch activities';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.ACTIVITIES_CREATE, orgIdHeader);

    const body = await req.json();
    const validatedData = activitySchema.parse(body);

    const activity = await prisma.activity.create({
      data: {
        ...validatedData,
        organizationId: context.organization.id,
        createdById: context.user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });

    await recordAuditLog({
      organizationId: context.organization.id,
      userId: context.user.id,
      action: 'CREATE',
      entity: 'Activity',
      entityId: activity.id,
      metadata: { type: activity.type, title: activity.title },
    });

    return NextResponse.json({ success: true, activity }, { status: 201 });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to log activity';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}
