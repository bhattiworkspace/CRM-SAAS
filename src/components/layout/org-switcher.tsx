'use client';

import React, { useState } from 'react';
import { Building2, ChevronDown, Check, Plus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export interface OrganizationOption {
  id: string;
  name: string;
  slug: string;
  roleName: string;
}

interface OrgSwitcherProps {
  currentOrg: { id: string; name: string; slug: string };
  availableOrgs?: OrganizationOption[];
}

export function OrgSwitcher({ currentOrg, availableOrgs = [] }: OrgSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { update } = useSession();
  const router = useRouter();

  const handleSelectOrg = async (orgId: string) => {
    if (orgId === currentOrg.id) {
      setIsOpen(false);
      return;
    }

    // Trigger session update to switch server-side active organization
    await update({ activeOrganizationId: orgId });
    setIsOpen(false);
    router.refresh();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold shadow-2xs focus:outline-none transition-colors"
      >
        <Building2 className="h-3.5 w-3.5 text-brand-600" />
        <span className="max-w-[140px] truncate">{currentOrg.name}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-1.5 w-56 rounded-md bg-white border border-slate-200 shadow-lg py-1.5 z-50 text-xs">
            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Organizations
            </div>
            {availableOrgs.length > 0 ? (
              availableOrgs.map((org) => {
                const isSelected = org.id === currentOrg.id;
                return (
                  <button
                    key={org.id}
                    onClick={() => handleSelectOrg(org.id)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 transition-colors text-slate-700"
                  >
                    <div className="flex flex-col truncate">
                      <span className="font-semibold text-slate-900 truncate">{org.name}</span>
                      <span className="text-[10px] text-slate-500">{org.roleName}</span>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-brand-600 shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-2 text-slate-700 font-semibold">{currentOrg.name}</div>
            )}
            <div className="border-t border-slate-100 mt-1 pt-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/settings?tab=organization');
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-brand-600 hover:bg-slate-50 font-medium transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Organization Settings</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
