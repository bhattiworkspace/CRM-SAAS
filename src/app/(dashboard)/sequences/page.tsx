'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ListTree, Plus, Clock, Mail, MessageCircle, Phone, CheckSquare, Sparkles, RefreshCw, X, ArrowRight, Play, Pause, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Tabs } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';

interface Step {
  id?: string;
  type: string;
  config: string;
  delayHours?: number;
  orderIndex: number;
}

interface Sequence {
  id: string;
  name: string;
  description?: string;
  status: string;
  maxEnrollments?: number;
  steps: Step[];
  _count?: {
    enrollments: number;
    steps: number;
  };
}

interface Enrollment {
  id: string;
  status: string;
  enrolledAt: string;
  currentStepIndex: number;
  entityId: string;
  entityType: string;
}

export default function SequencesPage() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    description: string;
    maxEnrollments: number | '';
    steps: Step[];
  }>({
    name: '',
    description: '',
    maxEnrollments: '',
    steps: [],
  });

  const fetchSequences = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sequences');
      const data = await res.json();
      if (data.success) {
        setSequences(data.sequences);
      } else {
        setError(data.error || 'Failed to fetch sequences');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSequences();
  }, [fetchSequences]);

  const loadEnrollments = async (sequenceId: string) => {
    setEnrollmentsLoading(true);
    try {
      // Assuming GET /api/sequences/[id]/enrollments exists or returns in sequence details
      const res = await fetch(`/api/sequences/${sequenceId}`);
      const data = await res.json();
      if (data.success && data.sequence.enrollments) {
        setEnrollments(data.sequence.enrollments);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEnrollmentsLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      loadEnrollments(id);
    }
  };

  const handleAddStep = () => {
    setForm({
      ...form,
      steps: [
        ...form.steps,
        { type: 'SEND_EMAIL', config: '', delayHours: 0, orderIndex: form.steps.length },
      ],
    });
  };

  const handleUpdateStep = (index: number, field: keyof Step, value: any) => {
    const newSteps = [...form.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setForm({ ...form, steps: newSteps });
  };

  const handleRemoveStep = (index: number) => {
    const newSteps = form.steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, orderIndex: i }));
    setForm({ ...form, steps: newSteps });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          maxEnrollments: form.maxEnrollments === '' ? null : Number(form.maxEnrollments),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setForm({ name: '', description: '', maxEnrollments: '', steps: [] });
        fetchSequences();
      } else {
        alert(data.error || 'Failed to save');
      }
    } catch (err) {
      alert('Error saving sequence');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSequences = sequences.filter(seq => {
    if (activeTab === 'ALL') return true;
    return seq.status === activeTab;
  });

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'SEND_EMAIL': return <Mail className="h-4 w-4 text-blue-500" />;
      case 'SEND_WHATSAPP': return <MessageCircle className="h-4 w-4 text-emerald-500" />;
      case 'SEND_SMS': return <Phone className="h-4 w-4 text-purple-500" />;
      case 'CREATE_TASK': return <CheckSquare className="h-4 w-4 text-amber-500" />;
      case 'DELAY': return <Clock className="h-4 w-4 text-mute" />;
      default: return <Sparkles className="h-4 w-4 text-indigo-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-line">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
            <ListTree className="h-6 w-6 text-acc" /> Sequences
          </h1>
          <p className="text-xs sm:text-sm text-mute mt-0.5">
            Automate your outreach with multi-step sequences
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Create Sequence
        </Button>
      </div>

      <Tabs
        tabs={[
          { id: 'ALL', label: 'All Sequences' },
          { id: 'ACTIVE', label: 'Active' },
          { id: 'DRAFT', label: 'Draft' },
          { id: 'PAUSED', label: 'Paused' }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {loading ? (
        <div className="bg-surf border border-line rounded-lg p-12 text-center text-xs text-mute flex flex-col items-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin text-acc" />
          <span>Loading sequences...</span>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-6 text-center text-xs text-rose-700 font-medium">
          {error}
        </div>
      ) : filteredSequences.length === 0 ? (
        <div className="bg-surf border border-line rounded-lg p-12 text-center text-xs text-mute space-y-3">
          <ListTree className="h-8 w-8 text-slate-300 mx-auto" />
          <p className="font-semibold text-ink">No sequences found.</p>
          <p>Create a sequence to automate your sales workflow.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSequences.map((seq) => (
            <Card key={seq.id} className="overflow-hidden">
              <div 
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => toggleExpand(seq.id)}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-ink">{seq.name}</h3>
                    <Badge variant={seq.status === 'ACTIVE' ? 'success' : seq.status === 'PAUSED' ? 'warning' : 'default'}>
                      {seq.status}
                    </Badge>
                  </div>
                  {seq.description && <p className="text-xs text-mute">{seq.description}</p>}
                </div>
                <div className="flex items-center gap-6 text-xs text-mute">
                  <div className="text-center">
                    <span className="block font-bold text-ink">{seq.steps?.length || seq._count?.steps || 0}</span>
                    <span>Steps</span>
                  </div>
                  <div className="text-center">
                    <span className="block font-bold text-ink">{seq._count?.enrollments || 0}</span>
                    <span>Enrolled</span>
                  </div>
                </div>
              </div>

              {expandedId === seq.id && (
                <div className="border-t border-line bg-slate-50/50 p-5 space-y-6">
                  <div>
                    <h4 className="text-xs font-bold text-ink uppercase tracking-wider mb-4">Sequence Flow</h4>
                    <div className="space-y-2 max-w-2xl">
                      {seq.steps.sort((a, b) => a.orderIndex - b.orderIndex).map((step, idx) => (
                        <React.Fragment key={step.id || idx}>
                          <div className={`bg-surf border p-3 rounded-lg flex items-start gap-3 shadow-none ${step.type === 'DELAY' ? 'border-dashed border-line' : 'border-line border-l-4 border-l-brand-500'}`}>
                            <div className="mt-0.5">{getStepIcon(step.type)}</div>
                            <div>
                              <p className="text-sm font-semibold text-ink">{step.type.replace('_', ' ')}</p>
                              <p className="text-xs text-mute mt-1 line-clamp-2">{step.type === 'DELAY' ? `Wait for ${step.delayHours} hours` : step.config}</p>
                            </div>
                          </div>
                          {idx < seq.steps.length - 1 && (
                            <div className="flex justify-center">
                              <ArrowRight className="h-4 w-4 text-slate-300 rotate-90" />
                            </div>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-ink uppercase tracking-wider mb-4">Active Enrollments</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Entity</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Current Step</TableHead>
                          <TableHead>Enrolled At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {enrollmentsLoading ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-4">Loading...</TableCell>
                          </TableRow>
                        ) : enrollments.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-4 text-mute">No active enrollments.</TableCell>
                          </TableRow>
                        ) : (
                          enrollments.map((enr) => (
                            <TableRow key={enr.id}>
                              <TableCell className="font-medium">{enr.entityType} ({enr.entityId.substring(0, 8)})</TableCell>
                              <TableCell><Badge variant="outline">{enr.status}</Badge></TableCell>
                              <TableCell>Step {enr.currentStepIndex + 1}</TableCell>
                              <TableCell>{new Date(enr.enrolledAt).toLocaleDateString()}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Sequence" maxWidth="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Sequence Name" 
            required 
            value={form.name} 
            onChange={e => setForm({...form, name: e.target.value})} 
          />
          <Input 
            label="Description" 
            value={form.description} 
            onChange={e => setForm({...form, description: e.target.value})} 
          />
          <Input 
            label="Max Enrollments (Optional)" 
            type="number" 
            value={form.maxEnrollments} 
            onChange={e => setForm({...form, maxEnrollments: e.target.value ? Number(e.target.value) : ''})} 
          />

          <div className="pt-4 border-t border-line">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider">Steps</label>
              <Button type="button" size="sm" variant="outline" onClick={handleAddStep} className="text-xs h-7">
                <Plus className="h-3 w-3 mr-1" /> Add Step
              </Button>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {form.steps.map((step, idx) => (
                <div key={idx} className="bg-surf2 p-3 rounded-md border border-line relative">
                  <button type="button" onClick={() => handleRemoveStep(idx)} className="absolute top-2 right-2 text-mute hover:text-rose-500">
                    <X className="h-4 w-4" />
                  </button>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-mute bg-slate-200 rounded-full w-5 h-5 flex items-center justify-center">{idx + 1}</span>
                    <Select
                      options={[
                        { value: 'SEND_EMAIL', label: 'Send Email' },
                        { value: 'SEND_WHATSAPP', label: 'Send WhatsApp' },
                        { value: 'SEND_SMS', label: 'Send SMS' },
                        { value: 'CREATE_TASK', label: 'Create Task' },
                        { value: 'DELAY', label: 'Delay' },
                      ]}
                      value={step.type}
                      onChange={e => handleUpdateStep(idx, 'type', e.target.value)}
                      className="w-48 h-8 text-xs"
                    />
                  </div>
                  {step.type === 'DELAY' ? (
                    <Input 
                      type="number"
                      placeholder="Delay in hours"
                      value={step.delayHours || ''}
                      onChange={e => handleUpdateStep(idx, 'delayHours', Number(e.target.value))}
                      className="h-8 text-xs bg-surf"
                    />
                  ) : (
                    <textarea 
                      className="w-full text-xs p-2 rounded-md border border-line focus:ring-brand-500 focus:border-brand-500"
                      rows={2}
                      placeholder="Configuration (e.g. email template or message text)"
                      value={step.config}
                      onChange={e => handleUpdateStep(idx, 'config', e.target.value)}
                    />
                  )}
                </div>
              ))}
              {form.steps.length === 0 && (
                <p className="text-xs text-mute text-center py-4">No steps added. Click 'Add Step' to begin.</p>
              )}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-line">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting}>Save Sequence</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
