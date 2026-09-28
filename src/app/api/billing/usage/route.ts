import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.BILLING_VIEW, orgIdHeader);

    const subscription = await prisma.subscription.findFirst({
      where: { organizationId: context.organization.id, status: 'ACTIVE' },
      include: { plan: { include: { entitlements: true } } }
    });

    if (!subscription) return NextResponse.json({ success: true, data: [] });

    const usageRecords = await prisma.usageRecord.groupBy({
      by: ['resourceType'],
      where: {
        organizationId: context.organization.id,
        createdAt: { gte: subscription.currentPeriodStart, lte: subscription.currentPeriodEnd }
      },
      _sum: { quantity: true }
    });

    const enrichedUsage = usageRecords.map(record => {
      let moduleCode = '';
      if (record.resourceType === 'AI_REQUEST') moduleCode = 'AI';
      else if (record.resourceType === 'EMAIL_SENT') moduleCode = 'EMAIL';
      else if (record.resourceType === 'SMS_SENT') moduleCode = 'SMS';
      else if (record.resourceType === 'WHATSAPP_MESSAGE') moduleCode = 'WHATSAPP';
      else if (record.resourceType === 'ENRICHMENT_REQUEST') moduleCode = 'ENRICHMENT';
      else if (record.resourceType === 'AUTOMATION_EXECUTION') moduleCode = 'AUTOMATION';

      const entitlement = subscription.plan.entitlements.find(e => e.moduleCode === moduleCode);
      return {
        resourceType: record.resourceType,
        used: record._sum.quantity || 0,
        limit: entitlement?.usageLimit || null
      };
    });

    return NextResponse.json({ success: true, data: enrichedUsage });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}
