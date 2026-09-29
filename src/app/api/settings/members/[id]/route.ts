import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { AppError, createErrorResponse } from '@/lib/utils/errors';
import { recordAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await requireTenantPermission(PERMISSIONS.USERS_MANAGE);
    const body = await req.json();
    const { roleId } = body;

    if (!roleId) {
      throw new AppError('Role ID is required', 400);
    }

    const membership = await prisma.membership.findUnique({
      where: { id: params.id },
      include: { role: true, user: true }
    });

    if (!membership || membership.organizationId !== context.organization.id) {
      throw new AppError('Membership not found', 404);
    }

    const newRole = await prisma.role.findUnique({
      where: { id: roleId }
    });

    if (!newRole || newRole.organizationId !== context.organization.id) {
      throw new AppError('Role not found', 404);
    }

    const updated = await prisma.membership.update({
      where: { id: params.id },
      data: { roleId }
    });

    await recordAuditLog({
      organizationId: context.organization.id,
      userId: context.user.id,
      action: 'UPDATE',
      entity: 'Membership',
      entityId: params.id,
      metadata: { newRole: newRole.name, memberEmail: membership.user.email }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof AppError) {
      return createErrorResponse(error);
    }
    return createErrorResponse(new AppError('Failed to update member role', 500));
  }
}
