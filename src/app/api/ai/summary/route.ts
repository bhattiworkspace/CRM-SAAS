import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { aiSummarySchema } from '@/lib/validations/ai';
import { getAiProvider } from '@/lib/services/ai-provider';
import { recordUsage } from '@/lib/services/entitlements';
import { recordAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.AI_USE, orgIdHeader);

    const body = await req.json();
    const validated = aiSummarySchema.parse(body);

    let entityExists = false;
    let entityData: Record<string, unknown> | null = null;
    if (validated.entityType === 'LEAD') {
      const result = await prisma.lead.findFirst({ where: { id: validated.entityId, organizationId: context.organization.id } });
      if (result) {
        entityExists = true;
        entityData = result as unknown as Record<string, unknown>;
      }
    } else if (validated.entityType === 'DEAL') {
      const result = await prisma.deal.findFirst({ where: { id: validated.entityId, organizationId: context.organization.id } });
      if (result) {
        entityExists = true;
        entityData = result as unknown as Record<string, unknown>;
      }
    } else if (validated.entityType === 'CONTACT') {
      const result = await prisma.contact.findFirst({ where: { id: validated.entityId, organizationId: context.organization.id } });
      if (result) {
        entityExists = true;
        entityData = result as unknown as Record<string, unknown>;
      }
    } else if (validated.entityType === 'COMPANY') {
      const result = await prisma.company.findFirst({ where: { id: validated.entityId, organizationId: context.organization.id } });
      if (result) {
        entityExists = true;
        entityData = result as unknown as Record<string, unknown>;
      }
    }

    if (!entityExists || !entityData) {
      return NextResponse.json({ success: false, error: 'Entity not found or access denied' }, { status: 404 });
    }

    const ai = getAiProvider();
    const result = await ai.generateText({ prompt: 'Summarize this entity', context: entityData });

    const summaryRecord = await prisma.aiSummary.create({
      data: {
        organizationId: context.organization.id,
        entityType: validated.entityType,
        entityId: validated.entityId,
        summaryType: validated.summaryType || 'OVERVIEW',
        content: result.content,
        provider: result.provider,
        model: result.model,
        generatedAt: result.generatedAt
      }
    });

    await recordUsage(context.organization.id, 'AI_REQUEST', 1);
    
    await recordAuditLog({
      organizationId: context.organization.id,
      userId: context.user.id,
      action: AUDIT_ACTIONS.AI_GENERATION,
      entity: validated.entityType,
      entityId: validated.entityId,
    });

    return NextResponse.json({ success: true, data: summaryRecord }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}
