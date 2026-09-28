import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { companyEnrichmentSchema } from '@/lib/validations/enrichment';
import { getEnrichmentProvider } from '@/lib/services/enrichment-provider';
import { recordUsage, canUseFeature } from '@/lib/services/entitlements';
import { recordAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.ENRICHMENT_USE, orgIdHeader);

    const allowed = await canUseFeature(context.organization.id, 'ENRICHMENT');
    if (!allowed) return NextResponse.json({ success: false, error: 'ENRICHMENT entitlement not active' }, { status: 403 });

    const body = await req.json();
    const validated = companyEnrichmentSchema.parse(body);

    const provider = getEnrichmentProvider();
    const data = await provider.enrichCompany(validated.domain);

    await recordUsage(context.organization.id, 'ENRICHMENT_REQUEST', 1);

    await recordAuditLog({
      organizationId: context.organization.id,
      userId: context.user.id,
      action: AUDIT_ACTIONS.ENRICHMENT_COMPLETED,
      entity: 'Enrichment',
      metadata: { domain: validated.domain }
    });

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}
