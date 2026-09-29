'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getTenantSession } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { recordAuditLog } from '@/lib/audit';

export async function updateLeadStatusAction(leadId: string, status: string) {
  const context = await getTenantSession();
  if (!context) throw new Error('Unauthorized');

  // Verify permission
  const hasPermission = context.user.memberships.some(
    m => m.organizationId === context.organization.id && 
         (m.role === 'OWNER' || m.role === 'ADMIN' || m.role === 'MANAGER' || m.role === 'MEMBER') // basic check, or we can just rely on the API logic
  );
  if (!hasPermission) throw new Error('Unauthorized');

  const existing = await prisma.lead.findFirst({
    where: { id: leadId, organizationId: context.organization.id },
  });

  if (!existing) throw new Error('Lead not found');

  const updatedLead = await prisma.lead.update({
    where: { id: leadId },
    data: { status },
  });

  await recordAuditLog({
    organizationId: context.organization.id,
    userId: context.user.id,
    action: 'UPDATE_STATUS',
    entity: 'Lead',
    entityId: updatedLead.id,
    metadata: { status: updatedLead.status },
  });

  revalidatePath('/dashboard');
  revalidatePath('/leads');
  revalidatePath(`/leads/${leadId}`);

  return { success: true };
}
