import { prisma } from '@/lib/prisma';
import { executeWorkflow } from './workflow-engine';
import { logger } from '@/lib/utils/errors';

export type WorkflowTriggerType = 
  | 'LEAD_CREATED' 
  | 'LEAD_QUALIFIED' 
  | 'DEAL_STAGE_CHANGED' 
  | 'DEAL_WON' 
  | 'DEAL_LOST' 
  | 'CONTACT_CREATED' 
  | 'MANUAL';

export async function dispatchWorkflowTrigger(
  organizationId: string,
  triggerType: WorkflowTriggerType,
  triggerData: Record<string, unknown>
): Promise<void> {
  try {
    const workflows = await prisma.workflow.findMany({
      where: {
        organizationId,
        triggerType,
        status: 'ACTIVE',
      },
    });

    for (const workflow of workflows) {
      try {
        // Execute workflows asynchronously so they don't block the caller
        executeWorkflow(workflow.id, organizationId, triggerData).catch((err) => {
          logger.error(`Error executing workflow ${workflow.id} asynchronously`, { error: err instanceof Error ? err.message : 'Unknown' });
        });
      } catch (err) {
        logger.error(`Error attempting to start workflow ${workflow.id}`, { error: err instanceof Error ? err.message : 'Unknown' });
      }
    }
  } catch (err) {
    logger.error(`Failed to dispatch workflow trigger ${triggerType}`, { error: err instanceof Error ? err.message : 'Unknown' });
  }
}
