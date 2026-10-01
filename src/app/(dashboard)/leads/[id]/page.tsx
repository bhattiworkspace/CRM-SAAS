'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Trash2, Sparkles, Check, X, RefreshCw } from 'lucide-react';

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Follow-up state
  const [newFollowUpTitle, setNewFollowUpTitle] = useState('');
  const [newFollowUpDate, setNewFollowUpDate] = useState('');
  const [creatingFollowUp, setCreatingFollowUp] = useState(false);
  
  // AI summary state
  const [aiSummary, setAiSummary] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [activeTab, setActiveTab] = useState('followups');

  // Audit log state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

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

  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/audit-logs');
      const data = await res.json();
      if (data.success && data.logs) {
        const leadLogs = data.logs.filter((log: any) => 
          log.entityId === id || 
          (log.metadata && typeof log.metadata === 'object' && (log.metadata as any).leadId === id)
        );
        setAuditLogs(leadLogs);
      }
    } catch (e) {
      console.error('Failed to fetch audit logs');
    }
  }, [id]);

  useEffect(() => {
    fetchLead();
    fetchAuditLogs();
  }, [fetchLead, fetchAuditLogs]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this lead? This cannot be undone.')) return;
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

  const handleCreateFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFollowUpTitle.trim() || !newFollowUpDate) return;
    setCreatingFollowUp(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newFollowUpTitle,
          leadId: id,
          priority: 'MEDIUM',
          dueDate: new Date(newFollowUpDate).toISOString(),
        })
      });
      if (res.ok) {
        setNewFollowUpTitle('');
        setNewFollowUpDate('');
        fetchLead();
        fetchAuditLogs();
      }
    } catch (e) {
      alert('Failed to create follow-up');
    } finally {
      setCreatingFollowUp(false);
    }
  };

  const handleCompleteFollowUp = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' })
      });
      if (res.ok) {
        fetchLead();
        fetchAuditLogs();
      }
    } catch (e) {
      alert('Failed to complete follow-up');
    }
  };

  const handleDeleteFollowUp = async (taskId: string) => {
    if (!confirm('Delete this follow-up?')) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchLead();
        fetchAuditLogs();
      }
    } catch (e) {
      alert('Failed to delete follow-up');
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

  if (loading) return <div className="p-8 text-center flex flex-col items-center"><RefreshCw className="ic animate-spin text-mute mb-2" /><span className="text-mute">Loading lead details...</span></div>;
  if (error || !lead) return <div className="p-8 text-center text-down">{error || 'Lead not found'}</div>;

  const pendingFollowUps = lead.tasks?.filter((t: any) => t.status !== 'COMPLETED') || [];
  const completedFollowUps = lead.tasks?.filter((t: any) => t.status === 'COMPLETED') || [];

  return (
    <section aria-labelledby="pt">
      <div className="grid md:grid-cols-[320px_1fr] gap-4 items-start">
        <div className="space-y-4">
          <div className="panel">
            <div className="flex justify-between items-start">
              <h1 id="pt" className="font-head font-semibold text-2xl">{lead.firstName} {lead.lastName}</h1>
              {getStatusBadge(lead.status)}
            </div>
            <dl className="kv">
              <dt>Email</dt><dd>{lead.email || '—'}</dd>
              <dt>Phone</dt><dd>{lead.phone || '—'}</dd>
              <dt>Company</dt><dd>{lead.companyName ? <a className="link" href="/companies">{lead.companyName}</a> : '—'}</dd>
              <dt>Priority</dt><dd>{getPriorityBadge(lead.priority)}</dd>
              <dt>Value</dt><dd>{lead.estimatedValue ? `$${lead.estimatedValue.toLocaleString()}` : '—'}</dd>
              <dt>Owner</dt><dd>{lead.owner?.name || 'Unassigned'}</dd>
            </dl>
            <button className="dgr-link" onClick={handleDelete}>
              <Trash2 className="ic" /> Delete lead
            </button>
          </div>
          
          <div className="panel border-l-2 border-l-gold">
            <h2 className="panel-title flex items-center gap-1.5">
              <Sparkles className="ic text-gold" /> AI summary
            </h2>
            {aiSummary ? (
              <p className="text-mute text-sm whitespace-pre-wrap">{aiSummary}</p>
            ) : (
              <div className="mt-2 text-center">
                <button onClick={handleGenerateSummary} disabled={loadingAi} className="btn-primary w-full justify-center">
                  {loadingAi ? 'Generating...' : 'Generate AI Summary'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="tabs" role="tablist">
            <button 
              className={`tab-btn ${activeTab === 'followups' ? 'active' : ''}`} 
              onClick={() => setActiveTab('followups')}
            >Follow-ups</button>
            <button 
              className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`} 
              onClick={() => setActiveTab('activity')}
            >Activity log</button>
            <button 
              className={`tab-btn ${activeTab === 'communications' ? 'active' : ''}`} 
              onClick={() => setActiveTab('communications')}
            >Communications</button>
          </div>

          {activeTab === 'followups' && (
            <div>
              {pendingFollowUps.map((task: any) => {
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
                return (
                  <div key={task.id} className="task-row">
                    <label className="flex items-center gap-2 flex-1 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="chk" 
                        onChange={() => handleCompleteFollowUp(task.id)}
                      /> 
                      <span>{task.title}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      {isOverdue ? <span className="badge red">Overdue</span> : <span className="badge indigo">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : ''}</span>}
                      <button onClick={() => handleDeleteFollowUp(task.id)} className="p-1 hover:text-down text-mute"><X className="ic w-3 h-3" /></button>
                    </div>
                  </div>
                );
              })}
              
              {completedFollowUps.map((task: any) => (
                <div key={task.id} className="task-row opacity-60">
                  <label className="flex items-center gap-2 flex-1">
                    <input type="checkbox" className="chk" checked readOnly /> 
                    <span className="line-through text-mute">{task.title}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="badge green">Done</span>
                    <button onClick={() => handleDeleteFollowUp(task.id)} className="p-1 hover:text-down text-mute"><X className="ic w-3 h-3" /></button>
                  </div>
                </div>
              ))}

              <form onSubmit={handleCreateFollowUp} className="flex gap-2 mt-4 flex-wrap">
                <input 
                  className="input flex-1 min-w-[200px]" 
                  placeholder="New follow-up"
                  value={newFollowUpTitle}
                  onChange={e => setNewFollowUpTitle(e.target.value)}
                />
                <input 
                  className="input w-40" 
                  type="date"
                  value={newFollowUpDate}
                  onChange={e => setNewFollowUpDate(e.target.value)}
                />
                <button type="submit" disabled={creatingFollowUp} className="btn-primary">Add</button>
              </form>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-3">
              {auditLogs.map((log: any) => (
                <div key={log.id} className="text-sm border-b border-line pb-3 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <span className="font-semibold text-ink">{log.action} — {log.entity}</span>
                    <span className="text-xs text-mute">{new Date(log.timestamp).toLocaleDateString()}</span>
                  </div>
                  <p className="text-mute text-xs">By {log.user?.name || 'System'}</p>
                </div>
              ))}
              {auditLogs.length === 0 && <div className="text-mute text-sm text-center py-6">No activity recorded yet.</div>}
            </div>
          )}

          {activeTab === 'communications' && (
            <div className="text-center py-10">
              <div className="empty-state">
                <b>No communications yet.</b>
                <span className="text-mute text-sm">Send an email or message to this lead via the Inbox.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
