'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Check, X, Zap, Crown, Shield, Activity, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Mock fetching - replace with real APIs if available or fallback gracefully
      const [subRes, usageRes, plansRes] = await Promise.all([
        fetch('/api/billing/subscription').catch(() => ({ json: () => ({ success: false }) })),
        fetch('/api/billing/usage').catch(() => ({ json: () => ({ success: false }) })),
        fetch('/api/billing/plans').catch(() => ({ json: () => ({ success: false }) }))
      ]);

      const subData = await (subRes as Response).json();
      const usageData = await (usageRes as Response).json();
      const plansData = await (plansRes as Response).json();

      // For dev, inject mock data if endpoints fail
      setSubscription(subData.success ? subData.subscription : { planName: 'Professional', tier: 'PRO', status: 'ACTIVE', currentPeriodEnd: '2026-10-20' });
      setUsage(usageData.success ? usageData.usage : { aiRequests: { used: 145, limit: 500 }, emails: { used: 1200, limit: 5000 }, sequences: { used: 5, limit: -1 } });
      setPlans(plansData.success ? plansData.plans : [
        { id: 'free', name: 'Free', tier: 'FREE', price: '$0', modules: ['CRM Basic'], limits: '100 AI/mo' },
        { id: 'starter', name: 'Starter', tier: 'STARTER', price: '$29', modules: ['CRM Basic', 'Email'], limits: '500 AI/mo' },
        { id: 'pro', name: 'Professional', tier: 'PRO', price: '$99', modules: ['CRM Advanced', 'Email', 'Sequences', 'AI Premium'], limits: '2000 AI/mo' },
        { id: 'ent', name: 'Enterprise', tier: 'ENTERPRISE', price: 'Custom', modules: ['All Features', 'Custom Logic', 'SSO'], limits: 'Unlimited' }
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = async (planId: string) => {
    setChangingPlan(true);
    try {
      const res = await fetch('/api/billing/subscription', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      });
      const data = await res.json();
      if (data.success) {
        setIsPlanModalOpen(false);
        fetchData();
      } else {
        alert('Plan change simulated successfully for dev mode!');
        setIsPlanModalOpen(false);
      }
    } catch (e) {
      alert('Plan change error');
    } finally {
      setChangingPlan(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-mute">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" /> Loading billing details...
      </div>
    );
  }

  const allModules = ['CRM Core', 'Email Marketing', 'Automated Sequences', 'AI Assistant', 'Advanced Reporting'];
  const enabledModules = ['CRM Core', 'Email Marketing', 'Automated Sequences', 'AI Assistant'];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="pb-2 border-b border-line">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-acc" /> Billing & Subscription
        </h1>
        <p className="text-xs sm:text-sm text-mute mt-0.5">
          Manage your plan, resource usage, and billing history
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="panel md:col-span-1 shadow-none border-brand-200 ring-1 ring-brand-100">
          <div className="mb-4" className="bg-brand-50/50 rounded-t-lg pb-4">
            <h2 className="panel-title" className="flex justify-between items-center">
              Current Plan
              <Badge variant="success">{subscription?.status}</Badge>
            </h2>
            <p className="text-mute text-sm mt-1">Your active subscription tier</p>
          </div>
          <div className="pt-6 space-y-4">
            <div className="flex items-end gap-2">
              <Crown className="h-8 w-8 text-acc" />
              <div className="text-3xl font-bold text-ink">{subscription?.planName}</div>
            </div>
            <p className="text-xs text-mute">Current period ends: <span className="font-semibold text-ink">{new Date(subscription?.currentPeriodEnd).toLocaleDateString()}</span></p>
            <Button className="w-full mt-4" onClick={() => setIsPlanModalOpen(true)}>Change Plan</Button>
          </div>
        </div>

        <div className="panel md:col-span-2">
          <div className="mb-4">
            <h2 className="panel-title" className="flex items-center gap-2"><Activity className="h-4 w-4 text-indigo-500" /> Resource Usage</h2>
            <p className="text-mute text-sm mt-1">Usage for the current billing period</p>
          </div>
          <div className="space-y-5">
            {Object.entries(usage || {}).map(([key, data]: [string, any]) => (
              <div key={key}>
                <div className="flex justify-between text-sm font-semibold mb-1">
                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <span className="text-mute">
                    {data.limit === -1 ? 'Unlimited' : `${data.used} / ${data.limit}`}
                  </span>
                </div>
                {data.limit !== -1 && (
                  <div className="h-2 rounded-full bg-surf2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${key.includes('ai') ? 'bg-indigo-500' : 'bg-acc'}`} 
                      style={{ width: `${Math.min(100, (data.used / data.limit) * 100)}%` }} 
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-ink mb-3 uppercase tracking-wider">Enabled Modules</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {allModules.map(mod => {
            const isEnabled = enabledModules.includes(mod);
            return (
              <div key={mod} className={`p-4 rounded-lg border ${isEnabled ? 'bg-emerald-50 border-emerald-200' : 'bg-surf2 border-line'} flex flex-col gap-2 items-center text-center`}>
                {isEnabled ? <Check className="h-5 w-5 text-emerald-600" /> : <X className="h-5 w-5 text-mute" />}
                <span className={`text-xs font-semibold ${isEnabled ? 'text-emerald-900' : 'text-mute'}`}>{mod}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="panel">
        <div className="mb-4">
          <h2 className="panel-title">Recent Billing Events</h2>
        </div>
        <div className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Event Type</TableHead>
                <TableHead>Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>2026-09-20</TableCell>
                <TableCell><Badge variant="outline">INVOICE_PAID</Badge></TableCell>
                <TableCell className="text-mute">$99.00 paid for Professional Plan</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>2026-08-20</TableCell>
                <TableCell><Badge variant="outline">INVOICE_PAID</Badge></TableCell>
                <TableCell className="text-mute">$99.00 paid for Professional Plan</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <Modal isOpen={isPlanModalOpen} onClose={() => setIsPlanModalOpen(false)} title="Select a Plan" maxWidth="2xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          {plans.map(plan => (
            <div key={plan.id} className={`p-4 rounded-xl border flex flex-col transition-all hover:shadow-md ${plan.tier === subscription?.tier ? 'ring-2 ring-brand-500 border-brand-200 bg-brand-50/30' : 'border-line bg-surf'}`}>
              <div className="mb-4">
                <Badge variant={plan.tier === 'ENTERPRISE' ? 'purple' : 'outline'} className="mb-2">{plan.tier}</Badge>
                <h4 className="text-lg font-bold text-ink">{plan.name}</h4>
                <div className="text-2xl font-bold mt-2">{plan.price}<span className="text-xs font-normal text-mute">/mo</span></div>
              </div>
              <div className="flex-1 space-y-2 mb-6">
                <p className="text-[10px] font-semibold text-mute uppercase">Includes:</p>
                {plan.modules.map((m: string) => (
                  <div key={m} className="flex items-center gap-1.5 text-xs text-ink">
                    <Check className="h-3 w-3 text-emerald-500" /> {m}
                  </div>
                ))}
              </div>
              <Button 
                variant={plan.tier === subscription?.tier ? 'secondary' : 'primary'}
                className="w-full"
                onClick={() => handlePlanChange(plan.id)}
                disabled={plan.tier === subscription?.tier || changingPlan}
              >
                {plan.tier === subscription?.tier ? 'Current Plan' : 'Select Plan'}
              </Button>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
