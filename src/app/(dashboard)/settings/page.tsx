'use client';

import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Building2, Users, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { appConfig } from '@/config/app.config';

interface OrgData {
  id: string;
  name: string;
  slug: string;
  industry?: string;
  phone?: string;
  email?: string;
  website?: string;
  timezone?: string;
  currency?: string;
  memberships: Array<{
    id: string;
    user: { name: string; email: string };
    role: { name: string };
    status: string;
  }>;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'ORGANIZATION' | 'TEAM'>('ORGANIZATION');
  const [org, setOrg] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    industry: '',
    phone: '',
    email: '',
    website: '',
    timezone: 'UTC',
    currency: 'USD',
  });

  useEffect(() => {
    async function fetchOrg() {
      try {
        const res = await fetch('/api/settings/organization');
        const data = await res.json();
        if (data.success && data.organization) {
          setOrg(data.organization);
          setForm({
            name: data.organization.name || '',
            industry: data.organization.industry || '',
            phone: data.organization.phone || '',
            email: data.organization.email || '',
            website: data.organization.website || '',
            timezone: data.organization.timezone || 'UTC',
            currency: data.organization.currency || 'USD',
          });
        }
      } catch (err) {
        console.error('Error loading organization settings:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchOrg();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings/organization', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        alert('Organization settings saved successfully!');
      } else {
        alert(data.error || 'Save failed');
      }
    } catch (err) {
      alert('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-brand-600" /> Settings & Organization
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configure CRM branding, team permissions, and tenant details
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex gap-2">
        <button
          onClick={() => setActiveTab('ORGANIZATION')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-2 ${
            activeTab === 'ORGANIZATION'
              ? 'bg-brand-600 text-white shadow-2xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Building2 className="h-3.5 w-3.5" /> Organization Profile
        </button>
        <button
          onClick={() => setActiveTab('TEAM')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-2 ${
            activeTab === 'TEAM'
              ? 'bg-brand-600 text-white shadow-2xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Users className="h-3.5 w-3.5" /> Team Members & Roles
        </button>
        <a
          href="/settings/modules"
          className="px-4 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200 ml-auto border border-slate-300"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-brand-600" /> Manage Module Controls & Toggles &rarr;
        </a>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin text-brand-600" />
          <span>Loading settings...</span>
        </div>
      ) : activeTab === 'ORGANIZATION' ? (
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-2xs space-y-6">
          <form onSubmit={handleSave} className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
              General Organization Info
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Organization Name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                label="Industry"
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Primary Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <Input
                label="Support Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Website URL"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
              />
              <Select
                label="Default Timezone"
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                options={[
                  { value: 'UTC', label: 'UTC (Universal Coordinated Time)' },
                  { value: 'America/New_York', label: 'America / New York (EST)' },
                  { value: 'America/Chicago', label: 'America / Chicago (CST)' },
                  { value: 'America/Los_Angeles', label: 'America / Los Angeles (PST)' },
                  { value: 'Europe/London', label: 'Europe / London (GMT)' },
                ]}
              />
              <Select
                label="Currency"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                options={[
                  { value: 'USD', label: 'US Dollar ($)' },
                  { value: 'EUR', label: 'Euro (€)' },
                  { value: 'GBP', label: 'British Pound (£)' },
                  { value: 'INR', label: 'Indian Rupee (₹)' },
                  { value: 'AUD', label: 'Australian Dollar (A$)' },
                  { value: 'CAD', label: 'Canadian Dollar (C$)' },
                  { value: 'JPY', label: 'Japanese Yen (¥)' },
                ]}
              />
            </div>

            <div className="pt-4 flex justify-end border-t border-slate-100">
              <Button type="submit" isLoading={saving}>
                Save Changes
              </Button>
            </div>
          </form>

          {/* Application Central Branding Config Box */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-md text-xs space-y-2">
            <span className="font-bold text-slate-800 uppercase tracking-wider block text-[10px]">
              Central Application Branding Config (`src/config/app.config.ts`):
            </span>
            <div className="grid grid-cols-2 gap-2 text-slate-600 font-mono">
              <div>appName: <strong>{appConfig.appName}</strong></div>
              <div>companyName: <strong>{appConfig.companyName}</strong></div>
              <div>primaryColor: <strong>{appConfig.primaryColor}</strong></div>
              <div>supportEmail: <strong>{appConfig.supportEmail}</strong></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Organization Members & Roles</h2>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {org?.memberships.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-bold text-slate-900">{m.user.name}</TableCell>
                  <TableCell className="text-slate-600">{m.user.email}</TableCell>
                  <TableCell>
                    <Badge variant="purple" className="gap-1">
                      <ShieldCheck className="h-3 w-3" /> {m.role.name}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.status === 'ACTIVE' ? 'success' : 'default'}>{m.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
