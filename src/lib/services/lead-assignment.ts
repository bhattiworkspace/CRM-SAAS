import { prisma } from '@/lib/prisma';
import { recordAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { logger } from '@/lib/utils/errors';

export async function assignLeadRoundRobin(
  organizationId: string,
  leadId: string
): Promise<string | null> {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId, organizationId },
    });

    if (!lead) return null;

    // Get all active memberships in the org with Sales Manager or Sales Rep roles
    const eligibleMemberships = await prisma.membership.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        role: {
          name: { in: ['Sales Manager', 'Sales Representative'] },
        },
      },
      include: {
        user: {
          include: {
            assignedLeads: {
              where: {
                organizationId,
                status: { notIn: ['WON', 'LOST'] },
              },
              select: { id: true },
            },
          },
        },
      },
    });

    if (eligibleMemberships.length === 0) {
      return null;
    }

    // Sort by fewest assigned leads
    eligibleMemberships.sort(
      (a, b) => a.user.assignedLeads.length - b.user.assignedLeads.length
    );

    const selectedUserId = eligibleMemberships[0].userId;

    await prisma.lead.update({
      where: { id: leadId, organizationId },
      data: { ownerId: selectedUserId },
    });

    await recordAuditLog({
      organizationId,
      userId: 'SYSTEM',
      action: AUDIT_ACTIONS.LEAD_ASSIGNED,
      entity: 'Lead',
      entityId: leadId,
      metadata: { ownerId: selectedUserId, method: 'ROUND_ROBIN' },
    });

    await prisma.notification.create({
      data: {
        organizationId,
        userId: selectedUserId,
        title: 'New Lead Assigned',
        message: `You have been automatically assigned a new lead: ${lead.firstName} ${lead.lastName}`,
        link: `/leads/${lead.id}`,
      },
    });

    return selectedUserId;
  } catch (error) {
    logger.error('Failed to assign lead round-robin', { error: error instanceof Error ? error.message : 'Unknown' });
    return null;
  }
}
