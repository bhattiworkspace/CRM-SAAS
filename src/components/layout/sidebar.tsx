'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  UserPlus,
  Users,
  Building2,
  KanbanSquare,
  Activity,
  CheckSquare,
  Search,
  BarChart3,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  GitBranch,
  Zap,
  Sparkles,
  Briefcase
} from 'lucide-react';
import { appConfig } from '@/config/app.config';
import { clsx } from 'clsx';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  userPermissions?: string[];
}

export function Sidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();

  type NavItem = {
    name?: string;
    href?: string;
    icon?: React.ElementType;
    badge?: string;
    divider?: boolean;
  };

  const navigationItems: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Leads', href: '/leads', icon: UserPlus },
    { name: 'Contacts', href: '/contacts', icon: Users },
    { name: 'Companies', href: '/companies', icon: Building2 },
    { name: 'Deals', href: '/deals', icon: Briefcase },
    { name: 'Activities', href: '/activities', icon: Activity },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    { divider: true },
    { name: 'Communications', href: '/communications', icon: MessageSquare },
    { name: 'Sequences', href: '/sequences', icon: GitBranch },
    { divider: true },
    { name: 'Automations', href: '/workflows', icon: Zap },
    { name: 'AI Assistant', href: '/ai', icon: Sparkles },
    { divider: true },
    { name: 'Business Finder', href: '/business-finder', icon: Search, badge: 'PRO' },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { divider: true },
    { name: 'Settings', href: '/settings', icon: Settings },
    { name: 'Audit Logs', href: '/audit-logs', icon: ShieldCheck },
  ];

  return (
    <aside
      className={clsx(
        'bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-all duration-300 z-30 shrink-0 select-none min-h-screen',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="h-9 w-9 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0">
            {appConfig.appName[0]}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-white text-base tracking-tight">{appConfig.appName}</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">B2B SaaS</span>
            </div>
          )}
        </Link>
        <button
          onClick={onToggleCollapse}
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors focus:outline-none"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navigationItems.map((item, index) => {
          if (item.divider) {
            return <div key={`div-${index}`} className="my-2 border-t border-slate-800" />;
          }

          const Icon = item.icon!;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

          return (
            <Link
              key={item.name}
              href={item.href!}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors group relative',
                isActive
                  ? 'bg-brand-600 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <Icon className={clsx('h-4 w-4 shrink-0', isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200')} />
              {!isCollapsed && (
                <span className="truncate flex-1">{item.name}</span>
              )}
              {!isCollapsed && item.badge && (
                <span className="bg-brand-500/20 text-brand-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-brand-500/30">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-slate-800 text-xs text-slate-500 text-center">
        {!isCollapsed && <span>{appConfig.appName} v1.0 • Enterprise</span>}
      </div>
    </aside>
  );
}
