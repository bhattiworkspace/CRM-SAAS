'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';

interface ModuleInfo {
  code: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const MODULE_DEFINITIONS: ModuleInfo[] = [
  { code: 'AI', name: 'AI Assistant', description: 'AI-powered lead scoring, summaries, and sales assistant', icon: <Sparkles className="h-5 w-5" /> },
  { code: 'EMAIL', name: 'Email Integration', description: 'Send and receive emails within the CRM', icon: <Mail className="h-5 w-5" /> },
  { code: 'WHATSAPP', name: 'WhatsApp', description: 'WhatsApp messaging integration for sales outreach', icon: <MessageCircle className="h-5 w-5" /> },
  { code: 'SMS', name: 'SMS Messaging', description: 'SMS communication for follow-ups and notifications', icon: <Phone className="h-5 w-5" /> },
  { code: 'AUTOMATION', name: 'Automation', description: 'Workflow automation and sales sequences', icon: <Zap className="h-5 w-5" /> },
  { code: 'ENRICHMENT', name: 'Data Enrichment', description: 'Enrich company and contact data from external sources', icon: <Database className="h-5 w-5" /> },
  { code: 'ANALYTICS_ADVANCED', name: 'Advanced Analytics', description: 'Sales forecasting and advanced reporting dashboards', icon: <BarChart3 className="h-5 w-5" /> },
  { code: 'BUSINESS_FINDER_PRO', name: 'Business Finder Pro', description: 'Enhanced business discovery with expanded search limits', icon: <Search className="h-5 w-5" /> },
];

export default function ModulesPage() {
  const [moduleAccess, setModuleAccess] = useState<Record<string, boolean>>({});
  const [entitlements, setEntitlements] = useState<Array<{ moduleCode: string; usageLimit: number | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchModuleData();
  }, []);

  async function fetchModuleData() {
    try {
      setLoading(true);
      setError(null);

      const [subRes, usageRes] = await Promise.all([
        fetch('/api/billing/subscription'),
        fetch('/api/billing/usage'),
      ]);

      if (subRes.ok) {
        const subData = await subRes.json();
        if (subData.success && subData.data?.plan?.entitlements) {
          const access: Record<string, boolean> = {};
          const entList: Array<{ moduleCode: string; usageLimit: number | null }> = [];
          for (const ent of subData.data.plan.entitlements) {
            access[ent.moduleCode] = true;
            entList.push({ moduleCode: ent.moduleCode, usageLimit: ent.usageLimit });
          }
          setModuleAccess(access);
          setEntitlements(entList);
        }
      }

      if (usageRes.ok) {
        // Usage data loaded for display purposes
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load module data');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Module Management</h1>
          <p className="text-sm text-slate-500 mt-1">View and manage enabled modules for your organization</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Module Management</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <AlertCircle className="h-8 w-8 text-rose-400" />
          <p className="text-sm text-slate-500">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchModuleData}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Module Management</h1>
        <p className="text-sm text-slate-500 mt-1">
          Modules are determined by your organization&apos;s subscription plan. Upgrade your plan to access additional modules.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULE_DEFINITIONS.map((mod) => {
          const isEnabled = moduleAccess[mod.code] === true;
          const entitlement = entitlements.find(e => e.moduleCode === mod.code);

          return (
            <Card
              key={mod.code}
              className={`transition-all ${
                isEnabled
                  ? 'border-emerald-200 bg-emerald-50/30'
                  : 'border-slate-200 bg-slate-50/30 opacity-75'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${isEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    {mod.icon}
                  </div>
                  {isEnabled ? (
                    <Badge variant="success">
                      <Check className="h-3 w-3 mr-1" />
                      Enabled
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <X className="h-3 w-3 mr-1" />
                      Not Available
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-sm mt-3">{mod.name}</CardTitle>
                <CardDescription>{mod.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {isEnabled && entitlement && (
                  <div className="text-xs text-slate-500">
                    Usage limit:{' '}
                    <span className="font-medium text-slate-700">
                      {entitlement.usageLimit === null ? 'Unlimited' : `${entitlement.usageLimit} / period`}
                    </span>
                  </div>
                )}
                {!isEnabled && (
                  <p className="text-xs text-slate-400">
                    Upgrade your plan to enable this module.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
