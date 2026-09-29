import React from 'react';
import { redirect } from 'next/navigation';
import { getTenantSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/layout/app-shell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const context = await getTenantSession();

  if (!context) {
    redirect('/login');
  }

  // Fetch all organizations the user belongs to for OrgSwitcher
  const userMemberships = await prisma.membership.findMany({
    where: { userId: context.user.id, status: 'ACTIVE' },
    include: {
      organization: true,
      role: true,
    },
  });

  const availableOrgs = userMemberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    roleName: m.role.name,
  }));

  const orgModules = await prisma.organizationModule.findMany({
    where: { organizationId: context.organization.id }
  });

  // Default core modules to true if not present, else use their value
  const activeModules = orgModules
    .filter(m => m.enabled)
    .map(m => m.moduleCode);

  const disabledModules = orgModules
    .filter(m => !m.enabled)
    .map(m => m.moduleCode);

  return (
    <AppShell context={context} availableOrgs={availableOrgs} disabledModules={disabledModules}>
      {children}
    </AppShell>
  );
}
