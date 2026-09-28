'use client';

import React, { useState, useEffect } from 'react';
import { Menu, Search, Bell, Plus, Check } from 'lucide-react';
import { OrgSwitcher, OrganizationOption } from './org-switcher';
import { UserMenu } from './user-menu';
import { useRouter } from 'next/navigation';

interface TopbarProps {
  onToggleMobileMenu: () => void;
  context: {
    user: { name: string; email: string; image?: string | null };
    organization: { id: string; name: string; slug: string };
    role: { name: string };
  };
  availableOrgs?: OrganizationOption[];
}

export function Topbar({ onToggleMobileMenu, context, availableOrgs }: TopbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.success && data.data) {
        setNotifications(data.data);
        setUnreadCount(data.data.filter((n: any) => !n.isRead).length);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const markAsRead = async (ids: string[]) => {
    if (!ids.length) return;
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      if (res.ok) fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const markAllRead = () => {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
    markAsRead(unreadIds);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/leads?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
      <div className="flex items-center gap-3">
        {/* Mobile Menu Trigger */}
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md focus:outline-none"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Organization Switcher */}
        <OrgSwitcher currentOrg={context.organization} availableOrgs={availableOrgs} />

        {/* Quick Action Button */}
        <button
          onClick={() => router.push('/leads?create=true')}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold rounded-md border border-brand-200 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Lead</span>
        </button>
      </div>

      {/* Global Search Bar */}
      <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center flex-1 max-w-xs mx-4">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search leads, companies, deals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:brand-500 focus:bg-white transition-all shadow-2xs"
          />
        </div>
      </form>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full relative transition-colors focus:outline-none"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-brand-600 ring-2 ring-white" />
            )}
          </button>

          {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 mt-2 w-80 rounded-md bg-white border border-slate-200 shadow-xl py-2 z-50 text-xs animate-in zoom-in-95">
                <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between font-semibold text-slate-800">
                  <span>Notifications</span>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <span className="text-[10px] text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">{unreadCount} New</span>
                    )}
                    <button onClick={markAllRead} className="text-[10px] text-slate-500 hover:text-brand-600 flex items-center gap-1"><Check className="h-3 w-3"/> Mark all read</button>
                  </div>
                </div>
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-slate-500">No notifications</div>
                  ) : (
                    notifications.map(notif => (
                      <div 
                        key={notif.id} 
                        className={`p-3 transition-colors cursor-pointer ${notif.isRead ? 'hover:bg-slate-50 opacity-70' : 'bg-brand-50/30 hover:bg-brand-50/50 border-l-2 border-brand-500'}`}
                        onClick={() => !notif.isRead && markAsRead([notif.id])}
                      >
                        <p className={`font-semibold ${notif.isRead ? 'text-slate-700' : 'text-slate-900'}`}>{notif.title}</p>
                        <p className="text-slate-500 mt-0.5">{notif.message}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">{new Date(notif.createdAt).toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Profile Menu */}
        <UserMenu user={context.user} roleName={context.role.name} />
      </div>
    </header>
  );
}
