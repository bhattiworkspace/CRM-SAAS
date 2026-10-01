'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, X } from 'lucide-react';
import { Modal } from '@/components/ui/modal';

interface TaskItem {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: string;
  status: string;
  assignedTo?: { name: string };
  company?: { name: string };
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'MEDIUM',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/api/tasks';
      if (statusFilter !== 'ALL') url += `?status=${statusFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchTasks();
      }
    } catch (err) {
      alert('Error updating task');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (data.success) {
        setIsCreateOpen(false);
        setCreateForm({ title: '', description: '', dueDate: '', priority: 'MEDIUM' });
        fetchTasks();
      } else {
        alert(data.error || 'Failed to create task');
      }
    } catch (err) {
      alert('Error creating task');
    } finally {
      setIsSubmitting(false);
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

  return (
    <section aria-labelledby="pt">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div>
          <h1 id="pt" className="font-head font-semibold text-3xl">Tasks</h1>
          <p className="text-mute">Action items and scheduled follow-ups.</p>
        </div>
        <button className="btn-primary" onClick={() => setIsCreateOpen(true)}>
          <Plus className="ic" /> Add Task
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`btn ${statusFilter === st ? '!bg-ink text-bg border-ink' : ''}`}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="panel p-0">
        {loading ? (
          <div className="p-12 text-center text-mute flex flex-col items-center">
            <RefreshCw className="ic animate-spin mb-2" />
            <span>Loading tasks...</span>
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center empty-state">
            <b>No tasks found.</b>
            <span className="text-mute text-sm">Create a task to keep track of work.</span>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {tasks.map((task) => {
              const isDone = task.status === 'COMPLETED';
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isDone;
              
              return (
                <div key={task.id} className={`task-row ${isDone ? 'opacity-60' : ''}`}>
                  <label className="flex items-start gap-3 flex-1 cursor-pointer py-1 min-w-0">
                    <input 
                      type="checkbox" 
                      className="chk mt-1 shrink-0" 
                      checked={isDone}
                      onChange={() => handleToggleTaskStatus(task.id, task.status)}
                    /> 
                    <div className="min-w-0 flex-1">
                      <span className={`block font-medium truncate ${isDone ? 'line-through text-mute' : 'text-ink'}`}>
                        {task.title}
                      </span>
                      {task.description && (
                        <span className="block text-xs text-mute mt-1 truncate">{task.description}</span>
                      )}
                    </div>
                  </label>
                  <div className="flex items-center gap-3">
                    {task.assignedTo && <span className="text-xs text-mute hidden sm:inline-block">{task.assignedTo.name}</span>}
                    {getPriorityBadge(task.priority)}
                    {task.dueDate && (
                      <span className={`badge ${isOverdue ? 'red' : 'indigo'}`}>
                        {isOverdue ? 'Overdue' : new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Task">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <label className="field">
            <span>Task Title</span>
            <input 
              required 
              placeholder="e.g. Follow up on proposal"
              className="input" 
              value={createForm.title} 
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} 
            />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea
              rows={3}
              className="input"
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="field">
              <span>Due Date</span>
              <div className="relative flex items-center border border-line rounded bg-bg h-9 focus-within:border-acc transition-colors overflow-hidden">
                <input 
                  className="w-10 h-full opacity-0 absolute left-0 top-0 cursor-pointer z-10" 
                  type="date"
                  title="Set Date"
                  value={createForm.dueDate}
                  onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                />
                <div className="w-10 h-full flex items-center justify-center text-mute pointer-events-none">
                  <svg className="ic w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                </div>
                {createForm.dueDate ? (
                  <span className="pr-3 text-sm text-ink pointer-events-none">{new Date(createForm.dueDate).toLocaleDateString()}</span>
                ) : (
                  <span className="pr-3 text-sm text-mute pointer-events-none">No date set</span>
                )}
              </div>
            </label>
            <label className="field">
              <span>Priority</span>
              <select 
                className="input"
                value={createForm.priority}
                onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </label>
          </div>
          <div className="pt-4 flex justify-end gap-2 border-t border-line">
            <button type="button" className="btn" onClick={() => setIsCreateOpen(false)}>Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Saving...' : 'Save Task'}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
