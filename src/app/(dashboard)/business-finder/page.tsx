'use client';

import React, { useState } from 'react';
import { Search, Building2, Check, Download, ExternalLink, Star, RefreshCw, CheckCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';

interface BusinessItem {
  providerId: string;
  name: string;
  category?: string;
  phone?: string;
  address?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  providerUrl?: string;
  isImported?: boolean;
}

interface ImportStats {
  totalSelected: number;
  imported: number;
  alreadyExisted: number;
  failed: number;
}

export default function BusinessFinderPage() {
  const [query, setQuery] = useState('Technology');
  const [location, setLocation] = useState('Austin, TX');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BusinessItem[]>([]);
  const [providerName, setProviderName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Import Modal & Stats
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setImportStats(null);
    try {
      const res = await fetch('/api/business-finder/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, location, category }),
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.businesses);
        setProviderName(data.providerName);
        setSelectedIds([]);
      } else {
        alert(data.error || 'Search failed');
      }
    } catch (err) {
      alert('Error searching business directory');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === results.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(results.map((r) => r.providerId));
    }
  };

  const handleBulkImport = async () => {
    setIsImporting(true);
    setImportStats(null);
    const selectedBusinesses = results.filter((r) => selectedIds.includes(r.providerId));

    try {
      const res = await fetch('/api/business-finder/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businesses: selectedBusinesses,
          createAsLead: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setImportStats(data.stats);
        // Refresh search results to update isImported flags
        handleSearch();
      } else {
        alert(data.error || 'Import failed');
      }
    } catch (err) {
      alert('Error executing bulk import');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-line">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
            <Search className="h-6 w-6 text-acc" /> Business Finder
          </h1>
          <p className="text-xs sm:text-sm text-mute mt-0.5">
            Discover potential business prospects and bulk import them directly into your CRM
          </p>
        </div>
        {selectedIds.length > 0 && (
          <Button onClick={() => setIsImportModalOpen(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Download className="h-4 w-4" /> Import Selected ({selectedIds.length})
          </Button>
        )}
      </div>

      {/* Search Filter Form */}
      <div className="bg-surf p-5 rounded-lg border border-line shadow-2xs">
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Industry / Keyword"
            placeholder="e.g. Software, Logistics, Medical"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Input
            label="Location / City"
            placeholder="e.g. Austin TX, New York, Chicago"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <div className="flex items-end">
            <Button type="submit" className="w-full gap-2" isLoading={loading}>
              <Search className="h-4 w-4" /> Search Directory
            </Button>
          </div>
        </form>
      </div>

      {/* Provider Name Badge */}
      {providerName && (
        <div className="flex items-center justify-between text-xs text-mute">
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> Data Provider Adapter: <strong>{providerName}</strong>
          </span>
          <span>Showing {results.length} normalized business records</span>
        </div>
      )}

      {/* Results Grid */}
      {loading ? (
        <div className="bg-surf border border-line rounded-lg p-12 text-center text-xs text-mute flex flex-col items-center gap-2">
          <RefreshCw className="h-6 w-6 animate-spin text-acc" />
          <span>Searching business directory...</span>
        </div>
      ) : results.length === 0 ? (
        <div className="bg-surf border border-line rounded-lg p-12 text-center text-xs text-mute space-y-2">
          <Building2 className="h-8 w-8 text-slate-300 mx-auto" />
          <p className="font-semibold text-ink">No businesses found for criteria.</p>
          <p>Try searching for broader keywords or locations.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Select All Bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-100/70 border border-line rounded-md text-xs font-semibold text-ink">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.length === results.length && results.length > 0}
                onChange={toggleSelectAll}
                className="rounded border-line text-acc h-4 w-4"
              />
              <span>Select All Results ({results.length})</span>
            </label>
            <span>{selectedIds.length} Selected</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((biz) => {
              const isSelected = selectedIds.includes(biz.providerId);
              return (
                <div
                  key={biz.providerId}
                  className={`bg-surf p-5 rounded-lg border transition-all space-y-3 relative ${
                    isSelected
                      ? 'border-brand-500 ring-2 ring-brand-100 shadow-none'
                      : 'border-line hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(biz.providerId)}
                        className="mt-1 rounded border-line text-acc h-4 w-4 cursor-pointer"
                      />
                      <div>
                        <h3 className="font-bold text-sm text-ink leading-snug">{biz.name}</h3>
                        {biz.category && (
                          <span className="text-[11px] font-medium text-mute block mt-0.5">{biz.category}</span>
                        )}
                      </div>
                    </div>
                    {biz.isImported ? (
                      <Badge variant="success" className="gap-1 shrink-0">
                        <Check className="h-3 w-3" /> Imported
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0">
                        New Result
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1 text-xs text-mute pt-1 border-t border-line">
                    {biz.address && <p className="truncate">📍 {biz.address}</p>}
                    {biz.phone && <p>📞 {biz.phone}</p>}
                    {biz.website && (
                      <p>
                        🌐{' '}
                        <a
                          href={biz.website.startsWith('http') ? biz.website : `https://${biz.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-acc hover:underline inline-flex items-center gap-0.5 font-medium"
                        >
                          {biz.website} <ExternalLink className="h-3 w-3" />
                        </a>
                      </p>
                    )}
                  </div>

                  {biz.rating && (
                    <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span>{biz.rating}</span>
                      {biz.reviewCount && <span className="text-mute font-normal">({biz.reviewCount} reviews)</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Import Wizard Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportStats(null);
        }}
        title={`Import Businesses to CRM (${selectedIds.length} Selected)`}
        description="Creates Company & Lead records automatically with duplicate resolution."
      >
        <div className="space-y-4">
          {!importStats ? (
            <>
              <p className="text-xs text-mute">
                You have selected <strong>{selectedIds.length}</strong> business prospect(s) for bulk import.
              </p>

              <div className="p-3 bg-surf2 border border-line rounded-md text-xs space-y-1">
                <p className="font-semibold text-ink">Duplicate Handling Strategy:</p>
                <p className="text-mute">• Checks existing CRM Companies by Provider ID, website, or phone.</p>
                <p className="text-mute">• Reuses existing Company if matched; creates new Leads tied to Company.</p>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-line">
                <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBulkImport} isLoading={isImporting} className="bg-emerald-600 hover:bg-emerald-700">
                  Execute Bulk Import
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md space-y-2 text-xs">
                <p className="font-bold text-emerald-800 text-sm flex items-center gap-1.5">
                  <CheckCircle className="h-5 w-5" /> Import Execution Complete!
                </p>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200 text-emerald-900 font-medium">
                  <div>• Total Selected: <strong>{importStats.totalSelected}</strong></div>
                  <div>• Successfully Imported: <strong className="text-emerald-700">{importStats.imported}</strong></div>
                  <div>• Already Existed: <strong className="text-amber-700">{importStats.alreadyExisted}</strong></div>
                  <div>• Failed: <strong>{importStats.failed}</strong></div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportStats(null);
                  }}
                >
                  Close & Refresh View
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
