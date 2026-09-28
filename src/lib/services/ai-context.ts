import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/utils/errors';

export interface AiContextParams {
  organizationId: string;
  entityType: 'LEAD' | 'CONTACT' | 'COMPANY' | 'DEAL' | 'GENERAL';
  entityId?: string;
}

export interface AiContext {
  entityType: string;
  entitySummary: string;
  relatedData: Record<string, string>;
}

export async function buildAiContext(params: AiContextParams): Promise<AiContext> {
  const { organizationId, entityType, entityId } = params;
  
  const context: AiContext = {
    entityType,
    entitySummary: '',
    relatedData: {}
  };

  if (entityType === 'GENERAL' || !entityId) {
    return context;
  }

  try {
    switch (entityType) {
      case 'LEAD': {
        const lead = await prisma.lead.findFirst({
          where: { id: entityId, organizationId }
        });
        if (lead) {
          context.relatedData = {
            firstName: lead.firstName || '',
            lastName: lead.lastName || '',
            title: lead.title || '',
            email: lead.email || '',
            phone: lead.phone || '',
            companyName: lead.companyName || '',
            status: lead.status || '',
            priority: lead.priority || '',
            source: lead.source || '',
            score: lead.score?.toString() || ''
          };
          context.entitySummary = `Lead: ${lead.firstName} ${lead.lastName}`;
        }
        break;
      }
      case 'CONTACT': {
        const contact = await prisma.contact.findFirst({
          where: { id: entityId, organizationId },
          include: { company: true }
        });
        if (contact) {
          context.relatedData = {
            firstName: contact.firstName || '',
            lastName: contact.lastName || '',
            title: contact.title || '',
            email: contact.email || '',
            phone: contact.phone || '',
            companyName: contact.company?.name || ''
          };
          context.entitySummary = `Contact: ${contact.firstName} ${contact.lastName}`;
        }
        break;
      }
      case 'COMPANY': {
        const company = await prisma.company.findFirst({
          where: { id: entityId, organizationId }
        });
        if (company) {
          context.relatedData = {
            name: company.name || '',
            domain: company.domain || '',
            industry: company.industry || '',
            phone: company.phone || '',
            website: company.website || ''
          };
          context.entitySummary = `Company: ${company.name}`;
        }
        break;
      }
      case 'DEAL': {
        const deal = await prisma.deal.findFirst({
          where: { id: entityId, organizationId },
          include: { company: true, contact: true, stage: true }
        });
        if (deal) {
          context.relatedData = {
            name: deal.name || '',
            amount: deal.amount?.toString() || '',
            status: deal.status || '',
            stageName: deal.stage?.name || '',
            companyName: deal.company?.name || '',
            contactName: deal.contact ? `${deal.contact.firstName} ${deal.contact.lastName}` : '',
            expectedCloseDate: deal.expectedCloseDate?.toISOString() || ''
          };
          context.entitySummary = `Deal: ${deal.name}`;
        }
        break;
      }
    }
  } catch (error) {
    logger.error(`Error building AI context for ${entityType} ${entityId}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return context;
}
