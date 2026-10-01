'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, User, Phone, Mail, Building, Activity, CheckSquare, MessageSquare, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [contact, setContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [activeTab, setActiveTab] = useState('activity');

  const fetchContact = useCallback(async () => {
    try {
      const res = await fetch(`/api/contacts/${id}`);
      const data = await res.json();
      if (data.success) {
        setContact(data.contact);
      } else {
        setError(data.error || 'Failed to fetch contact');
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchContact();
  }, [fetchContact]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
      const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
      if (res.ok) router.push('/contacts');
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
        body: JSON.stringify({ entityType: 'CONTACT', entityId: id })
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
          entityType: 'CONTACT',
          entityId: id,
          priority: 'MEDIUM'
        })
      });
      if (res.ok) {
        setNewTaskTitle('');
        fetchContact();
      }
    } catch (e) {
      alert('Failed to create task');
    }
  };

  if (loading) return <div className="p-8 text-center text-mute">Loading contact details...</div>;
  if (error || !contact) return <div className="p-8 text-center text-rose-500">{error || 'Contact not found'}</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between pb-4 border-b border-line">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.push('/contacts')} className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
              {contact.firstName} {contact.lastName}
            </h1>
            <p className="text-sm text-mute">{contact.title || 'No Title'} • {contact.company?.name || 'No Company'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 text-rose-600 hover:bg-rose-50 border-rose-200" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        <div className="space-y-6">
          <div className="panel">
            <div className="mb-4" className="pb-3">
              <h2 className="panel-title" className="text-sm font-bold text-mute uppercase">Contact Information</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3 text-sm">
                <Mail className="h-4 w-4 text-mute shrink-0 mt-0.5" />
                <span className="font-medium text-ink">{contact.email || '—'}</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <Phone className="h-4 w-4 text-mute shrink-0 mt-0.5" />
                <span className="font-medium text-ink">{contact.phone || '—'}</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <Building className="h-4 w-4 text-mute shrink-0 mt-0.5" />
                <span className="font-medium text-ink">{contact.company?.name || '—'}</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <User className="h-4 w-4 text-mute shrink-0 mt-0.5" />
                <div>
                  <span className="text-mute text-xs block">Assigned Owner</span>
                  <span className="font-medium text-ink">{contact.owner?.name || 'Unassigned'}</span>
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
                    Generate Contact Summary
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

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
                    {contact.activities?.length > 0 ? contact.activities.map((act: any) => (
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
                    {contact.tasks?.length > 0 ? contact.tasks.map((task: any) => (
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
