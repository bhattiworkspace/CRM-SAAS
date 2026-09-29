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
  organizationId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantPermission(PERMISSIONS.MODULES_MANAGE);
    const { searchParams } = new URL(req.url);
    const targetOrgId = searchParams.get('organizationId') || context.organization.id;

    // Fetch subscription plan entitlements
    const subscription = await prisma.subscription.findFirst({
      where: { organizationId: targetOrgId, status: 'ACTIVE' },
      include: {
        plan: {
          include: { entitlements: true }
        }
      }
    });

    const planEntitlements = subscription?.plan?.entitlements || [];

    // Fetch organization-specific overrides
    const orgModules = await prisma.organizationModule.findMany({
      where: { organizationId: targetOrgId }
    });

    // Also fetch list of all organizations if admin wants to manage other companies
    const organizations = await prisma.organization.findMany({
      select: { id: true, name: true, slug: true, industry: true }
    });

    return NextResponse.json({
      success: true,
      data: {
        organizationId: targetOrgId,
        organizationName: context.organization.name,
        planEntitlements,
        organizationModules: orgModules,
        allOrganizations: organizations,
      }
    });
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
    const userId = context.user.id;

    const body = await req.json();
    const result = moduleToggleSchema.safeParse(body);

    if (!result.success) {
      throw new AppError('Invalid request body', 400);
    }

    const { moduleCode, enabled, organizationId: customOrgId } = result.data;
    const organizationId = customOrgId || context.organization.id;

    // Update or create the OrganizationModule override
    const moduleRecord = await prisma.organizationModule.upsert({
      where: { organizationId_moduleCode: { organizationId, moduleCode } },
      update: { enabled },
      create: { organizationId, moduleCode, enabled }
    });

    await recordAuditLog({
      organizationId,
      userId,
      action: enabled ? AUDIT_ACTIONS.MODULE_ENABLED : AUDIT_ACTIONS.MODULE_DISABLED,
      entity: 'OrganizationModule',
      entityId: moduleRecord.id,
      metadata: { moduleCode, enabled }
    });

    return NextResponse.json({ success: true, data: moduleRecord });
  } catch (error) {
    if (error instanceof AppError) {
      return createErrorResponse(error);
    }
    return createErrorResponse(new AppError('Failed to update module', 500));
  }
}
