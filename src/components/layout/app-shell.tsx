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
  children: React.ReactNode;
}

export function AppShell({ context, availableOrgs, children }: AppShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900 font-sans antialiased">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          userPermissions={context.permissions}
        />
      </div>

      {/* Mobile Drawer Sidebar */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setIsMobileOpen(false)} />
          <div className="relative w-64 bg-slate-900 z-10 flex flex-col">
            <Sidebar
              isCollapsed={false}
              onToggleCollapse={() => setIsMobileOpen(false)}
              userPermissions={context.permissions}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Topbar
          onToggleMobileMenu={() => setIsMobileOpen(true)}
          context={context}
          availableOrgs={availableOrgs}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
