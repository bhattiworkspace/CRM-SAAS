import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    await requireTenantPermission(PERMISSIONS.BILLING_VIEW, orgIdHeader);

    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      include: { entitlements: true }
    });

    return NextResponse.json({ success: true, data: plans });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}
