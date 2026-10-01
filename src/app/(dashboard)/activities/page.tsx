'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Activity as ActivityIcon, Plus, RefreshCw, PhoneCall, Calendar, Mail, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  createdAt: string;
  createdBy: { name: string };
  company?: { name: string };
  lead?: { firstName: string; lastName: string };
  deal?: { name: string };
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('ALL');

  const [isLogOpen, setIsLogOpen] = useState(false);
  const [logForm, setLogForm] = useState({
    type: 'CALL',
    title: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/api/activities';
      if (typeFilter !== 'ALL') url += `?type=${typeFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setActivities(data.activities);
      }
    } catch (err) {
      console.error('Error loading activities:', err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logForm),
      });
      const data = await res.json();
      if (data.success) {
        setIsLogOpen(false);
        setLogForm({ type: 'CALL', title: '', description: '' });
        fetchActivities();
      } else {
        alert(data.error || 'Failed to log activity');
      }
    } catch (err) {
      alert('Error logging activity');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'CALL':
        return <PhoneCall className="h-4 w-4 text-sky-600" />;
      case 'MEETING':
        return <Calendar className="h-4 w-4 text-purple-600" />;
      case 'EMAIL':
        return <Mail className="h-4 w-4 text-amber-600" />;
      default:
        return <FileText className="h-4 w-4 text-mute" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-line">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
            <ActivityIcon className="h-6 w-6 text-acc" /> Activity Log
          </h1>
          <p className="text-xs sm:text-sm text-mute mt-0.5">
            Audit history of logged calls, meetings, emails, and notes
          </p>
        </div>
        <Button onClick={() => setIsLogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Log Activity
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="bg-surf p-3 rounded-lg border border-line shadow-2xs flex gap-2">
        {['ALL', 'CALL', 'MEETING', 'EMAIL', 'NOTE', 'SYSTEM'].map((type) => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              typeFilter === type
                ? 'bg-acc text-white shadow-2xs'
                : 'bg-surf2 text-mute hover:bg-slate-200'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Activity Timeline Feed */}
      {loading ? (
        <div className="bg-surf border border-line rounded-lg p-12 text-center text-xs text-mute flex items-center justify-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin text-acc" />
          <span>Loading activity log...</span>
        </div>
      ) : activities.length === 0 ? (
        <div className="bg-surf border border-line rounded-lg p-12 text-center text-xs text-mute">
          No activities found.
        </div>
      ) : (
        <div className="bg-surf border border-line rounded-lg divide-y divide-slate-100 shadow-2xs">
          {activities.map((act) => (
            <div key={act.id} className="p-4 hover:bg-slate-50/70 transition-colors flex items-start gap-4 text-xs">
              <div className="h-9 w-9 rounded-lg bg-surf2 flex items-center justify-center shrink-0 border border-line">
                {getIcon(act.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-ink text-sm">{act.title}</span>
                  <span className="text-[10px] text-mute font-medium">
                    {new Date(act.createdAt).toLocaleString()}
                  </span>
                </div>
                {act.description && (
                  <p className="text-mute mt-1 leading-relaxed text-xs">{act.description}</p>
                )}
                <div className="mt-2 flex items-center gap-3 text-[11px] text-mute">
                  <span>Logged by: <strong className="text-ink">{act.createdBy.name}</strong></span>
                  {act.company && <span>• Company: <strong className="text-ink">{act.company.name}</strong></span>}
                  {act.deal && <span>• Deal: <strong className="text-ink">{act.deal.name}</strong></span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={isLogOpen} onClose={() => setIsLogOpen(false)} title="Log New Activity">
        <form onSubmit={handleLogSubmit} className="space-y-4">
          <Select
            label="Activity Type"
            value={logForm.type}
            onChange={(e) => setLogForm({ ...logForm, type: e.target.value })}
            options={[
              { value: 'CALL', label: 'Phone Call' },
              { value: 'MEETING', label: 'Meeting' },
              { value: 'EMAIL', label: 'Email Outreach' },
              { value: 'NOTE', label: 'General Note' },
            ]}
          />
          <Input
            label="Title / Summary"
            required
            placeholder="e.g. Discovery call with VP of Engineering"
            value={logForm.title}
            onChange={(e) => setLogForm({ ...logForm, title: e.target.value })}
          />
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
              Details & Notes
            </label>
            <textarea
              rows={3}
              value={logForm.description}
              onChange={(e) => setLogForm({ ...logForm, description: e.target.value })}
              className="w-full rounded-md border border-line p-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-line">
            <Button type="button" variant="outline" onClick={() => setIsLogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save Activity
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
