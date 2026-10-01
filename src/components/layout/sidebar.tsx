'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, UserPlus, Users, Building2, Activity,
  CheckSquare, Search, BarChart3, ShieldCheck, Settings,
  ChevronLeft, ChevronRight, MessageSquare, GitBranch, Zap,
  Sparkles, Briefcase
} from 'lucide-react';
import { appConfig } from '@/config/app.config';
import { clsx } from 'clsx';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  userPermissions?: string[];
  disabledModules?: string[];
  roleName?: string;
}

export function Sidebar({ isCollapsed, onToggleCollapse, disabledModules = [], roleName }: SidebarProps) {
  const pathname = usePathname();
  const isSalesRep = roleName === 'Sales Representative';

  type NavItem = {
    name?: string;
    href?: string;
    icon?: React.ElementType;
    badge?: string;
    section?: string;
    moduleCode?: string;
  };

  const rawNavigationItems: NavItem[] = [
    { section: 'Workspace' },
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, moduleCode: 'DASHBOARD' },
    { name: 'Leads', href: '/leads', icon: UserPlus, moduleCode: 'LEADS' },
    { name: 'Contacts', href: '/contacts', icon: Users, moduleCode: 'CONTACTS' },
    { name: 'Companies', href: '/companies', icon: Building2, moduleCode: 'COMPANIES' },
    { name: 'Deals', href: '/deals', icon: Briefcase, moduleCode: 'DEALS' },
    { name: 'Activities', href: '/activities', icon: Activity, moduleCode: 'ACTIVITIES' },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare, moduleCode: 'TASKS' },
    { section: 'Automation' },
    { name: 'Communications', href: '/communications', icon: MessageSquare, moduleCode: 'COMMUNICATIONS' },
    { name: 'Sequences', href: '/sequences', icon: GitBranch, badge: 'PRO', moduleCode: 'SEQUENCES' },
    { name: 'Workflows', href: '/workflows', icon: Zap, badge: 'PRO', moduleCode: 'AUTOMATION' },
    { name: 'AI Assistant', href: '/ai', icon: Sparkles, badge: 'PRO', moduleCode: 'AI' },
    { section: 'Insights' },
    { name: 'Business Finder', href: '/business-finder', icon: Search, badge: 'PRO', moduleCode: 'BUSINESS_FINDER_PRO' },
    { name: 'Reports', href: '/reports', icon: BarChart3, moduleCode: 'REPORTS' },
    { name: 'Audit Logs', href: '/audit-logs', icon: ShieldCheck, moduleCode: 'AUDIT_LOGS' }
  ].filter(item => !item.moduleCode || !disabledModules.includes(item.moduleCode));

  // Clean sections
  const navigationItems = rawNavigationItems.filter((item, index, arr) => {
    if (!item.section) return true;
    if (index === arr.length - 1) return false;
    if (arr[index + 1].section) return false;
    return true;
  });

  return (
    <aside
      className={clsx(
        'bg-sbar text-sbarInk border-r border-sbarLine flex flex-col h-screen sticky top-0 transition-all duration-200 z-40 shrink-0 select-none',
        isCollapsed ? 'w-[60px] mini' : 'w-[230px]'
      )}
    >
      <div className="px-5 pt-6 pb-4 flex items-center gap-2">
        <span id="logo-dot" className="w-2 h-2 bg-gold rounded-full shrink-0"></span>
        {!isCollapsed && <span className="font-head font-bold text-xl uppercase tracking-[.12em] truncate">{appConfig.appName}</span>}
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto" aria-label="Main navigation">
        {navigationItems.map((item, index) => {
          if (item.section) {
            if (isCollapsed) return <div key={`sec-${index}`} className="my-2" />;
            return (
              <p key={`sec-${index}`} className="px-3 pt-4 pb-1 text-[11px] font-mono uppercase tracking-wider text-sbarMute">
                {item.section}
              </p>
            );
          }

          const Icon = item.icon!;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

          return (
            <Link
              key={item.name}
              href={item.href!}
              className={clsx('nav-link group', isActive && 'active', isCollapsed && 'justify-center')}
              title={isCollapsed ? item.name : undefined}
            >
              <Icon className={clsx('ic', isActive ? 'text-gold' : 'group-hover:text-gold')} />
              {!isCollapsed && <span className="truncate flex-1">{item.name}</span>}
              {!isCollapsed && item.badge && <span className="pro-badge">{item.badge}</span>}
            </Link>
          );
        })}

        {!isSalesRep && (
          <>
            {!isCollapsed && <p className="px-3 pt-4 pb-1 text-[11px] font-mono uppercase tracking-wider text-sbarMute">Settings</p>}
            <Link
              href="/settings"
              className={clsx('nav-link group', pathname?.startsWith('/settings') && 'active', isCollapsed && 'justify-center')}
              title={isCollapsed ? 'Settings' : undefined}
            >
              <Settings className={clsx('ic', pathname?.startsWith('/settings') ? 'text-gold' : 'group-hover:text-gold')} />
              {!isCollapsed && <span className="truncate flex-1">Settings</span>}
            </Link>
          </>
        )}
      </nav>

      <div className="px-3 py-3 border-t border-sbarLine">
        <button onClick={onToggleCollapse} className={clsx('nav-link w-full text-sbarMute', isCollapsed && 'justify-center')} aria-label="Collapse sidebar">
          {isCollapsed ? <ChevronRight className="ic" /> : <ChevronLeft className="ic" />}
          {!isCollapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
