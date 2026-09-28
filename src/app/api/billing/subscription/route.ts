import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { recordAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.BILLING_VIEW, orgIdHeader);

    const subscription = await prisma.subscription.findFirst({
      where: { organizationId: context.organization.id, status: 'ACTIVE' },
      include: { plan: { include: { entitlements: true } } }
    });

    return NextResponse.json({ success: true, data: subscription });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.BILLING_MANAGE, orgIdHeader);

    const body = await req.json();
    if (!body.planId) return NextResponse.json({ success: false, error: 'planId required' }, { status: 400 });

    // Explicitly reject direct plan changes from the client to prevent billing bypass
    // In a production environment, this should return a Checkout Session URL from Stripe/Braintree
    return NextResponse.json({ 
      success: false, 
      error: 'Plan upgrades require an authorized checkout session from the billing provider. Direct client plan modifications are disabled for security.' 
    }, { status: 403 });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}
