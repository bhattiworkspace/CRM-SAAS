'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
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
    <section aria-labelledby="pt">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 id="pt" className="font-head font-semibold text-3xl">Deals</h1>
          <p className="text-mute">{pipeline?.name || 'Sales Pipeline'} • Track your active deals</p>
        </div>
        <button className="btn-primary" onClick={() => setIsCreateOpen(true)}>
          <Plus className="ic" /> New deal
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-mute flex flex-col items-center">
          <RefreshCw className="ic animate-spin mb-2" />
          <span>Loading sales pipeline...</span>
        </div>
      ) : !pipeline || pipeline.stages.length === 0 ? (
        <div className="p-12 text-center text-mute empty-state">
          <b>No active pipeline stages configured.</b>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-start">
          {pipeline.stages.map((stage) => {
            const stageDeals = deals.filter((d) => d.stageId === stage.id);
            const totalStageValue = stageDeals.reduce((sum, d) => sum + d.amount, 0);

            return (
              <div key={stage.id} className="kcol">
                <h2 className="kcol-title">
                  {stage.name}
                  <span>{stageDeals.length}</span>
                </h2>
                <div className="text-[11px] font-bold text-mute mb-2">
                  ${totalStageValue.toLocaleString()}
                </div>
                
                {stageDeals.length > 0 ? (
                  stageDeals.map((deal) => (
                    <div key={deal.id} className="kcard group">
                      <b className="truncate text-ink">{deal.name}</b>
                      {deal.company && <span className="text-mute text-xs truncate">{deal.company.name}</span>}
                      {!deal.company && deal.owner && <span className="text-mute text-xs truncate">{deal.owner.name}</span>}
                      <div className="flex justify-between items-center mt-1">
                        <span className="kcard-val">${deal.amount.toLocaleString()}</span>
                      </div>
                      <select
                        value={deal.stageId}
                        onChange={(e) => handleMoveStage(deal.id, e.target.value)}
                        className="mt-2 w-full text-[10px] bg-bg border border-line rounded px-1.5 py-1 text-ink focus:outline-none focus:border-gold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        {pipeline.stages.map((st) => (
                          <option key={st.id} value={st.id}>Move to {st.name}</option>
                        ))}
                      </select>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-[11px] text-mute border border-dashed border-line rounded">
                    No deals
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Deal">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <label className="field">
            <span>Deal Name</span>
            <input 
              required 
              className="input" 
              value={createForm.name} 
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} 
            />
          </label>
          <label className="field">
            <span>Deal Amount ($)</span>
            <input 
              type="number" 
              required 
              className="input" 
              value={createForm.amount} 
              onChange={(e) => setCreateForm({ ...createForm, amount: Number(e.target.value) })} 
            />
          </label>
          {pipeline && (
            <label className="field">
              <span>Pipeline Stage</span>
              <select 
                className="input"
                value={createForm.stageId}
                onChange={(e) => setCreateForm({ ...createForm, stageId: e.target.value })}
              >
                {pipeline.stages.map((st) => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>
            </label>
          )}
          <div className="pt-4 flex justify-end gap-2 border-t border-line">
            <button type="button" className="btn" onClick={() => setIsCreateOpen(false)}>Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Saving...' : 'Save Deal'}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
