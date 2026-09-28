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
