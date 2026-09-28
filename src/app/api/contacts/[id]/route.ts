import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { contactSchema } from '@/lib/validations/contact';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.CONTACTS_VIEW, orgIdHeader);

    const contact = await prisma.contact.findFirst({
      where: {
        id: params.id,
        organizationId: context.organization.id,
      },
      include: {
        company: true,
        owner: { select: { id: true, name: true, email: true } },
        deals: { include: { stage: true } },
        activities: { orderBy: { createdAt: 'desc' }, include: { createdBy: { select: { id: true, name: true } } } },
        tasks: { orderBy: { createdAt: 'desc' }, include: { assignedTo: { select: { id: true, name: true } } } },
      },
    });

    if (!contact) {
      return NextResponse.json({ success: false, error: 'Contact not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ success: true, contact });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch contact';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.CONTACTS_UPDATE, orgIdHeader);

    const body = await req.json();
    const validatedData = contactSchema.parse(body);

    const existing = await prisma.contact.findFirst({
      where: { id: params.id, organizationId: context.organization.id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Contact not found or access denied' }, { status: 404 });
    }

    const updatedContact = await prisma.contact.update({
      where: { id: params.id },
      data: validatedData,
    });

    await recordAuditLog({
      organizationId: context.organization.id,
      userId: context.user.id,
      action: 'UPDATE',
      entity: 'Contact',
      entityId: updatedContact.id,
      metadata: { name: `${updatedContact.firstName} ${updatedContact.lastName}` },
    });

    return NextResponse.json({ success: true, contact: updatedContact });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to update contact';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.CONTACTS_DELETE, orgIdHeader);

    const existing = await prisma.contact.findFirst({
      where: { id: params.id, organizationId: context.organization.id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Contact not found or access denied' }, { status: 404 });
    }

    await prisma.contact.delete({
      where: { id: params.id },
    });

    await recordAuditLog({
      organizationId: context.organization.id,
      userId: context.user.id,
      action: 'DELETE',
      entity: 'Contact',
      entityId: params.id,
    });

    return NextResponse.json({ success: true, message: 'Contact deleted successfully' });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to delete contact';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}
