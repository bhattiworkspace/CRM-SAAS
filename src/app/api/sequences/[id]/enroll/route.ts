import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { enrollmentSchema } from '@/lib/validations/sequence';
import { recordAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.SEQUENCES_CREATE, orgIdHeader);

    const sequence = await prisma.sequence.findFirst({
      where: { id: params.id, organizationId: context.organization.id }
    });
    if (!sequence) return NextResponse.json({ success: false, error: 'Sequence not found' }, { status: 404 });

    const body = await req.json();
    const validated = enrollmentSchema.parse(body);

    if (!validated.leadId && !validated.contactId) {
       return NextResponse.json({ success: false, error: 'Must provide leadId or contactId' }, { status: 400 });
    }

    const dup = await prisma.sequenceEnrollment.findFirst({
      where: { sequenceId: params.id, leadId: validated.leadId || null, contactId: validated.contactId || null }
    });
    if (dup) {
      return NextResponse.json({ success: false, error: 'Already enrolled' }, { status: 400 });
    }

    const enrollment = await prisma.sequenceEnrollment.create({
      data: {
        organizationId: context.organization.id,
        sequenceId: params.id,
        leadId: validated.leadId || null,
        contactId: validated.contactId || null,
        status: 'ACTIVE',
        currentStepOrder: 0,
        enrolledAt: new Date()
      }
    });

    await recordAuditLog({
      organizationId: context.organization.id,
      userId: context.user.id,
      action: AUDIT_ACTIONS.SEQUENCE_STARTED,
      entity: 'SequenceEnrollment',
      entityId: enrollment.id,
    });

    return NextResponse.json({ success: true, data: enrollment }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}
