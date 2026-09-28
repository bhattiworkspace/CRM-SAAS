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
