'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import {
  Sparkles,
  Mail,
  MessageCircle,
  Phone,
  Zap,
  Search,
  BarChart3,
  Database,
  Check,
  X,
  Loader2,
  AlertCircle,
  Building2,
  Sliders,
  CheckCircle2,
  LayoutDashboard,
  UserPlus,
  Users,
  KanbanSquare,
  Activity,
  CheckSquare,
  MessageSquare,
  GitBranch,
  ShieldCheck,
} from 'lucide-react';

interface ModuleInfo {
  code: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
}

const MODULE_DEFINITIONS: ModuleInfo[] = [
  { code: 'DASHBOARD', name: 'Dashboard', category: 'Core', description: 'Main overview dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { code: 'LEADS', name: 'Leads', category: 'Core', description: 'Manage potential prospects', icon: <UserPlus className="h-5 w-5" /> },
  { code: 'CONTACTS', name: 'Contacts', category: 'Core', description: 'Manage contacts', icon: <Users className="h-5 w-5" /> },
  { code: 'COMPANIES', name: 'Companies', category: 'Core', description: 'Manage B2B company accounts', icon: <Building2 className="h-5 w-5" /> },
  { code: 'DEALS', name: 'Deals', category: 'Core', description: 'Pipeline and deals management', icon: <KanbanSquare className="h-5 w-5" /> },
  { code: 'ACTIVITIES', name: 'Activities', category: 'Core', description: 'Track calls, meetings, and interactions', icon: <Activity className="h-5 w-5" /> },
  { code: 'TASKS', name: 'Tasks', category: 'Core', description: 'Manage to-dos and follow-ups', icon: <CheckSquare className="h-5 w-5" /> },
  { code: 'COMMUNICATIONS', name: 'Communications', category: 'Communications', description: 'Unified inbox for Email, SMS, WhatsApp', icon: <MessageSquare className="h-5 w-5" /> },
  { code: 'SEQUENCES', name: 'Sequences', category: 'Automation', description: 'Multi-step email/SMS drip campaigns', icon: <GitBranch className="h-5 w-5" /> },
  { code: 'AUTOMATION', name: 'Automations', category: 'Automation', description: 'Event-driven triggers and workflows', icon: <Zap className="h-5 w-5" /> },
  { code: 'AI', name: 'AI Assistant', category: 'Intelligence', description: 'AI lead scoring and email drafting', icon: <Sparkles className="h-5 w-5" /> },
  { code: 'BUSINESS_FINDER_PRO', name: 'Business Finder', category: 'Data & Growth', description: 'Discover local B2B leads', icon: <Search className="h-5 w-5" /> },
  { code: 'REPORTS', name: 'Reports', category: 'Analytics', description: 'Sales forecasting and metrics', icon: <BarChart3 className="h-5 w-5" /> },
  { code: 'AUDIT_LOGS', name: 'Audit Logs', category: 'System', description: 'System-wide audit trail and security logs', icon: <ShieldCheck className="h-5 w-5" /> },
];

interface Organization {
  id: string;
  name: string;
  slug: string;
  industry?: string;
}

export default function ModulesPage() {
  const [moduleAccess, setModuleAccess] = useState<Record<string, boolean>>({});
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [togglingCode, setTogglingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchModuleData();
  }, [selectedOrgId]);

  async function fetchModuleData() {
    try {
      setLoading(true);
      setError(null);

      const url = selectedOrgId ? `/api/modules?organizationId=${selectedOrgId}` : '/api/modules';
      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load module configuration');
      }

      const { data } = json;
      if (data.allOrganizations && data.allOrganizations.length > 0) {
        setOrganizations(data.allOrganizations);
        if (!selectedOrgId) {
          setSelectedOrgId(data.organizationId);
        }
      }

      // Build access mapping: defaults to true unless overridden in organizationModules
      const access: Record<string, boolean> = {};
      
      // First populate from plan entitlements
      if (data.planEntitlements) {
        for (const ent of data.planEntitlements) {
          access[ent.moduleCode] = true;
        }
      }

      // Default all core modules to enabled if plan not restrictive
      for (const mod of MODULE_DEFINITIONS) {
        if (access[mod.code] === undefined) {
          access[mod.code] = true;
        }
      }

      // Apply organization specific overrides
      if (data.organizationModules) {
        for (const om of data.organizationModules) {
          access[om.moduleCode] = om.enabled;
        }
      }

      setModuleAccess(access);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load modules');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleModule(moduleCode: string, currentEnabled: boolean) {
    const newStatus = !currentEnabled;
    try {
      setTogglingCode(moduleCode);
      setError(null);
      setSuccessMessage(null);

      // Optimistic update
      setModuleAccess((prev) => ({ ...prev, [moduleCode]: newStatus }));

      const res = await fetch('/api/modules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleCode,
          enabled: newStatus,
          organizationId: selectedOrgId || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        // Revert optimistic update
        setModuleAccess((prev) => ({ ...prev, [moduleCode]: currentEnabled }));
        throw new Error(json.error || 'Failed to update module status');
      }

      const modName = MODULE_DEFINITIONS.find((m) => m.code === moduleCode)?.name || moduleCode;
      setSuccessMessage(`Module "${modName}" successfully ${newStatus ? 'ENABLED' : 'DISABLED'}.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update module');
    } finally {
      setTogglingCode(null);
    }
  }

  async function handleBulkToggle(enable: boolean) {
    try {
      setTogglingCode('BULK');
      setError(null);
      setSuccessMessage(null);

      // Optimistic update
      const newAccess: Record<string, boolean> = {};
      const moduleCodes = MODULE_DEFINITIONS.map(m => m.code);
      moduleCodes.forEach(code => newAccess[code] = enable);
      
      const previousAccess = { ...moduleAccess };
      setModuleAccess(newAccess);

      const res = await fetch('/api/modules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleCodes,
          enabled: enable,
          organizationId: selectedOrgId || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setModuleAccess(previousAccess);
        throw new Error(json.error || `Failed to ${enable ? 'enable' : 'disable'} all modules`);
      }

      setSuccessMessage(`Successfully ${enable ? 'ENABLED' : 'DISABLED'} all modules.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to perform bulk action');
    } finally {
      setTogglingCode(null);
    }
  }

  const selectedOrg = organizations.find((o) => o.id === selectedOrgId);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Sliders className="h-6 w-6 text-brand-600" /> Module & Capability Admin Controls
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Enable or disable specific CRM modules for companies and tenant organizations in real-time.
          </p>
        </div>

        {/* Company Selector for Admin */}
        {organizations.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-xs">
              <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-600 shrink-0">Target Company:</span>
              <Select
                className="w-56 text-xs h-8"
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                options={organizations.map((o) => ({
                  value: o.id,
                  label: `${o.name} (${o.slug})`,
                }))}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                onClick={() => handleBulkToggle(true)}
                disabled={togglingCode === 'BULK'}
              >
                {togglingCode === 'BULK' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                Enable All
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs h-8 border-rose-200 text-rose-700 hover:bg-rose-50"
                onClick={() => handleBulkToggle(false)}
                disabled={togglingCode === 'BULK'}
              >
                {togglingCode === 'BULK' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <X className="h-3 w-3 mr-1" />}
                Disable All
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs font-semibold text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={fetchModuleData} className="ml-auto">
            Retry
          </Button>
        </div>
      )}

      {/* Organization Status Banner */}
      {selectedOrg && (
        <div className="bg-slate-900 text-white p-4 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-brand-600 flex items-center justify-center font-bold text-lg text-white">
              {selectedOrg.name[0]}
            </div>
            <div>
              <h2 className="font-bold text-sm text-white flex items-center gap-2">
                {selectedOrg.name} <Badge variant="info" className="text-[10px]">Active Tenant</Badge>
              </h2>
              <p className="text-xs text-slate-400">
                Industry: {selectedOrg.industry || 'General Business'} • Slug: {selectedOrg.slug}
              </p>
            </div>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>Enabled Modules:</span>
            <Badge variant="success" className="font-bold">
              {Object.values(moduleAccess).filter(Boolean).length} / {MODULE_DEFINITIONS.length} Active
            </Badge>
          </div>
        </div>
      )}

      {/* Module Grid */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-16 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          <span>Loading module settings for tenant...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {MODULE_DEFINITIONS.map((mod) => {
            const isEnabled = moduleAccess[mod.code] === true;
            const isBusy = togglingCode === mod.code;

            return (
              <Card
                key={mod.code}
                className={`transition-all duration-200 flex flex-col justify-between ${
                  isEnabled
                    ? 'border-emerald-300 bg-white shadow-xs ring-1 ring-emerald-500/10'
                    : 'border-slate-200 bg-slate-50/50 opacity-80'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-lg ${isEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                        {mod.icon}
                      </div>
                      <div>
                        <Badge variant="outline" className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">
                          {mod.category}
                        </Badge>
                        <CardTitle className="text-sm font-bold text-slate-900">{mod.name}</CardTitle>
                      </div>
                    </div>
                  </div>
                  <CardDescription className="text-xs text-slate-500 mt-2 leading-relaxed">
                    {mod.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-2 border-t border-slate-100 flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-1.5">
                    {isEnabled ? (
                      <Badge variant="success" className="text-[11px] gap-1 px-2 py-0.5">
                        <Check className="h-3 w-3" /> Active for Company
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[11px] gap-1 text-slate-400 bg-slate-100 px-2 py-0.5">
                        <X className="h-3 w-3" /> Disabled
                      </Badge>
                    )}
                  </div>

                  {/* Interactive Admin Toggle Button */}
                  <Button
                    variant={isEnabled ? 'danger' : 'primary'}
                    size="sm"
                    disabled={isBusy}
                    onClick={() => handleToggleModule(mod.code, isEnabled)}
                    className="font-medium text-xs shadow-xs gap-1.5"
                  >
                    {isBusy ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                      </>
                    ) : isEnabled ? (
                      <>Disable Access</>
                    ) : (
                      <>Enable Access</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
