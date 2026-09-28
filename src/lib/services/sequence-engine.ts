import { prisma } from '@/lib/prisma';
import { safeJsonParse } from '@/lib/utils/json';
import { logger } from '@/lib/utils/errors';
import { getEmailProvider } from './email-provider';
import { getWhatsAppProvider } from './whatsapp-provider';
import { getSmsProvider } from './sms-provider';
import { jobService } from '@/lib/jobs';
import { recordAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { checkUsageLimit, recordUsage } from './entitlements';

export async function checkCommunicationConsent(
  organizationId: string,
  contactId: string | null,
  leadId: string | null,
  channel: string
): Promise<boolean> {
  const whereClause: any = { organizationId, channel };
  if (contactId) {
    whereClause.contactId = contactId;
  } else if (leadId) {
    whereClause.leadId = leadId;
  } else {
    return false;
  }

  const consent = await prisma.communicationConsent.findFirst({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
  });

  if (!consent) {
    return false;
  }
  return consent.status === 'GRANTED';
}

export async function executeSequenceStep(
  enrollmentId: string,
  organizationId: string
): Promise<void> {
  try {
    const enrollment = await prisma.sequenceEnrollment.findUnique({
      where: { id: enrollmentId, organizationId },
      include: {
        sequence: {
          include: {
            steps: { orderBy: { order: 'asc' } },
          },
        },
        lead: true,
        contact: true,
      },
    });

    if (!enrollment || enrollment.status !== 'ACTIVE') {
      return;
    }

    const currentStepOrder = enrollment.currentStepOrder;
    const step = enrollment.sequence.steps.find((s) => s.order === currentStepOrder);

    if (!step) {
      await prisma.sequenceEnrollment.update({
        where: { id: enrollmentId, organizationId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
      await recordAuditLog({
        organizationId,
        userId: 'SYSTEM',
        action: AUDIT_ACTIONS.SEQUENCE_COMPLETED,
        entity: 'SequenceEnrollment',
        entityId: enrollmentId,
      });
      return;
    }

    const config = safeJsonParse(step.config || '{}'); const conf = (typeof config === 'object' && config) ? config as Record<string, any> : {};
    if (typeof config !== 'object' || !config) return;

    let hasConsent = true;
    const toPhone = enrollment.contact?.phone || enrollment.lead?.phone || '';
    const toEmail = enrollment.contact?.email || enrollment.lead?.email || '';

    // Check Entitlements & Consent for communication steps
    if (step.type === 'SEND_EMAIL') {
      hasConsent = await checkCommunicationConsent(organizationId, enrollment.contactId, enrollment.leadId, 'EMAIL');
      const limit = await checkUsageLimit(organizationId, 'EMAIL_SENT');
      if (!limit.allowed) hasConsent = false;
    } else if (step.type === 'SEND_WHATSAPP') {
      hasConsent = await checkCommunicationConsent(organizationId, enrollment.contactId, enrollment.leadId, 'WHATSAPP');
      const limit = await checkUsageLimit(organizationId, 'WHATSAPP_MESSAGE');
      if (!limit.allowed) hasConsent = false;
    } else if (step.type === 'SEND_SMS') {
      hasConsent = await checkCommunicationConsent(organizationId, enrollment.contactId, enrollment.leadId, 'SMS');
      const limit = await checkUsageLimit(organizationId, 'SMS_SENT');
      if (!limit.allowed) hasConsent = false;
    }

    if (!hasConsent) {
      await prisma.sequenceEnrollment.update({
        where: { id: enrollmentId, organizationId },
        data: {
          status: 'PAUSED',
          cancelReason: 'Missing consent or entitlement limits reached',
        },
      });
      return;
    }

    switch (step.type) {
      case 'SEND_EMAIL':
        await getEmailProvider().sendEmail({
          to: toEmail,
          from: String(conf.from || 'system@crm.example.com'),
          subject: String(conf.subject || 'Automated Follow-up'),
          body: String(conf.body || ''),
        });
        await recordUsage(organizationId, 'EMAIL_SENT');
        break;
      case 'SEND_WHATSAPP':
        await getWhatsAppProvider().sendMessage({
          to: toPhone,
          content: String(conf.content || ''),
        });
        await recordUsage(organizationId, 'WHATSAPP_MESSAGE');
        break;
      case 'SEND_SMS':
        await getSmsProvider().sendSms({
          to: toPhone,
          from: String(conf.from || 'CRM'),
          body: String(conf.body || ''),
        });
        await recordUsage(organizationId, 'SMS_SENT');
        break;
      case 'CREATE_TASK':
        await prisma.task.create({
          data: {
            organizationId,
            title: String(conf.title || 'Sequence Task'),
            description: String(conf.description || ''),
            leadId: enrollment.leadId,
            contactId: enrollment.contactId,
            priority: 'MEDIUM',
          },
        });
        break;
      case 'DELAY':
        // Just advance below and let the delay trigger schedule the next step
        break;
    }

    // Advance step
    const nextStepOrder = currentStepOrder + 1;
    const nextStep = enrollment.sequence.steps.find((s) => s.order === nextStepOrder);

    await prisma.sequenceEnrollment.update({
      where: { id: enrollmentId, organizationId },
      data: {
        currentStepOrder: nextStepOrder,
      },
    });

    if (!nextStep) {
      // Completed
      await prisma.sequenceEnrollment.update({
        where: { id: enrollmentId, organizationId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
      await recordAuditLog({
        organizationId,
        userId: 'SYSTEM',
        action: AUDIT_ACTIONS.SEQUENCE_COMPLETED,
        entity: 'SequenceEnrollment',
        entityId: enrollmentId,
      });
    } else {
      // Schedule next execution if it has delay
      const delayMinutes = nextStep.delayMinutes || 0;
      if (delayMinutes > 0) {
        await jobService.enqueue({
          name: 'sequence-step',
          data: { enrollmentId, organizationId },
          delay: delayMinutes * 60 * 1000,
          organizationId,
        });
      } else {
        // Enqueue immediately for next step
        await jobService.enqueue({
          name: 'sequence-step',
          data: { enrollmentId, organizationId },
          delay: 0,
          organizationId,
        });
      }
    }

  } catch (error) {
    logger.error('Failed to execute sequence step', { error: error instanceof Error ? error.message : 'Unknown' });
  }
}
