import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { enrollmentUpdateSchema } from '@/lib/validations/sequence';
import { recordAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export async function PUT(req: NextRequest, { params }: { params: { id: string, eid: string } }) {
  try {
    const orgIdHeader = req.headers.get('x-organization-id') || undefined;
    const context = await requireTenantPermission(PERMISSIONS.SEQUENCES_MANAGE, orgIdHeader);

    const enrollment = await prisma.sequenceEnrollment.findFirst({
      where: { id: params.eid, sequenceId: params.id, sequence: { organizationId: context.organization.id } }
    });
    if (!enrollment) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const body = await req.json();
    const validated = enrollmentUpdateSchema.parse(body);

    const updated = await prisma.sequenceEnrollment.update({
      where: { id: params.eid },
      data: { status: validated.status }
    });

    let action: string = AUDIT_ACTIONS.SEQUENCE_PAUSED;
    if (validated.status === 'COMPLETED') action = AUDIT_ACTIONS.SEQUENCE_COMPLETED;
    // other status maps...

    await recordAuditLog({
      organizationId: context.organization.id,
      userId: context.user.id,
      action,
      entity: 'SequenceEnrollment',
      entityId: params.eid,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 400 });
  }
}
