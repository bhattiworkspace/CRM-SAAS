import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { contactSchema } from '@/lib/validations/contact';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.CONTACTS_VIEW, orgIdHeader);

    const search = searchParams.get('search');
    const companyId = searchParams.get('companyId');

    const where: Record<string, unknown> = {
      organizationId: context.organization.id,
    };

    if (companyId) where.companyId = companyId;
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { title: { contains: search } },
      ];
    }

    const contacts = await prisma.contact.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, contacts });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch contacts';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.CONTACTS_CREATE, orgIdHeader);

    const body = await req.json();
    const validatedData = contactSchema.parse(body);

    const contact = await prisma.contact.create({
      data: {
        ...validatedData,
        organizationId: context.organization.id,
      },
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    await recordAuditLog({
      organizationId: context.organization.id,
      userId: context.user.id,
      action: 'CREATE',
      entity: 'Contact',
      entityId: contact.id,
      metadata: { name: `${contact.firstName} ${contact.lastName}` },
    });

    return NextResponse.json({ success: true, contact }, { status: 201 });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to create contact';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}
