import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { aiMessageSchema } from '@/lib/validations/ai';
import { getAiProvider } from '@/lib/services/ai-provider';
import { recordUsage, canUseFeature } from '@/lib/services/entitlements';
import { recordAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.AI_USE, orgIdHeader);

    const allowed = await canUseFeature(context.organization.id, 'AI');
    if (!allowed) {
      return NextResponse.json({ success: false, error: 'AI entitlement not active' }, { status: 403 });
    }

    const conversation = await prisma.aiConversation.findFirst({
      where: { id: params.id, organizationId: context.organization.id }
    });
    if (!conversation) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const body = await req.json();
    const validated = aiMessageSchema.parse(body);

    const userMessage = await prisma.aiMessage.create({
      data: {
        conversationId: params.id,
        role: 'USER',
        content: validated.content
      }
    });

    const ai = getAiProvider();
    const aiResponse = await ai.generateText({ prompt: validated.content });

    const assistantMessage = await prisma.aiMessage.create({
      data: {
        conversationId: params.id,
        role: 'ASSISTANT',
        content: aiResponse.content,
        provider: aiResponse.provider,
        model: aiResponse.model,
        generatedAt: aiResponse.generatedAt
      }
    });

    await prisma.aiConversation.update({
      where: { id: params.id },
      data: { updatedAt: new Date() }
    });

    await recordUsage(context.organization.id, 'AI_REQUEST', 1);
    
    await recordAuditLog({
      organizationId: context.organization.id,
      userId: context.user.id,
      action: AUDIT_ACTIONS.AI_GENERATION,
      entity: 'AiConversation',
      entityId: params.id,
      metadata: { messageId: assistantMessage.id }
    });

    return NextResponse.json({ success: true, data: [userMessage, assistantMessage] }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}
