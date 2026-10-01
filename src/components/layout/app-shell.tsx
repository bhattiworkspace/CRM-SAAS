'use client';

import React, { useState } from 'react';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { OrganizationOption } from './org-switcher';

interface AppShellProps {
  context: {
    user: { name: string; email: string; image?: string | null };
    organization: { id: string; name: string; slug: string };
    role: { name: string };
    permissions: string[];
  };
  availableOrgs?: OrganizationOption[];
  disabledModules?: string[];
  children: React.ReactNode;
}

export function AppShell({ context, availableOrgs, disabledModules = [], children }: AppShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen md:flex bg-bg text-ink font-body antialiased transition-colors duration-200">
      
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          userPermissions={context.permissions}
          disabledModules={disabledModules}
          roleName={context.role.name}
        />
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileOpen(false)} />
          <div className="relative w-[230px] z-50 flex flex-col bg-sbar">
            <Sidebar
              isCollapsed={false}
              onToggleCollapse={() => setIsMobileOpen(false)}
              userPermissions={context.permissions}
              disabledModules={disabledModules}
              roleName={context.role.name}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          onToggleMobileMenu={() => setIsMobileOpen(true)}
          context={context}
          availableOrgs={availableOrgs}
        />

        <main id="canvas" className="flex-1 p-4 md:p-6 max-w-[1280px] w-full mx-auto relative">
          {children}
        </main>
      </div>
    </div>
  );
}
