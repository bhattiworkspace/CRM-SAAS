'use client';

import React, { useState } from 'react';
import { User, LogOut, Settings, Shield } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { Avatar } from '@/components/ui/avatar';
import Link from 'next/link';

interface UserMenuProps {
  user: {
    name: string;
    email: string;
    image?: string | null;
  };
  roleName: string;
}

export function UserMenu({ user, roleName }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1 rounded-full hover:bg-slate-100 transition-colors focus:outline-none"
      >
        <Avatar name={user.name} src={user.image} size="sm" />
        <div className="hidden sm:flex flex-col text-left">
          <span className="text-xs font-semibold text-slate-800 leading-tight">{user.name}</span>
          <span className="text-[10px] font-medium text-slate-500">{roleName}</span>
        </div>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 rounded-md bg-white border border-slate-200 shadow-xl py-1 z-50 text-xs animate-in zoom-in-95">
            <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/60">
              <p className="font-semibold text-slate-900">{user.name}</p>
              <p className="text-slate-500 truncate">{user.email}</p>
              <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200">
                <Shield className="h-3 w-3" />
                {roleName}
              </div>
            </div>

            <div className="py-1">
              <Link
                href="/settings?tab=profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 font-medium transition-colors"
              >
                <User className="h-3.5 w-3.5 text-slate-400" />
                Profile Settings
              </Link>
              <Link
                href="/settings?tab=organization"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 font-medium transition-colors"
              >
                <Settings className="h-3.5 w-3.5 text-slate-400" />
                Organization & Team
              </Link>
            </div>

            <div className="border-t border-slate-100 pt-1">
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-rose-600 hover:bg-rose-50 font-medium transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
