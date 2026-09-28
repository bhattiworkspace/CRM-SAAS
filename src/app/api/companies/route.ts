import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { companySchema } from '@/lib/validations/company';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.COMPANIES_VIEW, orgIdHeader);

    const search = searchParams.get('search');
    const industry = searchParams.get('industry');

    const where: Record<string, unknown> = {
      organizationId: context.organization.id,
    };

    if (industry) where.industry = industry;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { domain: { contains: search } },
        { website: { contains: search } },
      ];
    }

    const companies = await prisma.company.findMany({
      where,
      include: {
        _count: {
          select: { contacts: true, deals: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, companies });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch companies';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.COMPANIES_CREATE, orgIdHeader);

    const body = await req.json();
    const validatedData = companySchema.parse(body);

    const company = await prisma.company.create({
      data: {
        ...validatedData,
        organizationId: context.organization.id,
      },
    });

    await recordAuditLog({
      organizationId: context.organization.id,
      userId: context.user.id,
      action: 'CREATE',
      entity: 'Company',
      entityId: company.id,
      metadata: { name: company.name },
    });

    return NextResponse.json({ success: true, company }, { status: 201 });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to create company';
    return NextResponse.json({ success: false, error: errMessage }, { status: 400 });
  }
}
