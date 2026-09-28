import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { messageSchema } from '@/lib/validations/communication';
import { getEmailProvider } from '@/lib/services/email-provider';
import { getWhatsAppProvider } from '@/lib/services/whatsapp-provider';
import { getSmsProvider } from '@/lib/services/sms-provider';
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
      return NextResponse.json({ success: false, error: `${conversation.channel} entitlement not active` }, { status: 403 });
    }

    // Checking consent logic would go here
    
    const body = await req.json();
    const validated = messageSchema.parse(body);

    if (!validated.recipientAddress) {
      return NextResponse.json({ success: false, error: 'Recipient address is required' }, { status: 400 });
    }

    const message = await prisma.communicationMessage.create({
      data: {
        organizationId: context.organization.id,
        conversationId: params.id,
        direction: 'OUTBOUND',
        senderType: 'USER',
        senderUserId: context.user.id,
        recipientAddress: validated.recipientAddress,
        content: validated.content,
        status: 'PENDING'
      }
    });

    let resultStatus = 'FAILED';
    if (conversation.channel === 'EMAIL') {
      const provider = getEmailProvider();
      await provider.sendEmail({ to: validated.recipientAddress, from: 'system@crm.example.com', subject: 'Message', body: validated.content });
      resultStatus = 'SENT';
    } else if (conversation.channel === 'WHATSAPP') {
      const provider = getWhatsAppProvider();
      await provider.sendMessage({ to: validated.recipientAddress, content: validated.content });
      resultStatus = 'SENT';
    } else if (conversation.channel === 'SMS') {
      const provider = getSmsProvider();
      await provider.sendSms({ to: validated.recipientAddress, from: 'CRM_SYSTEM', body: validated.content });
      resultStatus = 'SENT';
    }

    const updatedMessage = await prisma.communicationMessage.update({
      where: { id: message.id },
      data: { status: resultStatus as any }
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
