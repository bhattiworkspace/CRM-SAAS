import { prisma } from '@/lib/prisma';

export type ModuleCode = 
  | 'AI' 
  | 'EMAIL' 
  | 'WHATSAPP' 
  | 'SMS' 
  | 'AUTOMATION' 
  | 'ENRICHMENT' 
  | 'ANALYTICS_ADVANCED' 
  | 'BUSINESS_FINDER_PRO';

export type ResourceType = 
  | 'AI_REQUEST' 
  | 'EMAIL_SENT' 
  | 'SMS_SENT' 
  | 'WHATSAPP_MESSAGE' 
  | 'BUSINESS_SEARCH' 
  | 'ENRICHMENT_REQUEST' 
  | 'AUTOMATION_EXECUTION' 
  | 'STORAGE' 
  | 'USER';

export async function canUseFeature(organizationId: string, moduleCode: ModuleCode): Promise<boolean> {
  const subscription = await prisma.subscription.findFirst({
    where: { organizationId, status: 'ACTIVE' },
    include: {
      plan: {
        include: {
          entitlements: true
        }
      }
    }
  });

  const planEntitled = subscription ? subscription.plan.entitlements.some((e) => e.moduleCode === moduleCode) : false;
  if (!planEntitled) {
    return false;
  }

  const orgModule = await prisma.organizationModule.findUnique({
    where: { organizationId_moduleCode: { organizationId, moduleCode } }
  });

  if (orgModule && !orgModule.enabled) {
    return false;
  }

  return true;
}

export async function getOrganizationEntitlements(organizationId: string): Promise<Array<{ moduleCode: string; usageLimit: number | null }>> {
  const subscription = await prisma.subscription.findFirst({
    where: { organizationId, status: 'ACTIVE' },
    include: {
      plan: {
        include: {
          entitlements: true
        }
      }
    }
  });

  if (!subscription) {
    return [];
  }

  return subscription.plan.entitlements.map((e) => ({
    moduleCode: e.moduleCode,
    usageLimit: e.usageLimit
  }));
}

export async function checkUsageLimit(organizationId: string, resource: ResourceType): Promise<{ allowed: boolean; current: number; limit: number | null; remaining: number | null }> {
  const subscription = await prisma.subscription.findFirst({
    where: { organizationId, status: 'ACTIVE' },
    include: {
      plan: {
        include: {
          entitlements: true
        }
      }
    }
  });

  if (!subscription) {
    return { allowed: false, current: 0, limit: 0, remaining: 0 };
  }

  // Basic mapping of resource to module code (adjust logic as needed)
  let moduleCode = '';
  if (resource === 'AI_REQUEST') moduleCode = 'AI';
  if (resource === 'EMAIL_SENT') moduleCode = 'EMAIL';
  if (resource === 'SMS_SENT') moduleCode = 'SMS';
  if (resource === 'WHATSAPP_MESSAGE') moduleCode = 'WHATSAPP';
  if (resource === 'BUSINESS_SEARCH') moduleCode = 'BUSINESS_FINDER_PRO';
  if (resource === 'ENRICHMENT_REQUEST') moduleCode = 'ENRICHMENT';
  if (resource === 'AUTOMATION_EXECUTION') moduleCode = 'AUTOMATION';

  const entitlement = subscription.plan.entitlements.find((e) => e.moduleCode === moduleCode);
  
  if (!entitlement) {
    return { allowed: false, current: 0, limit: 0, remaining: 0 };
  }

  // Example: sum usage records for current billing period
  const usageRecords = await prisma.usageRecord.aggregate({
    where: {
      organizationId,
      resourceType: resource,
      createdAt: {
        gte: subscription.currentPeriodStart,
        lte: subscription.currentPeriodEnd
      }
    },
    _sum: {
      quantity: true
    }
  });

  const current = usageRecords._sum.quantity || 0;
  const limit = entitlement.usageLimit;

  if (limit === null) {
    return { allowed: true, current, limit: null, remaining: null };
  }

  return {
    allowed: current < limit,
    current,
    limit,
    remaining: Math.max(0, limit - current)
  };
}

export async function recordUsage(organizationId: string, resource: ResourceType, quantity: number = 1): Promise<void> {
  const subscription = await prisma.subscription.findFirst({
    where: { organizationId, status: 'ACTIVE' }
  });

  if (!subscription) return;

  await prisma.usageRecord.create({
    data: {
      organizationId,
      resourceType: resource,
      quantity,
      // Assign period based on subscription if needed
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd
    }
  });
}

export async function getModuleAccess(organizationId: string): Promise<Record<string, boolean>> {
  const entitlements = await getOrganizationEntitlements(organizationId);
  
  const allModules: ModuleCode[] = [
    'AI', 'EMAIL', 'WHATSAPP', 'SMS', 'AUTOMATION', 'ENRICHMENT', 'ANALYTICS_ADVANCED', 'BUSINESS_FINDER_PRO'
  ];

  const accessMap: Record<string, boolean> = {};
  for (const mod of allModules) {
    accessMap[mod] = entitlements.some(e => e.moduleCode === mod);
  }

  return accessMap;
}
