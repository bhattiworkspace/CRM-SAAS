'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Building2, Search, Plus, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';

interface CompanyItem {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  phone?: string;
  website?: string;
  providerId?: string;
  _count?: { contacts: number; deals: number };
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    domain: '',
    industry: '',
    phone: '',
    website: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let url = '/api/companies';
      if (searchQuery) url += `?search=${encodeURIComponent(searchQuery)}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setCompanies(data.companies);
      } else {
        setError(data.error || 'Failed to load companies');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (data.success) {
        setIsCreateOpen(false);
        setCreateForm({ name: '', domain: '', industry: '', phone: '', website: '' });
        fetchCompanies();
      } else {
        alert(data.error || 'Failed to create company');
      }
    } catch (err) {
      alert('Error creating company');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-brand-600" /> Company Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage client and target business accounts
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Company
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search companies by name or website..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin text-brand-600" />
          <span>Loading companies...</span>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-6 text-center text-xs text-rose-700">
          {error}
        </div>
      ) : companies.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-xs text-slate-500 space-y-2">
          <Building2 className="h-8 w-8 text-slate-300 mx-auto" />
          <p className="font-semibold text-slate-700">No companies found.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company Name</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Contacts</TableHead>
              <TableHead>Deals</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => (
              <TableRow key={company.id}>
                <TableCell className="font-bold text-slate-900">
                  <a href={`/companies/${company.id}`} className="hover:text-brand-600 hover:underline">
                    {company.name}
                  </a>
                  {company.providerId && (
                    <span className="block text-[10px] text-brand-600 font-normal">Imported Provider Record</span>
                  )}
                </TableCell>
                <TableCell className="text-slate-600">{company.industry || '—'}</TableCell>
                <TableCell>
                  {company.website ? (
                    <a
                      href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-brand-600 hover:underline text-xs"
                    >
                      {company.website} <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell className="text-slate-600">{company.phone || '—'}</TableCell>
                <TableCell className="font-semibold text-slate-800">{company._count?.contacts || 0}</TableCell>
                <TableCell className="font-semibold text-slate-800">{company._count?.deals || 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Add Company">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            label="Company Name"
            required
            value={createForm.name}
            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
          />
          <Input
            label="Industry"
            value={createForm.industry}
            onChange={(e) => setCreateForm({ ...createForm, industry: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Website"
              value={createForm.website}
              onChange={(e) => setCreateForm({ ...createForm, website: e.target.value })}
            />
            <Input
              label="Phone"
              value={createForm.phone}
              onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
            />
          </div>
          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save Company
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
