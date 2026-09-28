import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { createErrorResponse, AppError } from '@/lib/utils/errors';
import { recordAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

const moduleToggleSchema = z.object({
  moduleCode: z.string(),
  enabled: z.boolean(),
});

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantPermission(PERMISSIONS.MODULES_MANAGE);
    const organizationId = context.organization.id;

    const modules = await prisma.organizationModule.findMany({
      where: { organizationId }
    });

    return NextResponse.json({ success: true, data: modules });
  } catch (error) {
    if (error instanceof AppError) {
      return createErrorResponse(error);
    }
    return createErrorResponse(new AppError('Failed to list modules', 500));
  }
}

export async function PUT(req: NextRequest) {
  try {
    const context = await requireTenantPermission(PERMISSIONS.MODULES_MANAGE);
    const organizationId = context.organization.id;
    const userId = context.user.id;

    const body = await req.json();
    const result = moduleToggleSchema.safeParse(body);

    if (!result.success) {
      throw new AppError('Invalid request body', 400);
    }

    const { moduleCode, enabled } = result.data;

    // Validate that the plan has the entitlement before enabling
    if (enabled) {
      const subscription = await prisma.subscription.findFirst({
        where: { organizationId, status: 'ACTIVE' },
        include: {
          plan: {
            include: { entitlements: true }
          }
        }
      });

      const planEntitled = subscription ? subscription.plan.entitlements.some((e) => e.moduleCode === moduleCode) : false;
      if (!planEntitled) {
        throw new AppError('Your plan does not support this module. Please upgrade to enable it.', 403);
      }
    }

    const module = await prisma.organizationModule.upsert({
      where: { organizationId_moduleCode: { organizationId, moduleCode } },
      update: { enabled },
      create: { organizationId, moduleCode, enabled }
    });

    await recordAuditLog({
      organizationId,
      userId,
      action: enabled ? AUDIT_ACTIONS.MODULE_ENABLED : AUDIT_ACTIONS.MODULE_DISABLED,
      entity: 'OrganizationModule',
      entityId: module.id,
      metadata: { moduleCode }
    });

    return NextResponse.json({ success: true, data: module });
  } catch (error) {
    if (error instanceof AppError) {
      return createErrorResponse(error);
    }
    return createErrorResponse(new AppError('Failed to update module', 500));
  }
}
