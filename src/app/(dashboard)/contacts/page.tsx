'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Users, Search, Plus, RefreshCw, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';

interface ContactItem {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  title?: string;
  company?: { id: string; name: string };
  owner?: { id: string; name: string };
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    firstName: '',
    lastName: '',
    title: '',
    email: '',
    phone: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let url = '/api/contacts';
      if (searchQuery) url += `?search=${encodeURIComponent(searchQuery)}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setContacts(data.contacts);
      } else {
        setError(data.error || 'Failed to load contacts');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (data.success) {
        setIsCreateOpen(false);
        setCreateForm({ firstName: '', lastName: '', title: '', email: '', phone: '' });
        fetchContacts();
      } else {
        alert(data.error || 'Failed to create contact');
      }
    } catch (err) {
      alert('Error creating contact');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-line">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
            <Users className="h-6 w-6 text-acc" /> Contacts Directory
          </h1>
          <p className="text-xs sm:text-sm text-mute mt-0.5">
            Individual business contacts and key decision-makers
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Contact
        </Button>
      </div>

      {/* Search */}
      <div className="bg-surf p-4 rounded-lg border border-line shadow-2xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-mute" />
          <input
            type="search"
            placeholder="Search contacts by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surf2 border border-line rounded-md pl-9 pr-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-surf border border-line rounded-lg p-12 text-center text-xs text-mute flex items-center justify-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin text-acc" />
          <span>Loading contacts...</span>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-6 text-center text-xs text-rose-700">
          {error}
        </div>
      ) : contacts.length === 0 ? (
        <div className="bg-surf border border-line rounded-lg p-12 text-center text-xs text-mute space-y-2">
          <Users className="h-8 w-8 text-slate-300 mx-auto" />
          <p className="font-semibold text-ink">No contacts found.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact Name</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Associated Company</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Owner</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell className="font-bold text-ink">
                  <a href={`/contacts/${contact.id}`} className="hover:text-brand-600 hover:underline">
                    {contact.firstName} {contact.lastName}
                  </a>
                </TableCell>
                <TableCell className="text-mute">{contact.title || '—'}</TableCell>
                <TableCell className="font-semibold text-ink">
                  {contact.company?.name || '—'}
                </TableCell>
                <TableCell>
                  {contact.email ? (
                    <span className="inline-flex items-center gap-1 text-ink">
                      <Mail className="h-3 w-3 text-mute" /> {contact.email}
                    </span>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>
                  {contact.phone ? (
                    <span className="inline-flex items-center gap-1 text-ink">
                      <Phone className="h-3 w-3 text-mute" /> {contact.phone}
                    </span>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell className="text-mute">{contact.owner?.name || 'Unassigned'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Add Contact">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              required
              value={createForm.firstName}
              onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
            />
            <Input
              label="Last Name"
              required
              value={createForm.lastName}
              onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
            />
          </div>
          <Input
            label="Job Title"
            value={createForm.title}
            onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email"
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            />
            <Input
              label="Phone"
              value={createForm.phone}
              onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
            />
          </div>
          <div className="pt-4 flex justify-end gap-2 border-t border-line">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save Contact
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
