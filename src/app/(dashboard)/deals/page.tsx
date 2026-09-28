'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { KanbanSquare, ListFilter, Plus, RefreshCw, DollarSign, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';

interface StageItem {
  id: string;
  name: string;
  order: number;
  probability: number;
  color: string;
}

interface DealItem {
  id: string;
  name: string;
  amount: number;
  status: string;
  stageId: string;
  expectedCloseDate?: string;
  company?: { id: string; name: string };
  stage: StageItem;
  owner?: { id: string; name: string };
}

interface PipelineData {
  id: string;
  name: string;
  stages: StageItem[];
}

export default function DealsPage() {
  const [pipeline, setPipeline] = useState<PipelineData | null>(null);
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'KANBAN' | 'TABLE'>('KANBAN');

  // Create Deal Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    amount: 10000,
    stageId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/deals');
      const data = await res.json();
      if (data.success) {
        setPipeline(data.pipeline);
        setDeals(data.deals);
        if (data.pipeline?.stages?.length > 0 && !createForm.stageId) {
          setCreateForm((prev) => ({ ...prev, stageId: data.pipeline.stages[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch deals:', err);
    } finally {
      setLoading(false);
    }
  }, [createForm.stageId]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const handleMoveStage = async (dealId: string, targetStageId: string) => {
    try {
      const res = await fetch('/api/deals/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId, stageId: targetStageId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchDeals();
      } else {
        alert(data.error || 'Failed to move deal');
      }
    } catch (err) {
      alert('Error moving deal stage');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pipeline) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createForm,
          pipelineId: pipeline.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsCreateOpen(false);
        setCreateForm({ name: '', amount: 10000, stageId: pipeline.stages[0]?.id || '' });
        fetchDeals();
      } else {
        alert(data.error || 'Failed to create deal');
      }
    } catch (err) {
      alert('Error creating deal');
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
            <KanbanSquare className="h-6 w-6 text-brand-600" /> Sales Pipeline
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {pipeline?.name || 'Database-Driven Pipeline'} • Drag and update sales deals
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-md flex gap-1 border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('KANBAN')}
              className={`px-3 py-1 font-semibold rounded transition-colors ${
                viewMode === 'KANBAN' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Kanban Board
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-3 py-1 font-semibold rounded transition-colors ${
                viewMode === 'TABLE' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Table View
            </button>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New Deal
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin text-brand-600" />
          <span>Loading sales pipeline...</span>
        </div>
      ) : !pipeline || pipeline.stages.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-xs text-slate-500">
          No active pipeline stages configured.
        </div>
      ) : viewMode === 'KANBAN' ? (
        /* Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-start overflow-x-auto pb-4">
          {pipeline.stages.map((stage) => {
            const stageDeals = deals.filter((d) => d.stageId === stage.id);
            const totalStageValue = stageDeals.reduce((sum, d) => sum + d.amount, 0);

            return (
              <div
                key={stage.id}
                className="bg-slate-100/70 border border-slate-200 rounded-lg flex flex-col min-w-[240px] shadow-2xs"
              >
                {/* Column Header */}
                <div className="p-3 border-b border-slate-200 bg-white rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />
                      {stage.name}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
                      {stageDeals.length}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] font-bold text-slate-600">
                    ${totalStageValue.toLocaleString()}
                  </div>
                </div>

                {/* Cards Container */}
                <div className="p-2 space-y-2.5 flex-1 min-h-[350px]">
                  {stageDeals.length > 0 ? (
                    stageDeals.map((deal) => (
                      <div
                        key={deal.id}
                        className="bg-white p-3 rounded-md border border-slate-200 shadow-2xs hover:shadow-md transition-shadow space-y-2 group"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <a href={`/deals/${deal.id}`} className="font-bold text-xs text-slate-900 leading-tight hover:text-brand-600 hover:underline">
                            {deal.name}
                          </a>
                          <Badge variant={deal.status === 'WON' ? 'success' : deal.status === 'LOST' ? 'danger' : 'info'}>
                            {deal.status}
                          </Badge>
                        </div>

                        {deal.company && (
                          <p className="text-[11px] text-slate-500 font-medium truncate">{deal.company.name}</p>
                        )}

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                          <span className="font-extrabold text-slate-900 flex items-center gap-0.5">
                            <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                            {deal.amount.toLocaleString()}
                          </span>
                          {deal.owner && <span className="text-[10px] text-slate-400">{deal.owner.name}</span>}
                        </div>

                        {/* Move Stage Selector */}
                        <div className="pt-2 border-t border-slate-100">
                          <select
                            value={deal.stageId}
                            onChange={(e) => handleMoveStage(deal.id, e.target.value)}
                            className="w-full text-[10px] font-semibold bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-700 focus:outline-none"
                          >
                            {pipeline.stages.map((st) => (
                              <option key={st.id} value={st.id}>
                                Move to: {st.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-[11px] text-slate-400 border border-dashed border-slate-200 rounded">
                      No deals
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 uppercase">
              <tr>
                <th className="p-3">Deal Name</th>
                <th className="p-3">Stage</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">Company</th>
                <th className="p-3">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deals.map((deal) => (
                <tr key={deal.id} className="hover:bg-slate-50/80">
                  <td className="p-3 font-bold text-slate-900">
                    <a href={`/deals/${deal.id}`} className="hover:text-brand-600 hover:underline">
                      {deal.name}
                    </a>
                  </td>
                  <td className="p-3 font-semibold text-brand-600">{deal.stage?.name}</td>
                  <td className="p-3 font-extrabold text-slate-900">${deal.amount.toLocaleString()}</td>
                  <td className="p-3">
                    <Badge variant={deal.status === 'WON' ? 'success' : deal.status === 'LOST' ? 'danger' : 'info'}>
                      {deal.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-slate-600">{deal.company?.name || '—'}</td>
                  <td className="p-3 text-slate-600">{deal.owner?.name || 'Unassigned'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Deal">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            label="Deal Name"
            required
            value={createForm.name}
            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
          />
          <Input
            label="Deal Amount ($)"
            type="number"
            required
            value={createForm.amount}
            onChange={(e) => setCreateForm({ ...createForm, amount: Number(e.target.value) })}
          />
          {pipeline && (
            <Select
              label="Pipeline Stage"
              value={createForm.stageId}
              onChange={(e) => setCreateForm({ ...createForm, stageId: e.target.value })}
              options={pipeline.stages.map((st) => ({ value: st.id, label: st.name }))}
            />
          )}
          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save Deal
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
