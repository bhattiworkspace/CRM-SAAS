'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Zap, 
  Plus, 
  RefreshCw, 
  Play, 
  Pause, 
  Settings2,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tabs } from '@/components/ui/tabs';
import { clsx } from 'clsx';

interface Condition {
  field: string;
  operator: string;
  value: string;
}

interface Action {
  type: string;
  config: string;
  delay?: number;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  triggerType: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  conditions: Condition[];
  actions: Action[];
  createdAt: string;
}

interface ExecutionHistory {
  id: string;
  date: string;
  triggerEntity: string;
  status: 'SUCCESS' | 'FAILED' | 'RUNNING';
  duration: string;
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<Workflow>>({
    name: '',
    description: '',
    triggerType: 'LEAD_CREATED',
    status: 'DRAFT',
    conditions: [],
    actions: []
  });

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/workflows');
      const data = await res.json();
      if (data.success) {
        setWorkflows(data.workflows);
      } else {
        setWorkflows(mockWorkflows);
      }
    } catch (err) {
      setWorkflows(mockWorkflows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const filteredWorkflows = workflows.filter(w => activeTab === 'ALL' || w.status === activeTab);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <Badge variant="success">ACTIVE</Badge>;
      case 'PAUSED': return <Badge variant="warning">PAUSED</Badge>;
      case 'DRAFT': return <Badge variant="outline">DRAFT</Badge>;
      default: return <Badge variant="default">{status}</Badge>;
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchWorkflows();
      } else {
        alert('Failed to save workflow. Using mock update.');
        setIsModalOpen(false);
      }
    } catch (err) {
      alert('Error saving workflow.');
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addCondition = () => {
    setFormData(prev => ({
      ...prev,
      conditions: [...(prev.conditions || []), { field: '', operator: 'EQUALS', value: '' }]
    }));
  };

  const addAction = () => {
    setFormData(prev => ({
      ...prev,
      actions: [...(prev.actions || []), { type: 'SEND_EMAIL', config: '' }]
    }));
  };

  const updateCondition = (index: number, key: string, value: string) => {
    setFormData(prev => {
      const newConditions = [...(prev.conditions || [])];
      newConditions[index] = { ...newConditions[index], [key]: value };
      return { ...prev, conditions: newConditions };
    });
  };

  const updateAction = (index: number, key: string, value: string | number) => {
    setFormData(prev => {
      const newActions = [...(prev.actions || [])];
      newActions[index] = { ...newActions[index], [key]: value };
      return { ...prev, actions: newActions };
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Zap className="h-6 w-6 text-brand-600" /> Automations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Build and manage automated workflows to streamline your CRM processes.
          </p>
        </div>
        <Button onClick={() => {
          setFormData({ name: '', description: '', triggerType: 'LEAD_CREATED', status: 'DRAFT', conditions: [], actions: [] });
          setIsModalOpen(true);
        }} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" /> Create Workflow
        </Button>
      </div>

      <Tabs 
        tabs={[
          { id: 'ALL', label: 'All Workflows' },
          { id: 'ACTIVE', label: 'Active', count: workflows.filter(w => w.status === 'ACTIVE').length },
          { id: 'DRAFT', label: 'Drafts' },
          { id: 'PAUSED', label: 'Paused' }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Workflow List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin text-brand-600" />
            <span>Loading workflows...</span>
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-sm text-slate-500 space-y-3">
            <Settings2 className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">No workflows found.</p>
            <p>Create your first automation to streamline your sales process.</p>
          </div>
        ) : (
          filteredWorkflows.map((workflow) => (
            <Card key={workflow.id} className="overflow-hidden hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-0">
                <div 
                  className="p-5 flex items-center justify-between cursor-pointer bg-white"
                  onClick={() => setExpandedId(expandedId === workflow.id ? null : workflow.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                      <Zap className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{workflow.name}</h3>
                      <p className="text-sm text-slate-500">{workflow.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="hidden md:flex gap-4 text-xs text-slate-500">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-slate-700">{workflow.conditions.length}</span>
                        <span>Conditions</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-slate-700">{workflow.actions.length}</span>
                        <span>Actions</span>
                      </div>
                    </div>
                    <div className="w-24 text-right">{getStatusBadge(workflow.status)}</div>
                    {expandedId === workflow.id ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                  </div>
                </div>

                {expandedId === workflow.id && (
                  <div className="px-5 pb-6 pt-2 bg-slate-50 border-t border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Workflow Flow</h4>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                          {workflow.status === 'ACTIVE' ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                          {workflow.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs text-brand-600 border-brand-200 bg-brand-50 hover:bg-brand-100">
                          Edit
                        </Button>
                      </div>
                    </div>

                    <div className="pl-4 space-y-0 relative before:absolute before:inset-y-0 before:left-8 before:w-0.5 before:bg-slate-200">
                      {/* Trigger */}
                      <div className="relative mb-6">
                        <div className="absolute top-4 -left-4 w-8 h-0.5 bg-slate-200" />
                        <div className="ml-8 bg-white border border-slate-200 border-l-4 border-l-blue-500 rounded-md p-4 shadow-sm">
                          <p className="text-xs font-semibold text-blue-600 mb-1 uppercase">Trigger</p>
                          <p className="text-sm font-medium text-slate-900">{workflow.triggerType.replace('_', ' ')}</p>
                        </div>
                      </div>

                      {/* Conditions */}
                      {workflow.conditions.length > 0 && (
                        <div className="relative mb-6">
                          <div className="absolute top-4 -left-4 w-8 h-0.5 bg-slate-200" />
                          <div className="ml-8 bg-white border border-slate-200 border-l-4 border-l-amber-500 rounded-md p-4 shadow-sm">
                            <p className="text-xs font-semibold text-amber-600 mb-2 uppercase">Conditions (AND)</p>
                            <div className="space-y-2">
                              {workflow.conditions.map((cond, i) => (
                                <div key={i} className="flex gap-2 text-sm bg-slate-50 p-2 rounded border border-slate-100">
                                  <span className="font-medium text-slate-700">{cond.field}</span>
                                  <span className="text-slate-500 text-xs mt-0.5">{cond.operator}</span>
                                  <span className="font-bold text-slate-900">{cond.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="relative">
                        <div className="absolute top-4 -left-4 w-8 h-0.5 bg-slate-200" />
                        <div className="ml-8 bg-white border border-slate-200 border-l-4 border-l-emerald-500 rounded-md p-4 shadow-sm">
                          <p className="text-xs font-semibold text-emerald-600 mb-2 uppercase">Actions</p>
                          <div className="space-y-3">
                            {workflow.actions.map((act, i) => (
                              <div key={i} className="flex flex-col gap-1 text-sm bg-slate-50 p-3 rounded border border-slate-100">
                                <div className="font-semibold text-slate-800 flex items-center justify-between">
                                  <span>{i+1}. {act.type.replace('_', ' ')}</span>
                                  {act.delay && <span className="text-xs font-normal text-slate-500 flex items-center"><Clock className="h-3 w-3 mr-1"/> Delay: {act.delay}m</span>}
                                </div>
                                <span className="text-slate-600 text-xs">{act.config}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Execution History */}
      <div className="pt-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Executions</h2>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Trigger Entity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockHistory.map((hist) => (
                <TableRow key={hist.id}>
                  <TableCell className="text-sm text-slate-600">{new Date(hist.date).toLocaleString()}</TableCell>
                  <TableCell className="font-medium text-slate-900">{hist.triggerEntity}</TableCell>
                  <TableCell>
                    <Badge variant={hist.status === 'SUCCESS' ? 'success' : hist.status === 'FAILED' ? 'danger' : 'info'}>
                      {hist.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">{hist.duration}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-xs">View Logs</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Automation Workflow" maxWidth="lg">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-4">
            <Input 
              label="Workflow Name" 
              required 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
            <Input 
              label="Description" 
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
            />
            
            <div className="border border-blue-200 bg-blue-50/50 p-4 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2"><Zap className="h-4 w-4 text-blue-600"/> Trigger</h4>
              <Select 
                label="When this happens..."
                value={formData.triggerType}
                onChange={e => setFormData({...formData, triggerType: e.target.value})}
                options={[
                  { value: 'LEAD_CREATED', label: 'Lead is Created' },
                  { value: 'LEAD_STATUS_CHANGED', label: 'Lead Status Changes' },
                  { value: 'DEAL_WON', label: 'Deal is Won' },
                ]}
              />
            </div>

            <div className="border border-amber-200 bg-amber-50/30 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-semibold text-amber-900">Conditions</h4>
                <Button type="button" variant="outline" size="sm" onClick={addCondition} className="h-7 text-xs">Add Condition</Button>
              </div>
              <div className="space-y-2">
                {formData.conditions?.map((cond, i) => (
                  <div key={i} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Input placeholder="Field (e.g. status)" value={cond.field} onChange={e => updateCondition(i, 'field', e.target.value)} />
                    </div>
                    <div className="w-32">
                      <Select value={cond.operator} onChange={e => updateCondition(i, 'operator', e.target.value)} options={[
                        { value: 'EQUALS', label: 'Equals' },
                        { value: 'CONTAINS', label: 'Contains' },
                        { value: 'GREATER_THAN', label: 'Greater Than' },
                      ]} />
                    </div>
                    <div className="flex-1">
                      <Input placeholder="Value" value={cond.value} onChange={e => updateCondition(i, 'value', e.target.value)} />
                    </div>
                    <Button type="button" variant="outline" size="sm" className="mb-0.5 px-2 text-rose-500 hover:bg-rose-50" onClick={() => {
                      const newConds = [...formData.conditions!];
                      newConds.splice(i, 1);
                      setFormData({...formData, conditions: newConds});
                    }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                {formData.conditions?.length === 0 && <p className="text-xs text-slate-500 italic">No conditions. Will run every time trigger fires.</p>}
              </div>
            </div>

            <div className="border border-emerald-200 bg-emerald-50/30 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-semibold text-emerald-900">Actions</h4>
                <Button type="button" variant="outline" size="sm" onClick={addAction} className="h-7 text-xs">Add Action</Button>
              </div>
              <div className="space-y-3">
                {formData.actions?.map((act, i) => (
                  <div key={i} className="flex gap-2 items-start bg-white p-3 rounded border border-emerald-100 shadow-sm">
                    <div className="w-8 pt-2 font-bold text-slate-400">{i+1}.</div>
                    <div className="flex-1 space-y-3">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Select label="Action Type" value={act.type} onChange={e => updateAction(i, 'type', e.target.value)} options={[
                            { value: 'SEND_EMAIL', label: 'Send Email' },
                            { value: 'UPDATE_FIELD', label: 'Update Field' },
                            { value: 'CREATE_TASK', label: 'Create Task' },
                            { value: 'NOTIFY_USER', label: 'Notify User' },
                          ]} />
                        </div>
                        <div className="w-24">
                          <Input label="Delay (min)" type="number" value={act.delay || ''} onChange={e => updateAction(i, 'delay', Number(e.target.value))} />
                        </div>
                      </div>
                      <Input label="Configuration" placeholder="e.g. Template ID or Field=Value" value={act.config} onChange={e => updateAction(i, 'config', e.target.value)} />
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="mt-6 text-rose-500 hover:bg-rose-50 px-2" onClick={() => {
                      const newActs = [...formData.actions!];
                      newActs.splice(i, 1);
                      setFormData({...formData, actions: newActs});
                    }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                {formData.actions?.length === 0 && <p className="text-xs text-slate-500 italic">Add actions to execute when conditions are met.</p>}
              </div>
            </div>
            
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <label className="text-sm font-medium text-slate-700">Initial Status:</label>
              <Select 
                value={formData.status} 
                onChange={e => setFormData({...formData, status: e.target.value as any})}
                options={[
                  { value: 'DRAFT', label: 'Draft' },
                  { value: 'ACTIVE', label: 'Active' },
                ]}
                className="w-32"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 mt-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting}>Save Workflow</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// Icon Import for mock data
import { Clock } from 'lucide-react';

const mockWorkflows: Workflow[] = [
  {
    id: 'w1',
    name: 'New Lead Welcome Series',
    description: 'Send welcome email and assign task when high priority lead arrives.',
    triggerType: 'LEAD_CREATED',
    status: 'ACTIVE',
    conditions: [
      { field: 'priority', operator: 'EQUALS', value: 'HIGH' }
    ],
    actions: [
      { type: 'SEND_EMAIL', config: 'template: welcome_high_priority' },
      { type: 'CREATE_TASK', config: 'Call lead within 24 hours', delay: 15 }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'w2',
    name: 'Stale Deal Notification',
    description: 'Notify sales manager if deal is stuck in negotiation.',
    triggerType: 'DEAL_STATUS_CHANGED',
    status: 'PAUSED',
    conditions: [
      { field: 'stage', operator: 'EQUALS', value: 'NEGOTIATION' }
    ],
    actions: [
      { type: 'NOTIFY_USER', config: 'role: SALES_MANAGER', delay: 10080 } // 7 days
    ],
    createdAt: new Date(Date.now() - 864000000).toISOString()
  }
];

const mockHistory: ExecutionHistory[] = [
  { id: 'h1', date: new Date().toISOString(), triggerEntity: 'Lead: Acme Corp (ID: 9283)', status: 'SUCCESS', duration: '1.2s' },
  { id: 'h2', date: new Date(Date.now() - 3600000).toISOString(), triggerEntity: 'Lead: Global Tech (ID: 9282)', status: 'SUCCESS', duration: '1.4s' },
  { id: 'h3', date: new Date(Date.now() - 7200000).toISOString(), triggerEntity: 'Deal: Q4 Expansion', status: 'FAILED', duration: '0.8s' },
];
