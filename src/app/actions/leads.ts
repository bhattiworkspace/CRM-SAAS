'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { recordAuditLog } from '@/lib/audit';

export async function updateLeadStatusAction(leadId: string, status: string) {
  const context = await requireTenantPermission(PERMISSIONS.LEADS_UPDATE);
  if (!context) throw new Error('Unauthorized');

  const existing = await prisma.lead.findFirst({
    where: { id: leadId, organizationId: context.organization.id },
  });

  if (!existing) throw new Error('Lead not found');

  if (context.role.name === 'Sales Representative' && existing.ownerId !== context.user.id) {
    throw new Error('Unauthorized to update this lead');
  }

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
