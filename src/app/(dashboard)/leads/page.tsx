'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, Search, ArrowRightLeft, Plus, RefreshCw, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';

interface LeadItem {
  id: string;
  firstName: string;
  lastName: string;
  title?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  status: string;
  priority: string;
  source: string;
  createdAt: string;
  owner?: { id: string; name: string };
  estimatedValue?: number;
  tasks?: Array<{
    id: string;
    title: string;
    dueDate: string | null;
    status: string;
  }>;
}


export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const searchParamsHook = require('next/navigation').useSearchParams();
  const router = require('next/navigation').useRouter();
  const initialSearch = searchParamsHook ? searchParamsHook.get('search') || '' : '';
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [currency, setCurrency] = useState('$');

  // Import State
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const leads = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((h, i) => {
          if (h.includes('first')) row.firstName = values[i];
          else if (h.includes('last')) row.lastName = values[i];
          else if (h.includes('email')) row.email = values[i];
          else if (h.includes('phone')) row.phone = values[i];
          else if (h.includes('company')) row.companyName = values[i];
          else if (h.includes('title')) row.title = values[i];
        });
        return row;
      }).filter(r => r.firstName && r.lastName);

      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads })
      });
      const data = await res.json();
      
      if (data.success) {
        alert(`Imported ${data.imported} leads. Duplicates skipped: ${data.duplicates}. Errors: ${data.errors}.`);
        setIsImportOpen(false);
        fetchLeads();
      } else {
        alert(data.error || 'Import failed');
      }
    } catch (err) {
      alert('Error parsing or importing CSV');
    } finally {
      setIsImporting(false);
      if (e.target) e.target.value = '';
    }
  };

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let url = '/api/leads';
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        setLeads(data.leads);
        if (data.currency) setCurrency(data.currency);
      } else {
        setError(data.error || 'Failed to fetch leads');
      }
    } catch (err) {
      setError('Network error loading leads');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchLeads();
      } else {
        alert(data.error || 'Failed to update status');
      }
    } catch (err) {
      alert('Error updating status');
    }
  };

  const isToday = (dateString: string | null) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const isTomorrow = (dateString: string | null) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.getDate() === tomorrow.getDate() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getFullYear() === tomorrow.getFullYear();
  };

  const todayLeads = leads.filter(l => l.tasks?.some(t => isToday(t.dueDate)));
  const tomorrowLeads = leads.filter(l => l.tasks?.some(t => isTomorrow(t.dueDate)));

  const LeadTable = ({ leads: tableLeads }: { leads: LeadItem[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Lead Name</TableHead>
          <TableHead>Company</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Value</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Assignee</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tableLeads.map((lead) => (
          <TableRow key={lead.id}>
            <TableCell className="font-bold text-slate-900">
              <a href={`/leads/${lead.id}`} className="hover:text-brand-600 hover:underline">
                {lead.firstName} {lead.lastName}
              </a>
              {lead.title && <span className="block text-[10px] font-normal text-slate-500">{lead.title}</span>}
            </TableCell>
            <TableCell className="font-semibold text-slate-800">
              {lead.companyName || '—'}
            </TableCell>
            <TableCell className="text-slate-600">
              {lead.email || lead.phone || '—'}
            </TableCell>
            <TableCell className="text-slate-600 font-medium">
              {lead.estimatedValue ? `${currency}${lead.estimatedValue.toLocaleString()}` : '—'}
            </TableCell>
            <TableCell>
              <select
                value={lead.status}
                onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="NEW">NEW</option>
                <option value="CONTACTED">CONTACTED</option>
                <option value="QUALIFIED">QUALIFIED</option>
                <option value="PROPOSAL">PROPOSAL</option>
                <option value="CLOSED_WON">CLOSED WON</option>
                <option value="CLOSED_LOST">CLOSED LOST</option>
              </select>
            </TableCell>
            <TableCell>
              <Badge
                variant={
                  lead.priority === 'URGENT'
                    ? 'danger'
                    : lead.priority === 'HIGH'
                    ? 'warning'
                    : 'outline'
                }
              >
                {lead.priority}
              </Badge>
            </TableCell>
            <TableCell className="text-slate-500 text-[11px]">{lead.source}</TableCell>
            <TableCell className="text-slate-700 font-medium">{lead.owner?.name || 'Unassigned'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-brand-600" /> Leads Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage potential business leads and convert qualified prospects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsImportOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" /> Import CSV
          </Button>
          <Button onClick={() => router.push('/leads/new')} className="gap-2">
            <Plus className="h-4 w-4" /> Add Lead
          </Button>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                statusFilter === st
                  ? 'bg-brand-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Filter leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Leads Data Table */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin text-brand-600" />
          <span>Loading leads directory...</span>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-6 text-center text-xs text-rose-700 font-medium">
          {error}
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-xs text-slate-500 space-y-3">
          <UserPlus className="h-8 w-8 text-slate-300 mx-auto" />
          <p className="font-semibold text-slate-700">No leads found.</p>
          <p>Import prospects from Business Finder or create a lead manually to get started.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Today's Follow up */}
          {todayLeads.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                Today's Follow up
              </h2>
              <LeadTable leads={todayLeads} />
            </div>
          )}

          {/* Tomorrow's Follow up */}
          {tomorrowLeads.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                Tomorrow's Follow up
              </h2>
              <LeadTable leads={tomorrowLeads} />
            </div>
          )}

          {/* All Leads */}
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-3">All Leads</h2>
            <LeadTable leads={leads} />
          </div>
        </div>
      )}
      {/* Import Modal */}
      <Modal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} title="Import Leads via CSV">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Upload a CSV file with columns like: <strong>firstName, lastName, email, phone, companyName, title</strong>.
          </p>
          <div className="border-2 border-dashed border-slate-300 rounded-md p-8 text-center">
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleFileUpload} 
              disabled={isImporting}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
            />
            {isImporting && <p className="mt-4 text-xs text-brand-600 font-semibold animate-pulse">Processing import...</p>}
          </div>
          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsImportOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
