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
      return NextResponse.json({ success: false, error: `${validated.channel} entitlement not active` }, { status: 403 });
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
