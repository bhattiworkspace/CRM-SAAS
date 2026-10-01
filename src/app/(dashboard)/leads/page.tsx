'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, RefreshCw, Upload, Search } from 'lucide-react';
import { updateLeadStatusAction } from '@/app/actions/leads';
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
  const searchParamsHook = useSearchParams();
  const router = useRouter();
  
  const initialSearch = searchParamsHook ? searchParamsHook.get('search') || '' : '';
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [currency, setCurrency] = useState('$');

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

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
      await updateLeadStatusAction(leadId, newStatus);
      fetchLeads();
    } catch (err) {
      alert('Error updating status');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const importedLeads = lines.slice(1).map(line => {
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
        body: JSON.stringify({ leads: importedLeads })
      });
      const data = await res.json();
      
      if (data.success) {
        alert(`Imported ${data.imported} leads. Duplicates skipped: ${data.duplicates}.`);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW': return <span className="badge indigo">New</span>;
      case 'CONTACTED': return <span className="badge yellow">Contacted</span>;
      case 'QUALIFIED': return <span className="badge blue">Qualified</span>;
      case 'PROPOSAL': return <span className="badge blue">Proposal</span>;
      case 'CLOSED_WON': return <span className="badge green">Won</span>;
      case 'CLOSED_LOST': return <span className="badge red">Lost</span>;
      default: return <span className="badge indigo">{status}</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'HIGH':
      case 'URGENT': return <span className="badge red">{priority}</span>;
      case 'MEDIUM': return <span className="badge yellow">Medium</span>;
      case 'LOW': return <span className="badge green">Low</span>;
      default: return <span className="badge indigo">{priority}</span>;
    }
  };

  return (
    <section aria-labelledby="pt">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
        <div>
          <h1 id="pt" className="font-head font-semibold text-3xl">Leads</h1>
          <p className="text-mute">Track every lead from first touch to close.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn" onClick={() => setIsImportOpen(true)}>
            <Upload className="ic inline-block mr-1" /> Import CSV
          </button>
          <button className="btn-primary" onClick={() => router.push('/leads/new')}>
            <Plus className="ic" /> New lead
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap my-4">
        <select 
          className="input w-auto min-w-[140px]" 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All statuses</option>
          <option value="NEW">New</option>
          <option value="CONTACTED">Contacted</option>
          <option value="QUALIFIED">Qualified</option>
          <option value="PROPOSAL">Proposal</option>
        </select>
        
        <label className="relative flex-1 max-w-sm ml-auto">
          <Search className="ic absolute left-2.5 top-1/2 -translate-y-1/2 text-mute" />
          <input 
            type="search" 
            placeholder="Search leads..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-8 w-full"
          />
        </label>
      </div>

      <div className="panel p-0 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <caption className="sr-only">Lead list</caption>
          <thead>
            <tr className="text-mute text-xs font-mono uppercase tracking-wide">
              <th className="th">Lead</th>
              <th className="th">Company</th>
              <th className="th">Status</th>
              <th className="th">Priority</th>
              <th className="th">Value</th>
              <th className="th">Owner</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="td text-center py-10">
                  <RefreshCw className="ic animate-spin mx-auto text-mute mb-2" />
                  <span className="text-mute">Loading leads...</span>
                </td>
              </tr>
            ) : error ? (
              <tr><td colSpan={6} className="td text-center py-10 text-down">{error}</td></tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={6} className="td text-center py-10">
                  <div className="empty-state">
                    <b>No leads found.</b>
                    <span className="text-mute text-sm">Import prospects or create a lead manually to get started.</span>
                  </div>
                </td>
              </tr>
            ) : (
              leads.map(lead => (
                <tr key={lead.id} className="row-lk" onClick={() => router.push(`/leads/${lead.id}`)}>
                  <td className="td font-medium text-ink">
                    {lead.firstName} {lead.lastName}
                    {lead.title && <span className="block text-xs font-normal text-mute">{lead.title}</span>}
                  </td>
                  <td className="td">{lead.companyName || '—'}</td>
                  <td className="td" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={lead.status}
                      onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                      className="text-xs bg-transparent border border-line rounded px-1.5 py-0.5 hover:border-gold outline-none focus:border-gold cursor-pointer"
                    >
                      <option value="NEW">New</option>
                      <option value="CONTACTED">Contacted</option>
                      <option value="QUALIFIED">Qualified</option>
                      <option value="PROPOSAL">Proposal</option>
                      <option value="CLOSED_WON">Closed Won</option>
                      <option value="CLOSED_LOST">Closed Lost</option>
                    </select>
                  </td>
                  <td className="td">{getPriorityBadge(lead.priority)}</td>
                  <td className="td">{lead.estimatedValue ? `${currency}${lead.estimatedValue.toLocaleString()}` : '—'}</td>
                  <td className="td">{lead.owner?.name || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} title="Import Leads via CSV">
        <div className="space-y-4">
          <p className="text-sm text-mute">
            Upload a CSV file with columns like: <strong>firstName, lastName, email, phone, companyName, title</strong>.
          </p>
          <div className="border-2 border-dashed border-line rounded p-8 text-center bg-surf2">
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleFileUpload} 
              disabled={isImporting}
              className="block w-full text-sm text-mute file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-acc file:text-bg hover:file:opacity-90 cursor-pointer"
            />
            {isImporting && <p className="mt-4 text-xs text-acc font-semibold animate-pulse">Processing import...</p>}
          </div>
          <div className="pt-4 flex justify-end gap-2 border-t border-line">
            <button type="button" className="btn" onClick={() => setIsImportOpen(false)}>Cancel</button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
