'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, User, Phone, Mail, Building, Clock, Activity, CheckSquare, MessageSquare, Sparkles, Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Tasks state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  
  // AI summary state
  const [aiSummary, setAiSummary] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [activeTab, setActiveTab] = useState('activity');

  const fetchLead = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${id}`);
      const data = await res.json();
      if (data.success) {
        setLead(data.lead);
      } else {
        setError(data.error || 'Failed to fetch lead');
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      if (res.ok) router.push('/leads');
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
        body: JSON.stringify({ entityType: 'LEAD', entityId: id })
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
          entityType: 'LEAD',
          entityId: id,
          priority: 'MEDIUM'
        })
      });
      if (res.ok) {
        setNewTaskTitle('');
        fetchLead();
      }
    } catch (e) {
      alert('Failed to create task');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading lead details...</div>;
  if (error || !lead) return <div className="p-8 text-center text-rose-500">{error || 'Lead not found'}</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.push('/leads')} className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              {lead.firstName} {lead.lastName}
            </h1>
            <p className="text-sm text-slate-500">{lead.title || 'No Title'} • {lead.companyName || 'No Company'}</p>
          </div>
          <Badge variant={lead.status === 'CONVERTED' ? 'success' : 'default'} className="ml-2">
            {lead.status}
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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-500 uppercase">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 text-sm">
                <Mail className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <span className="font-medium text-slate-900">{lead.email || '—'}</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <Phone className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <span className="font-medium text-slate-900">{lead.phone || '—'}</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <Building className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <span className="font-medium text-slate-900">{lead.companyName || '—'}</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <User className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-500 text-xs block">Assigned Owner</span>
                  <span className="font-medium text-slate-900">{lead.owner?.name || 'Unassigned'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-brand-200 bg-brand-50/30">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-brand-700 flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> AI Assistant
              </CardTitle>
            </CardHeader>
            <CardContent>
              {aiSummary ? (
                <div className="text-xs text-slate-700 whitespace-pre-wrap">{aiSummary}</div>
              ) : (
                <div className="text-center">
                  <Button size="sm" onClick={handleGenerateSummary} isLoading={loadingAi} className="w-full bg-brand-600 hover:bg-brand-700">
                    Generate Lead Summary
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
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
              <Card>
                <CardContent className="p-4">
                  {/* Activity List */}
                  <div className="space-y-4">
                    {lead.activities?.length > 0 ? lead.activities.map((act: any) => (
                      <div key={act.id} className="flex gap-3 text-sm border-b border-slate-100 pb-3 last:border-0">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          <Activity className="h-4 w-4 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{act.title}</p>
                          <p className="text-slate-600 text-xs mt-0.5">{act.description}</p>
                          <span className="text-[10px] text-slate-400 block mt-1">
                            {new Date(act.createdAt).toLocaleString()} by {act.createdBy?.name}
                          </span>
                        </div>
                      </div>
                    )) : (
                      <p className="text-sm text-slate-500 text-center py-4">No activities logged yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4 space-y-4">
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
                    {lead.tasks?.length > 0 ? lead.tasks.map((task: any) => (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-md border border-slate-100">
                        <div className="flex items-center gap-3">
                          <CheckSquare className={`h-4 w-4 ${task.status === 'COMPLETED' ? 'text-emerald-500' : 'text-slate-400'}`} />
                          <span className={`text-sm font-medium ${task.status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {task.title}
                          </span>
                        </div>
                        <Badge variant="outline">{task.priority}</Badge>
                      </div>
                    )) : (
                      <p className="text-sm text-slate-500 text-center py-4">No pending tasks.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'communications' && (
            <Card>
              <CardContent className="p-8 text-center text-slate-500 text-sm">
                <MessageSquare className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                Communications history will appear here. Navigate to the inbox to send messages.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
