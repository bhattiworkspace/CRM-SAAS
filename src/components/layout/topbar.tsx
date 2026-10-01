'use client';

import React, { useState, useEffect } from 'react';
import { Menu, Search, Bell, Plus, Check } from 'lucide-react';
import { OrgSwitcher, OrganizationOption } from './org-switcher';
import { UserMenu } from './user-menu';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from './theme-toggle';

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
    <header className="sticky top-0 z-20 bg-tbar text-tbarInk border-b border-tbarLine" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="h-14 px-4 flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-1.5 -ml-1.5 text-mute hover:text-ink focus:outline-none"
          aria-label="Open menu"
        >
          <Menu className="ic" />
        </button>

        <OrgSwitcher currentOrg={context.organization} availableOrgs={availableOrgs} />

        {/* Global Search */}
        <form onSubmit={handleSearchSubmit} className="relative hidden sm:block flex-1 max-w-sm ml-1">
          <Search className="ic absolute left-2.5 top-1/2 -translate-y-1/2 text-mute" />
          <input
            type="search"
            placeholder="Search leads, contacts, deals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-8 w-full"
          />
        </form>

        <span className="flex-1 sm:hidden"></span>

        <ThemeToggle />

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-1.5 text-mute hover:text-ink"
            aria-label="Notifications"
          >
            <Bell className="ic" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-down text-white text-[10px] grid place-items-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
              <div className="menu w-72 z-50">
                <div className="px-2 py-1 flex items-center justify-between">
                  <span className="text-mute text-xs">Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-[10px] text-mute hover:text-acc flex items-center gap-1">
                      <Check className="w-3 h-3" /> Mark all read
                    </button>
                  )}
                </div>
                <hr className="border-line my-1" />
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-mute text-xs">No notifications</div>
                  ) : (
                    notifications.map(notif => (
                      <div
                        key={notif.id}
                        className={`menu-item ${notif.isRead ? 'opacity-70' : 'font-medium'}`}
                        onClick={() => {
                          if (!notif.isRead) markAsRead([notif.id]);
                          if (notif.link) router.push(notif.link);
                          setShowNotifications(false);
                        }}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${notif.isRead ? 'bg-line' : 'bg-gold'}`}></span>
                        <div className="truncate">
                          <p className="truncate text-ink">{notif.title}</p>
                          <p className="text-[10px] text-mute mt-0.5">{new Date(notif.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Quick Action */}
        <button
          onClick={() => router.push('/leads/new')}
          className="btn-primary hidden sm:inline-flex"
        >
          <Plus className="ic" /> New lead
        </button>

        {/* Profile Menu */}
        <UserMenu user={context.user} roleName={context.role.name} />
      </div>
    </header>
  );
}
