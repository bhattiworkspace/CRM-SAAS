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
          createdById: context.user.id,
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
