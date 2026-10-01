'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, DollarSign, Building, Clock, Activity, CheckSquare, MessageSquare, Sparkles, Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [deal, setDeal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [activeTab, setActiveTab] = useState('activity');

  const fetchDeal = useCallback(async () => {
    try {
      const res = await fetch(`/api/deals/${id}`);
      const data = await res.json();
      if (data.success) {
        setDeal(data.deal);
      } else {
        setError(data.error || 'Failed to fetch deal');
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDeal();
  }, [fetchDeal]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this deal?')) return;
    try {
      const res = await fetch(`/api/deals/${id}`, { method: 'DELETE' });
      if (res.ok) router.push('/deals');
    } catch (e) {
      alert('Failed to delete');
    }
  };

  const handleGenerateSummary = async () => {
    setLoadingAi(true);
    try {
      const res = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'DEAL', entityId: id })
      });
      const data = await res.json();
      if (data.success) setAiSummary(data.data.content);
    } catch (e) {
      alert('AI generation failed');
    } finally {
      setLoadingAi(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle,
          entityType: 'DEAL',
          entityId: id,
          priority: 'MEDIUM'
        })
      });
      if (res.ok) {
        setNewTaskTitle('');
        fetchDeal();
      }
    } catch (e) {
      alert('Failed to create task');
    }
  };

  if (loading) return <div className="p-8 text-center text-mute">Loading deal details...</div>;
  if (error || !deal) return <div className="p-8 text-center text-rose-500">{error || 'Deal not found'}</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-line">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.push('/deals')} className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
              {deal.name}
            </h1>
            <p className="text-sm text-mute">{deal.company?.name || 'No Company'} • {deal.stage?.name || 'No Stage'}</p>
          </div>
          <Badge variant={deal.status === 'WON' ? 'success' : deal.status === 'LOST' ? 'danger' : 'default'} className="ml-2">
            {deal.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 text-rose-600 hover:bg-rose-50 border-rose-200" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Left Column: Properties */}
        <div className="space-y-6">
          <div className="panel">
            <div className="mb-4" className="pb-3">
              <h2 className="panel-title" className="text-sm font-bold text-mute uppercase">Deal Information</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3 text-sm">
                <DollarSign className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="font-extrabold text-ink">${deal.amount?.toLocaleString()}</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <Building className="h-4 w-4 text-mute shrink-0 mt-0.5" />
                <span className="font-medium text-ink">{deal.company?.name || '—'}</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <Clock className="h-4 w-4 text-mute shrink-0 mt-0.5" />
                <div>
                  <span className="text-mute text-xs block">Expected Close</span>
                  <span className="font-medium text-ink">{deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString() : '—'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="panel border-brand-200 bg-brand-50/30">
            <div className="mb-4" className="pb-3 flex flex-row items-center justify-between">
              <h2 className="panel-title" className="text-sm font-bold text-acc flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> AI Assistant
              </h2>
            </div>
            <div>
              {aiSummary ? (
                <div className="text-xs text-ink whitespace-pre-wrap">{aiSummary}</div>
              ) : (
                <div className="text-center">
                  <Button size="sm" onClick={handleGenerateSummary} isLoading={loadingAi} className="w-full bg-acc hover:bg-brand-700">
                    Analyze Deal Risk
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Timeline & Interaction */}
        <div className="md:col-span-2">
          <Tabs 
            tabs={[
              { id: 'activity', label: 'Activities' },
              { id: 'tasks', label: 'Tasks' },
              { id: 'communications', label: 'Communications' }
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            className="mb-4"
          />
          
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <div className="panel">
                <div className="p-4">
                  <div className="space-y-4">
                    {deal.activities?.length > 0 ? deal.activities.map((act: any) => (
                      <div key={act.id} className="flex gap-3 text-sm border-b border-line pb-3 last:border-0">
                        <div className="h-8 w-8 rounded-full bg-surf2 flex items-center justify-center shrink-0">
                          <Activity className="h-4 w-4 text-mute" />
                        </div>
                        <div>
                          <p className="font-semibold text-ink">{act.title}</p>
                          <p className="text-mute text-xs mt-0.5">{act.description}</p>
                          <span className="text-[10px] text-mute block mt-1">
                            {new Date(act.createdAt).toLocaleString()} by {act.createdBy?.name}
                          </span>
                        </div>
                      </div>
                    )) : (
                      <p className="text-sm text-mute text-center py-4">No activities logged yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="panel">
                <div className="p-4 space-y-4">
                  <form onSubmit={handleCreateTask} className="flex gap-2">
                    <Input 
                      placeholder="New task..." 
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" size="sm">Add Task</Button>
                  </form>
                  <div className="space-y-2">
                    {deal.tasks?.length > 0 ? deal.tasks.map((task: any) => (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-surf2 rounded-md border border-line">
                        <div className="flex items-center gap-3">
                          <CheckSquare className={`h-4 w-4 ${task.status === 'COMPLETED' ? 'text-emerald-500' : 'text-mute'}`} />
                          <span className={`text-sm font-medium ${task.status === 'COMPLETED' ? 'line-through text-mute' : 'text-ink'}`}>
                            {task.title}
                          </span>
                        </div>
                        <Badge variant="outline">{task.priority}</Badge>
                      </div>
                    )) : (
                      <p className="text-sm text-mute text-center py-4">No pending tasks.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'communications' && (
            <div className="panel">
              <div className="p-8 text-center text-mute text-sm">
                <MessageSquare className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                Communications history will appear here. Navigate to the inbox to send messages.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
