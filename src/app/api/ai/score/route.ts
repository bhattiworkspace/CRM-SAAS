import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { aiScoreSchema } from '@/lib/validations/ai';
import { getAiProvider } from '@/lib/services/ai-provider';
import { recordUsage } from '@/lib/services/entitlements';
import { recordAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.AI_USE, orgIdHeader);

    const body = await req.json();
    const validated = aiScoreSchema.parse(body);

    let entityData = null;
    let entityExists = false;
    if (validated.entityType === 'LEAD') {
      const lead = await prisma.lead.findFirst({ where: { id: validated.entityId, organizationId: context.organization.id } });
      if (lead) {
        entityExists = true;
        entityData = lead;
      }
    } else if (validated.entityType === 'DEAL') {
      const deal = await prisma.deal.findFirst({ where: { id: validated.entityId, organizationId: context.organization.id } });
      if (deal) {
        entityExists = true;
        entityData = deal;
      }
    } else if (validated.entityType === 'CONTACT') {
      const contact = await prisma.contact.findFirst({ where: { id: validated.entityId, organizationId: context.organization.id } });
      if (contact) {
        entityExists = true;
        entityData = contact;
      }
    }

    if (!entityExists || !entityData) {
      return NextResponse.json({ success: false, error: 'Entity not found or access denied' }, { status: 404 });
    }

    const ai = getAiProvider();
    const result = await ai.scoreLead({
      entityType: validated.entityType,
      entityData: entityData as Record<string, unknown>,
      scoringVersion: 'v1'
    });

    const scoreRecord = await prisma.aiScoreRecord.create({
      data: {
        organizationId: context.organization.id,
        entityType: validated.entityType,
        entityId: validated.entityId,
        score: result.score,
        explanation: result.explanation,
        provider: result.provider,
        model: result.model,
        scoringVersion: result.scoringVersion,
        generatedAt: result.generatedAt
      }
    });

    await recordUsage(context.organization.id, 'AI_REQUEST', 1);
    
    await recordAuditLog({
      organizationId: context.organization.id,
      userId: context.user.id,
      action: AUDIT_ACTIONS.AI_SCORE_GENERATED,
      entity: validated.entityType,
      entityId: validated.entityId,
      metadata: { score: result.score }
    });

    return NextResponse.json({ success: true, data: scoreRecord }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}
