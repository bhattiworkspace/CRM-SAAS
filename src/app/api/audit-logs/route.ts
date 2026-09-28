import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.AUDIT_LOGS_VIEW, orgIdHeader);

    const logs = await prisma.auditLog.findMany({
      where: { organizationId: context.organization.id },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    return NextResponse.json({ success: true, logs });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch audit logs';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}
