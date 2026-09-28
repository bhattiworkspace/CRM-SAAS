import { prisma } from './prisma';

export interface AuditLogInput {
  organizationId: string;
  userId: string;
  action: 
    | 'CREATE' 
    | 'UPDATE' 
    | 'DELETE' 
    | 'ASSIGN' 
    | 'IMPORT' 
    | 'CONVERT' 
    | 'STATUS_CHANGE' 
    | 'DEAL_STAGE_CHANGE' 
    | 'LOGIN'
    // Phase 2 Actions
    | 'AI_GENERATION'
    | 'AI_SCORE_GENERATED'
    | 'MESSAGE_SENT'
    | 'MESSAGE_FAILED'
    | 'SEQUENCE_STARTED'
    | 'SEQUENCE_PAUSED'
    | 'SEQUENCE_COMPLETED'
    | 'AUTOMATION_EXECUTED'
    | 'LEAD_ASSIGNED'
    | 'ENRICHMENT_COMPLETED'
    | 'MODULE_ENABLED'
    | 'MODULE_DISABLED'
    | 'PLAN_CHANGED'
    | 'SUBSCRIPTION_CHANGED'
    | string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

// Phase 2 Audit Action Constants
export const AUDIT_ACTIONS = {
  AI_GENERATION: 'AI_GENERATION',
  AI_SCORE_GENERATED: 'AI_SCORE_GENERATED',
  MESSAGE_SENT: 'MESSAGE_SENT',
  MESSAGE_FAILED: 'MESSAGE_FAILED',
  SEQUENCE_STARTED: 'SEQUENCE_STARTED',
  SEQUENCE_PAUSED: 'SEQUENCE_PAUSED',
  SEQUENCE_COMPLETED: 'SEQUENCE_COMPLETED',
  AUTOMATION_EXECUTED: 'AUTOMATION_EXECUTED',
  LEAD_ASSIGNED: 'LEAD_ASSIGNED',
  ENRICHMENT_COMPLETED: 'ENRICHMENT_COMPLETED',
  MODULE_ENABLED: 'MODULE_ENABLED',
  MODULE_DISABLED: 'MODULE_DISABLED',
  PLAN_CHANGED: 'PLAN_CHANGED',
  SUBSCRIPTION_CHANGED: 'SUBSCRIPTION_CHANGED',
} as const;

export async function recordAuditLog(input: AuditLogInput) {
  try {
    // Sanitize metadata to remove any potential password or secret keys
    let sanitizedMetadata: string | undefined = undefined;
    if (input.metadata) {
      const copy = { ...input.metadata };
      delete copy.password;
      delete copy.passwordHash;
      delete copy.secret;
      delete copy.apiKey;
      delete copy.token;
      sanitizedMetadata = JSON.stringify(copy);
    }

    return await prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        metadata: sanitizedMetadata,
        ipAddress: input.ipAddress || null,
      },
    });
  } catch (error) {
    console.error('Failed to record audit log:', error);
    // Non-blocking for primary transaction success, but logged
  }
}
