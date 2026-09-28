import { prisma } from '@/lib/prisma';
import { safeJsonParse } from '@/lib/utils/json';
import { logger } from '@/lib/utils/errors';
import { getEmailProvider } from './email-provider';
import { getWhatsAppProvider } from './whatsapp-provider';
import { getSmsProvider } from './sms-provider';
import { getAiProvider } from './ai-provider';
import { jobService } from '@/lib/jobs';
import { recordAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export function evaluateConditions(
  conditions: Array<{ field: string; operator: string; value: string }>,
  data: Record<string, unknown>
): boolean {
  for (const condition of conditions) {
    const fieldValue = String(data[condition.field] ?? '');
    const { operator, value } = condition;

    let passed = false;
    switch (operator) {
      case 'equals':
        passed = fieldValue === value;
        break;
      case 'not_equals':
        passed = fieldValue !== value;
        break;
      case 'contains':
        passed = fieldValue.includes(value);
        break;
      case 'greater_than':
        passed = Number(fieldValue) > Number(value);
        break;
      case 'less_than':
        passed = Number(fieldValue) < Number(value);
        break;
      case 'is_empty':
        passed = fieldValue.trim() === '';
        break;
      case 'is_not_empty':
        passed = fieldValue.trim() !== '';
        break;
      default:
        passed = false;
    }

    if (!passed) {
      return false;
    }
  }
  return true;
}

export async function executeWorkflow(
  workflowId: string,
  organizationId: string,
  triggerData: Record<string, unknown>
): Promise<void> {
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId, organizationId },
    include: {
      conditions: { orderBy: { order: 'asc' } },
      actions: { orderBy: { order: 'asc' } },
    },
  });

  if (!workflow || workflow.status !== 'ACTIVE') {
    return;
  }

  const triggerEntityId = String(triggerData.id || triggerData.leadId || triggerData.dealId || triggerData.contactId || '');
  const timestampBucket = new Date().toISOString().slice(0, 13); // Up to the hour
  const idempotencyKey = `wf_${workflowId}_${triggerEntityId}_${timestampBucket}`;

  // Check if we already executed recently to prevent duplication
  const existingExecution = await prisma.workflowExecution.findFirst({
    where: {
      workflowId,
      organizationId,
      triggerEntityId,
      metadata: { contains: idempotencyKey },
    },
  });

  if (existingExecution) {
    logger.info(`Skipping duplicate workflow execution for ${workflowId}`);
    return;
  }

  const execution = await prisma.workflowExecution.create({
    data: {
      organizationId,
      workflowId,
      triggerEntityType: workflow.triggerType,
      triggerEntityId,
      status: 'RUNNING',
      startedAt: new Date(),
      metadata: JSON.stringify({ idempotencyKey, triggerData }),
    },
  });

  try {
    const conditionsPassed = evaluateConditions(
      workflow.conditions.map((c) => ({
        field: c.field,
        operator: c.operator,
        value: c.value,
      })),
      triggerData
    );

    if (!conditionsPassed) {
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          metadata: JSON.stringify({ idempotencyKey, triggerData, skipped: true, reason: 'Conditions not met' }),
        },
      });
      return;
    }

    for (const action of workflow.actions) {
      const config = safeJsonParse(action.config || '{}');
      const conf = (typeof config === 'object' && config) ? config as Record<string, any> : {};
      if (!conf) continue;

      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: { currentActionOrder: action.order },
      });

      switch (action.type) {
        case 'SEND_EMAIL':
          await getEmailProvider().sendEmail({
            to: String(conf.to || triggerData.email || ''),
            from: String(conf.from || 'system@crm.example.com'),
            subject: String(conf.subject || 'Automated Message'),
            body: String(conf.body || ''),
          });
          break;
        case 'SEND_WHATSAPP':
          await getWhatsAppProvider().sendMessage({
            to: String(conf.to || triggerData.phone || ''),
            content: String(conf.content || ''),
          });
          break;
        case 'SEND_SMS':
          await getSmsProvider().sendSms({
            to: String(conf.to || triggerData.phone || ''),
            from: String(conf.from || 'CRM'),
            body: String(conf.body || ''),
          });
          break;
        case 'ASSIGN_LEAD': {
          const leadId = String(triggerData.leadId || triggerData.id);
          const ownerId = String(conf.ownerId);
          if (leadId && ownerId) {
            const membership = await prisma.membership.findUnique({
              where: { userId_organizationId: { userId: ownerId, organizationId } }
            });
            if (membership) {
              await prisma.lead.update({
                where: { id: leadId, organizationId },
                data: { ownerId },
              });
            }
          }
          break;
        }
        case 'CREATE_TASK':
          await prisma.task.create({
            data: {
              organizationId,
              title: String(conf.title || 'Automated Task'),
              description: String(conf.description || ''),
              priority: String(conf.priority || 'MEDIUM'),
              leadId: triggerData.leadId ? String(triggerData.leadId) : undefined,
              dealId: triggerData.dealId ? String(triggerData.dealId) : undefined,
              contactId: triggerData.contactId ? String(triggerData.contactId) : undefined,
              assignedToId: conf.assignedToId ? String(conf.assignedToId) : undefined,
            },
          });
          break;
        case 'UPDATE_STATUS': {
          const entityType = workflow.triggerType.split('_')[0];
          const newStatus = String(conf.status);
          if (entityType === 'LEAD' && triggerEntityId) {
            await prisma.lead.update({
              where: { id: triggerEntityId, organizationId },
              data: { status: newStatus },
            });
          } else if (entityType === 'DEAL' && triggerEntityId) {
            await prisma.deal.update({
              where: { id: triggerEntityId, organizationId },
              data: { status: newStatus },
            });
          }
          break;
        }
        case 'NOTIFY_USER':
          if (conf.userId) {
            await prisma.notification.create({
              data: {
                organizationId,
                userId: String(conf.userId),
                title: String(conf.title || 'Workflow Notification'),
                message: String(conf.message || ''),
              },
            });
          }
          break;
        case 'DELAY':
          if (action.delayMinutes) {
            await jobService.enqueue({
              name: 'workflow-delay',
              data: { workflowId, executionId: execution.id, triggerData },
              delay: action.delayMinutes * 60 * 1000,
              organizationId,
            });
            // Stop execution here, the next job will continue
            // A more complex implementation would split the workflow into before/after delay parts
          }
          break;
        case 'AI_ACTION':
          await getAiProvider().generateText({
            prompt: String(conf.prompt || ''),
            systemPrompt: String(conf.systemPrompt || ''),
          });
          break;
        default:
          logger.warn(`Unknown action type: ${action.type}`);
      }
    }

    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    await recordAuditLog({
      organizationId,
      userId: 'SYSTEM',
      action: AUDIT_ACTIONS.AUTOMATION_EXECUTED,
      entity: 'Workflow',
      entityId: workflowId,
      metadata: { executionId: execution.id, triggerEntityId },
    });

  } catch (error) {
    logger.error('Workflow execution failed:', { error: error instanceof Error ? error.message : 'Unknown' });
    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: 'FAILED',
        failureReason: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}
