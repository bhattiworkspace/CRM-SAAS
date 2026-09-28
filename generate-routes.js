const fs = require('fs');
const path = require('path');

const write = (filePath, content) => {
  const fullPath = path.join(__dirname, filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf-8');
  console.log('Created:', filePath);
};

write('src/lib/validations/ai.ts', `
import { z } from 'zod';

export const aiConversationSchema = z.object({
  title: z.string().optional(),
});

export const aiMessageSchema = z.object({
  content: z.string().min(1),
});

export const aiScoreSchema = z.object({
  entityType: z.enum(['LEAD', 'DEAL', 'CONTACT']),
  entityId: z.string(),
});

export const aiSummarySchema = z.object({
  entityType: z.enum(['LEAD', 'DEAL', 'CONTACT']),
  entityId: z.string(),
});
`);

write('src/lib/validations/communication.ts', `
import { z } from 'zod';

export const conversationSchema = z.object({
  channel: z.enum(['EMAIL', 'WHATSAPP', 'SMS']),
  contactId: z.string().optional(),
  leadId: z.string().optional(),
});

export const messageSchema = z.object({
  content: z.string().min(1),
});
`);

write('src/lib/validations/workflow.ts', `
import { z } from 'zod';

export const workflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  triggerType: z.string(),
  isActive: z.boolean().default(false),
  conditions: z.array(z.any()).optional(),
  actions: z.array(z.any()).optional(),
});

export const workflowUpdateSchema = workflowSchema.partial();
`);

write('src/lib/validations/sequence.ts', `
import { z } from 'zod';

export const sequenceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  steps: z.array(z.any()).optional(),
});

export const enrollmentSchema = z.object({
  leadId: z.string().optional(),
  contactId: z.string().optional(),
});

export const enrollmentUpdateSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'ERROR']),
});
`);

write('src/lib/validations/enrichment.ts', `
import { z } from 'zod';

export const companyEnrichmentSchema = z.object({
  domain: z.string().min(1),
});
`);

write('src/lib/services/ai-provider.ts', `
export function getAiProvider() {
  return {
    generateText: async (prompt: string, context: any) => {
      return {
        content: "[MOCK — Development AI] Generated response for: " + (prompt.substring(0, 20) || 'empty prompt'),
        provider: "mock",
        model: "mock-v1"
      };
    },
    scoreLead: async (entityData: any) => {
      return {
        score: Math.floor(Math.random() * 100),
        explanation: "[MOCK — Development AI] Simulated lead score reasoning.",
        provider: "mock",
        model: "mock-v1"
      };
    }
  };
}
`);

write('src/lib/services/communication-provider.ts', `
export function getCommunicationProvider(channel: string) {
  return {
    sendMessage: async (content: string, recipientInfo: any) => {
      return {
        success: true,
        provider: "mock",
        messageId: "mock-" + Date.now(),
        status: "SENT"
      };
    }
  };
}
`);

write('src/lib/services/enrichment-provider.ts', `
export function getEnrichmentProvider() {
  return {
    enrichCompany: async (domain: string) => {
      return {
        name: domain.split('.')[0],
        domain: domain,
        industry: "[MOCK — Development AI] Software",
        employees: "50-200",
        provider: "mock"
      };
    }
  };
}
`);

// ==========================================
// 1. AI Routes
// ==========================================
write('src/app/api/ai/conversations/route.ts', `
import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { aiConversationSchema } from '@/lib/validations/ai';
import { canUseFeature } from '@/lib/services/entitlements';

export async function GET(req: NextRequest) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.AI_VIEW, orgIdHeader);

    const conversations = await prisma.aiConversation.findMany({
      where: { organizationId: context.organization.id },
      include: {
        _count: {
          select: { messages: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: conversations });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.AI_USE, orgIdHeader);

    const allowed = await canUseFeature(context.organization.id, 'AI');
    if (!allowed) {
      return NextResponse.json({ success: false, error: 'AI entitlement not active' }, { status: 403 });
    }

    const body = await req.json();
    const validated = aiConversationSchema.parse(body);

    const conversation = await prisma.aiConversation.create({
      data: {
        organizationId: context.organization.id,
        userId: context.user.id,
        title: validated.title || 'New Conversation'
      }
    });

    return NextResponse.json({ success: true, data: conversation }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}
`);

write('src/app/api/ai/conversations/[id]/route.ts', `
import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.AI_VIEW, orgIdHeader);

    const conversation = await prisma.aiConversation.findFirst({
      where: { id: params.id, organizationId: context.organization.id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } }
      }
    });

    if (!conversation) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: conversation });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}
`);

write('src/app/api/ai/conversations/[id]/messages/route.ts', `
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
    const aiResponse = await ai.generateText(validated.content, {});

    const assistantMessage = await prisma.aiMessage.create({
      data: {
        conversationId: params.id,
        role: 'ASSISTANT',
        content: aiResponse.content,
        metadata: JSON.stringify({ provider: aiResponse.provider, model: aiResponse.model })
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
`);

write('src/app/api/ai/score/route.ts', `
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

    let entityExists = false;
    if (validated.entityType === 'LEAD') {
      const lead = await prisma.lead.findFirst({ where: { id: validated.entityId, organizationId: context.organization.id } });
      if (lead) entityExists = true;
    } else if (validated.entityType === 'DEAL') {
      const deal = await prisma.deal.findFirst({ where: { id: validated.entityId, organizationId: context.organization.id } });
      if (deal) entityExists = true;
    } else if (validated.entityType === 'CONTACT') {
      const contact = await prisma.contact.findFirst({ where: { id: validated.entityId, organizationId: context.organization.id } });
      if (contact) entityExists = true;
    }

    if (!entityExists) {
      return NextResponse.json({ success: false, error: 'Entity not found or access denied' }, { status: 404 });
    }

    const ai = getAiProvider();
    const result = await ai.scoreLead({});

    const scoreRecord = await prisma.aiScore.create({
      data: {
        organizationId: context.organization.id,
        entityType: validated.entityType,
        entityId: validated.entityId,
        score: result.score,
        factors: JSON.stringify({ explanation: result.explanation }),
        provider: result.provider
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
`);

write('src/app/api/ai/summary/route.ts', `
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
    let entityData = null;
    if (validated.entityType === 'LEAD') {
      entityData = await prisma.lead.findFirst({ where: { id: validated.entityId, organizationId: context.organization.id } });
      if (entityData) entityExists = true;
    } else if (validated.entityType === 'DEAL') {
      entityData = await prisma.deal.findFirst({ where: { id: validated.entityId, organizationId: context.organization.id } });
      if (entityData) entityExists = true;
    } else if (validated.entityType === 'CONTACT') {
      entityData = await prisma.contact.findFirst({ where: { id: validated.entityId, organizationId: context.organization.id } });
      if (entityData) entityExists = true;
    }

    if (!entityExists) {
      return NextResponse.json({ success: false, error: 'Entity not found or access denied' }, { status: 404 });
    }

    const ai = getAiProvider();
    const result = await ai.generateText('Summarize this entity', entityData);

    const summaryRecord = await prisma.aiSummary.create({
      data: {
        organizationId: context.organization.id,
        entityType: validated.entityType,
        entityId: validated.entityId,
        content: result.content,
        provider: result.provider
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
`);

// ==========================================
// 2. Communications Routes
// ==========================================
write('src/app/api/communications/conversations/route.ts', `
import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { conversationSchema } from '@/lib/validations/communication';
import { canUseFeature } from '@/lib/services/entitlements';

export async function GET(req: NextRequest) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.COMMUNICATIONS_VIEW, orgIdHeader);

    const conversations = await prisma.communicationConversation.findMany({
      where: { organizationId: context.organization.id },
      orderBy: { lastMessageAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: conversations });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.COMMUNICATIONS_SEND, orgIdHeader);

    const body = await req.json();
    const validated = conversationSchema.parse(body);

    const allowed = await canUseFeature(context.organization.id, validated.channel as any);
    if (!allowed) {
      return NextResponse.json({ success: false, error: \`\${validated.channel} entitlement not active\` }, { status: 403 });
    }

    const conversation = await prisma.communicationConversation.create({
      data: {
        organizationId: context.organization.id,
        channel: validated.channel,
        contactId: validated.contactId || null,
        leadId: validated.leadId || null,
        lastMessageAt: new Date()
      }
    });

    return NextResponse.json({ success: true, data: conversation }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}
`);

write('src/app/api/communications/conversations/[id]/route.ts', `
import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.COMMUNICATIONS_VIEW, orgIdHeader);

    const conversation = await prisma.communicationConversation.findFirst({
      where: { id: params.id, organizationId: context.organization.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });

    if (!conversation) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: conversation });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}
`);

write('src/app/api/communications/conversations/[id]/messages/route.ts', `
import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { messageSchema } from '@/lib/validations/communication';
import { getCommunicationProvider } from '@/lib/services/communication-provider';
import { recordUsage, canUseFeature } from '@/lib/services/entitlements';
import { recordAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.COMMUNICATIONS_VIEW, orgIdHeader);

    const conversation = await prisma.communicationConversation.findFirst({
      where: { id: params.id, organizationId: context.organization.id }
    });
    if (!conversation) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const messages = await prisma.communicationMessage.findMany({
      where: { conversationId: params.id },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ success: true, data: messages });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.COMMUNICATIONS_SEND, orgIdHeader);

    const conversation = await prisma.communicationConversation.findFirst({
      where: { id: params.id, organizationId: context.organization.id }
    });
    if (!conversation) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const allowed = await canUseFeature(context.organization.id, conversation.channel as any);
    if (!allowed) {
      return NextResponse.json({ success: false, error: \`\${conversation.channel} entitlement not active\` }, { status: 403 });
    }

    // Checking consent logic would go here
    
    const body = await req.json();
    const validated = messageSchema.parse(body);

    const message = await prisma.communicationMessage.create({
      data: {
        conversationId: params.id,
        direction: 'OUTBOUND',
        status: 'PENDING',
        content: validated.content
      }
    });

    const provider = getCommunicationProvider(conversation.channel);
    const result = await provider.sendMessage(validated.content, {});

    const updatedMessage = await prisma.communicationMessage.update({
      where: { id: message.id },
      data: { status: result.status }
    });

    await prisma.communicationConversation.update({
      where: { id: params.id },
      data: { lastMessageAt: new Date() }
    });

    let resourceType: any = null;
    if (conversation.channel === 'EMAIL') resourceType = 'EMAIL_SENT';
    if (conversation.channel === 'SMS') resourceType = 'SMS_SENT';
    if (conversation.channel === 'WHATSAPP') resourceType = 'WHATSAPP_MESSAGE';
    
    if (resourceType) {
      await recordUsage(context.organization.id, resourceType, 1);
    }
    
    await recordAuditLog({
      organizationId: context.organization.id,
      userId: context.user.id,
      action: AUDIT_ACTIONS.MESSAGE_SENT,
      entity: 'CommunicationConversation',
      entityId: params.id,
    });

    return NextResponse.json({ success: true, data: updatedMessage }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}
`);

// ==========================================
// 3. Workflow Routes
// ==========================================
write('src/app/api/workflows/route.ts', `
import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { workflowSchema } from '@/lib/validations/workflow';
import { canUseFeature } from '@/lib/services/entitlements';

export async function GET(req: NextRequest) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.WORKFLOWS_VIEW, orgIdHeader);

    const workflows = await prisma.workflow.findMany({
      where: { organizationId: context.organization.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: workflows });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.WORKFLOWS_CREATE, orgIdHeader);

    const allowed = await canUseFeature(context.organization.id, 'AUTOMATION');
    if (!allowed) return NextResponse.json({ success: false, error: 'AUTOMATION entitlement not active' }, { status: 403 });

    const body = await req.json();
    const validated = workflowSchema.parse(body);

    const workflow = await prisma.$transaction(async (tx) => {
      const wf = await tx.workflow.create({
        data: {
          organizationId: context.organization.id,
          name: validated.name,
          description: validated.description,
          triggerType: validated.triggerType,
          isActive: validated.isActive,
        }
      });
      
      if (validated.conditions && validated.conditions.length > 0) {
        await Promise.all(validated.conditions.map((cond: any) => 
          tx.workflowCondition.create({ data: { ...cond, workflowId: wf.id } })
        ));
      }
      
      if (validated.actions && validated.actions.length > 0) {
        await Promise.all(validated.actions.map((act: any, idx: number) => 
          tx.workflowAction.create({ data: { ...act, workflowId: wf.id, order: idx } })
        ));
      }
      
      return tx.workflow.findUnique({ where: { id: wf.id }, include: { conditions: true, actions: true } });
    });

    return NextResponse.json({ success: true, data: workflow }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}
`);

write('src/app/api/workflows/[id]/route.ts', `
import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { workflowUpdateSchema } from '@/lib/validations/workflow';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.WORKFLOWS_VIEW, orgIdHeader);

    const workflow = await prisma.workflow.findFirst({
      where: { id: params.id, organizationId: context.organization.id },
      include: { conditions: true, actions: { orderBy: { order: 'asc' } }, executions: { take: 10, orderBy: { startedAt: 'desc' } } }
    });

    if (!workflow) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: workflow });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.WORKFLOWS_MANAGE, orgIdHeader);

    const body = await req.json();
    const validated = workflowUpdateSchema.parse(body);

    const workflow = await prisma.workflow.findFirst({
      where: { id: params.id, organizationId: context.organization.id }
    });
    if (!workflow) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const updated = await prisma.$transaction(async (tx) => {
      const updateData: any = {};
      if (validated.name !== undefined) updateData.name = validated.name;
      if (validated.description !== undefined) updateData.description = validated.description;
      if (validated.triggerType !== undefined) updateData.triggerType = validated.triggerType;
      if (validated.isActive !== undefined) updateData.isActive = validated.isActive;

      await tx.workflow.update({ where: { id: params.id }, data: updateData });

      if (validated.conditions) {
        await tx.workflowCondition.deleteMany({ where: { workflowId: params.id } });
        await Promise.all(validated.conditions.map((cond: any) => 
          tx.workflowCondition.create({ data: { ...cond, workflowId: params.id } })
        ));
      }

      if (validated.actions) {
        await tx.workflowAction.deleteMany({ where: { workflowId: params.id } });
        await Promise.all(validated.actions.map((act: any, idx: number) => 
          tx.workflowAction.create({ data: { ...act, workflowId: params.id, order: idx } })
        ));
      }

      return tx.workflow.findUnique({ where: { id: params.id }, include: { conditions: true, actions: { orderBy: { order: 'asc' } } } });
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.WORKFLOWS_MANAGE, orgIdHeader);

    const workflow = await prisma.workflow.findFirst({
      where: { id: params.id, organizationId: context.organization.id }
    });
    if (!workflow) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    await prisma.workflow.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true, message: 'Deleted' });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}
`);

// ==========================================
// 4. Sequence Routes
// ==========================================
write('src/app/api/sequences/route.ts', `
import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { sequenceSchema } from '@/lib/validations/sequence';
import { canUseFeature } from '@/lib/services/entitlements';

export async function GET(req: NextRequest) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.SEQUENCES_VIEW, orgIdHeader);

    const sequences = await prisma.sequence.findMany({
      where: { organizationId: context.organization.id },
      include: {
        _count: { select: { steps: true, enrollments: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: sequences });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.SEQUENCES_CREATE, orgIdHeader);

    const allowed = await canUseFeature(context.organization.id, 'AUTOMATION');
    if (!allowed) return NextResponse.json({ success: false, error: 'AUTOMATION entitlement not active' }, { status: 403 });

    const body = await req.json();
    const validated = sequenceSchema.parse(body);

    const sequence = await prisma.$transaction(async (tx) => {
      const seq = await tx.sequence.create({
        data: {
          organizationId: context.organization.id,
          name: validated.name,
          description: validated.description,
        }
      });
      
      if (validated.steps && validated.steps.length > 0) {
        await Promise.all(validated.steps.map((step: any, idx: number) => 
          tx.sequenceStep.create({ data: { ...step, sequenceId: seq.id, order: idx } })
        ));
      }
      
      return tx.sequence.findUnique({ where: { id: seq.id }, include: { steps: { orderBy: { order: 'asc' } } } });
    });

    return NextResponse.json({ success: true, data: sequence }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}
`);

write('src/app/api/sequences/[id]/route.ts', `
import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { sequenceSchema } from '@/lib/validations/sequence';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.SEQUENCES_VIEW, orgIdHeader);

    const sequence = await prisma.sequence.findFirst({
      where: { id: params.id, organizationId: context.organization.id },
      include: { steps: { orderBy: { order: 'asc' } }, enrollments: { take: 20, orderBy: { enrolledAt: 'desc' } } }
    });

    if (!sequence) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: sequence });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.SEQUENCES_MANAGE, orgIdHeader);

    const body = await req.json();
    const validated = sequenceSchema.parse(body);

    const seq = await prisma.sequence.findFirst({
      where: { id: params.id, organizationId: context.organization.id }
    });
    if (!seq) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const updated = await prisma.$transaction(async (tx) => {
      await tx.sequence.update({ where: { id: params.id }, data: { name: validated.name, description: validated.description } });

      if (validated.steps) {
        await tx.sequenceStep.deleteMany({ where: { sequenceId: params.id } });
        await Promise.all(validated.steps.map((step: any, idx: number) => 
          tx.sequenceStep.create({ data: { ...step, sequenceId: params.id, order: idx } })
        ));
      }
      return tx.sequence.findUnique({ where: { id: params.id }, include: { steps: { orderBy: { order: 'asc' } } } });
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.SEQUENCES_MANAGE, orgIdHeader);

    const seq = await prisma.sequence.findFirst({
      where: { id: params.id, organizationId: context.organization.id }
    });
    if (!seq) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    await prisma.sequence.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true, message: 'Deleted' });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}
`);

write('src/app/api/sequences/[id]/enroll/route.ts', `
import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { enrollmentSchema } from '@/lib/validations/sequence';
import { recordAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.SEQUENCES_CREATE, orgIdHeader);

    const sequence = await prisma.sequence.findFirst({
      where: { id: params.id, organizationId: context.organization.id }
    });
    if (!sequence) return NextResponse.json({ success: false, error: 'Sequence not found' }, { status: 404 });

    const body = await req.json();
    const validated = enrollmentSchema.parse(body);

    if (!validated.leadId && !validated.contactId) {
       return NextResponse.json({ success: false, error: 'Must provide leadId or contactId' }, { status: 400 });
    }

    const dup = await prisma.sequenceEnrollment.findFirst({
      where: { sequenceId: params.id, leadId: validated.leadId || null, contactId: validated.contactId || null }
    });
    if (dup) {
      return NextResponse.json({ success: false, error: 'Already enrolled' }, { status: 400 });
    }

    const enrollment = await prisma.sequenceEnrollment.create({
      data: {
        sequenceId: params.id,
        leadId: validated.leadId || null,
        contactId: validated.contactId || null,
        status: 'ACTIVE',
        currentStepOrder: 0
      }
    });

    await recordAuditLog({
      organizationId: context.organization.id,
      userId: context.user.id,
      action: AUDIT_ACTIONS.SEQUENCE_STARTED,
      entity: 'SequenceEnrollment',
      entityId: enrollment.id,
    });

    return NextResponse.json({ success: true, data: enrollment }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}
`);

write('src/app/api/sequences/[id]/enrollments/[eid]/route.ts', `
import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { enrollmentUpdateSchema } from '@/lib/validations/sequence';
import { recordAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export async function PUT(req: NextRequest, { params }: { params: { id: string, eid: string } }) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.SEQUENCES_MANAGE, orgIdHeader);

    const enrollment = await prisma.sequenceEnrollment.findFirst({
      where: { id: params.eid, sequenceId: params.id, sequence: { organizationId: context.organization.id } }
    });
    if (!enrollment) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const body = await req.json();
    const validated = enrollmentUpdateSchema.parse(body);

    const updated = await prisma.sequenceEnrollment.update({
      where: { id: params.eid },
      data: { status: validated.status }
    });

    let action = AUDIT_ACTIONS.SEQUENCE_PAUSED;
    if (validated.status === 'COMPLETED') action = AUDIT_ACTIONS.SEQUENCE_COMPLETED;
    // other status maps...

    await recordAuditLog({
      organizationId: context.organization.id,
      userId: context.user.id,
      action,
      entity: 'SequenceEnrollment',
      entityId: params.eid,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}
`);

// ==========================================
// 5. Billing Routes
// ==========================================
write('src/app/api/billing/plans/route.ts', `
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
`);

write('src/app/api/billing/subscription/route.ts', `
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

    const subscription = await prisma.subscription.findFirst({
      where: { organizationId: context.organization.id, status: 'ACTIVE' }
    });
    if (!subscription) return NextResponse.json({ success: false, error: 'No active subscription found' }, { status: 404 });

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { planId: body.planId }
    });

    await prisma.billingEvent.create({
      data: {
        organizationId: context.organization.id,
        eventType: 'PLAN_CHANGED',
        description: \`Changed to plan \${body.planId}\`,
        metadata: JSON.stringify({ oldPlan: subscription.planId, newPlan: body.planId })
      }
    });

    await recordAuditLog({
      organizationId: context.organization.id,
      userId: context.user.id,
      action: AUDIT_ACTIONS.PLAN_CHANGED,
      entity: 'Subscription',
      entityId: updated.id,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}
`);

write('src/app/api/billing/usage/route.ts', `
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
`);

// ==========================================
// 6. Enrichment Routes
// ==========================================
write('src/app/api/enrichment/company/route.ts', `
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
`);

// ==========================================
// 7. Notifications Routes
// ==========================================
write('src/app/api/notifications/route.ts', `
import { NextRequest, NextResponse } from 'next/server';
import { getTenantSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await getTenantSession(orgIdHeader);
    if (!context) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const notifications = await prisma.notification.findMany({
      where: { organizationId: context.organization.id, userId: context.user.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: notifications });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await getTenantSession(orgIdHeader);
    if (!context) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    
    if (body.all) {
      await prisma.notification.updateMany({
        where: { organizationId: context.organization.id, userId: context.user.id, isRead: false },
        data: { isRead: true }
      });
    } else if (body.ids && Array.isArray(body.ids)) {
      await prisma.notification.updateMany({
        where: { organizationId: context.organization.id, userId: context.user.id, id: { in: body.ids } },
        data: { isRead: true }
      });
    }

    return NextResponse.json({ success: true, message: 'Updated' });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}
`);
