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
