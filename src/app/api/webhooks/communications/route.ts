import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { recordAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { safeJsonParse } from '@/lib/utils/json';

const webhookPayloadSchema = z.object({
  provider: z.string(),
  externalMessageId: z.string(),
  conversationExternalId: z.string().optional(),
  channel: z.enum(['EMAIL', 'WHATSAPP', 'SMS']),
  direction: z.enum(['INBOUND', 'OUTBOUND']),
  content: z.string(),
  senderAddress: z.string().optional(),
  recipientAddress: z.string().optional(),
  status: z.enum(['SENT', 'DELIVERED', 'READ', 'FAILED']).optional(),
  timestamp: z.string().optional(),
});

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  if (!payload || !signature || !secret) return false;
  try {
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const payloadText = await req.text();
    const signature = req.headers.get('x-webhook-signature') || '';
    const secret = process.env.WEBHOOK_SECRET || '';

    if (secret && !verifyWebhookSignature(payloadText, signature, secret)) {
      return new NextResponse('Invalid signature', { status: 401 });
    }

    const parsedBody = safeJsonParse(payloadText);
    const validationResult = webhookPayloadSchema.safeParse(parsedBody);

    if (!validationResult.success) {
      return new NextResponse('Invalid payload', { status: 400 });
    }

    const payload = validationResult.data;

    // Check Idempotency
    const existingMessage = await prisma.communicationMessage.findFirst({
      where: { externalMessageId: payload.externalMessageId }
    });

    if (existingMessage) {
      return NextResponse.json({ success: true, message: 'Message already processed' });
    }

    // Resolve conversation (assuming conversationExternalId maps to a thread or similar, or finding a recent active one)
    let conversationId = '';
    let organizationId = '';
    let userId = null;

    if (payload.conversationExternalId) {
      const conv = await prisma.communicationConversation.findFirst({
        where: { externalThreadId: payload.conversationExternalId }
      });
      if (conv) {
        conversationId = conv.id;
        organizationId = conv.organizationId;
        // In this basic version, we assume user is lead/contact owner or we fallback to system
      }
    }

    // Fallback: finding conversation by sender/recipient
    if (!conversationId && payload.senderAddress && payload.direction === 'INBOUND') {
      const conv = await prisma.communicationConversation.findFirst({
        where: {
          channel: payload.channel,
          OR: [
            { lead: { email: payload.senderAddress } },
            { contact: { email: payload.senderAddress } },
            { lead: { phone: payload.senderAddress } },
            { contact: { phone: payload.senderAddress } },
          ]
        },
        orderBy: { updatedAt: 'desc' }
      });
      
      if (conv) {
        conversationId = conv.id;
        organizationId = conv.organizationId;
      }
    }

    if (!organizationId || !conversationId) {
      // If we still don't have a conversation, log and skip (or create a new unassigned conversation in a real app)
      return NextResponse.json({ success: true, message: 'Unmatched conversation' });
    }

    // Create Message
    const message = await prisma.communicationMessage.create({
      data: {
        organizationId,
        conversationId,
        direction: payload.direction,
        senderType: payload.direction === 'INBOUND' ? 'CONTACT' : 'USER', // simplified
        content: payload.content,
        externalMessageId: payload.externalMessageId,
        provider: payload.provider,
        senderAddress: payload.senderAddress,
        recipientAddress: payload.recipientAddress,
        status: payload.status || (payload.direction === 'INBOUND' ? 'DELIVERED' : 'SENT'),
      }
    });

    // Update conversation
    await prisma.communicationConversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        unreadCount: payload.direction === 'INBOUND' ? { increment: 1 } : undefined,
      }
    });

    // Notify owner (simplified)
    const convOwnerInfo = await prisma.communicationConversation.findUnique({
      where: { id: conversationId },
      include: {
        lead: true,
        contact: true
      }
    });
    
    const ownerId = convOwnerInfo?.lead?.ownerId || convOwnerInfo?.contact?.ownerId;
    if (ownerId && payload.direction === 'INBOUND') {
      await prisma.notification.create({
        data: {
          organizationId,
          userId: ownerId,
          title: 'New Message Received',
          message: `New message on channel ${payload.channel} from ${payload.senderAddress}`,
          link: `/communications/${conversationId}`
        }
      });
    }

    // Audit Log
    await recordAuditLog({
      organizationId,
      userId: ownerId || 'SYSTEM',
      action: 'INBOUND_MESSAGE_RECEIVED',
      entity: 'CommunicationMessage',
      entityId: message.id,
      metadata: { externalId: payload.externalMessageId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing failed:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
