'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function NewLeadPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
  });

  const [classification, setClassification] = useState({
    businessType: 'IT',
    leadSource: 'Phone Call',
  });

  const [deal, setDeal] = useState({
    title: '',
    description: '',
    status: 'New',
    leadDate: new Date().toISOString().split('T')[0],
    estimatedValue: '',
    assignTo: '',
  });

  const [contact, setContact] = useState({
    name: '',
    designation: '',
    mobileNo: '',
  });

  const [followUps, setFollowUps] = useState<
    Array<{ id: string; title: string; date: string; type: string; notes: string }>
  >([]);

  const [notes, setNotes] = useState('');

  const handleAddFollowUp = () => {
    setFollowUps([
      ...followUps,
      {
        id: Math.random().toString(36).substring(7),
        title: '',
        date: new Date().toISOString().split('T')[0],
        type: 'Phone Call',
        notes: '',
      },
    ]);
  };

  const handleRemoveFollowUp = (id: string) => {
    setFollowUps(followUps.filter((f) => f.id !== id));
  };

  const handleFollowUpChange = (id: string, field: string, value: string) => {
    setFollowUps(
      followUps.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      firstName: customer.name.split(' ')[0] || 'Unknown',
      lastName: customer.name.split(' ').slice(1).join(' ') || customer.name,
      email: customer.email,
      phone: customer.phone,
      companyName: customer.name,
      title: deal.title,
      priority: 'MEDIUM', // default
      status: deal.status.toUpperCase().replace(' ', '_'),
      source: classification.leadSource,
      // We pass the extra fields as well in case the API handles them
      address: customer.address,
      city: customer.city,
      businessType: classification.businessType,
      dealDescription: deal.description,
      leadDate: deal.leadDate,
      estimatedValue: deal.estimatedValue ? Number(deal.estimatedValue) : undefined,
      assignTo: deal.assignTo,
      contactName: contact.name,
      contactDesignation: contact.designation,
      contactMobileNo: contact.mobileNo,
      followUps,
      notes,
    };

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        router.push('/leads');
      } else {
        alert(data.error || 'Failed to create lead');
      }
    } catch (error) {
      alert('Network error while creating lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-6">
        <Link href="/leads" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-brand-600 mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Leads
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">New Lead</h1>
        <p className="text-sm text-slate-500 mt-1">Create a new sales lead</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Customer Section */}
        <fieldset className="border border-slate-200 rounded-lg p-5 bg-white shadow-sm">
          <legend className="text-sm font-semibold text-slate-800 px-2 -ml-2 bg-white">Customer Information</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <Input
              label="Name *"
              placeholder="e.g. Acme Corporation"
              required
              value={customer.name}
              onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              placeholder="contact@company.com"
              value={customer.email}
              onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
            />
            <Input
              label="Phone"
              placeholder="+92..."
              value={customer.phone}
              onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
            />
            <Input
              label="Address"
              placeholder="Street address"
              value={customer.address}
              onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
            />
            <Input
              label="City"
              placeholder="Select city"
              value={customer.city}
              onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
            />
          </div>
        </fieldset>

        {/* Classification Section */}
        <fieldset className="border border-slate-200 rounded-lg p-5 bg-white shadow-sm">
          <legend className="text-sm font-semibold text-slate-800 px-2 -ml-2 bg-white">Classification</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <Select
              label="Business Type"
              value={classification.businessType}
              onChange={(e) => setClassification({ ...classification, businessType: e.target.value })}
              options={[
                { value: 'IT', label: 'IT' },
                { value: 'Manufacturing', label: 'Manufacturing' },
                { value: 'Trading', label: 'Trading' },
                { value: 'Pharma', label: 'Pharma' },
                { value: 'Distribution', label: 'Distribution' },
                { value: 'Other', label: 'Other' },
              ]}
            />
            <Select
              label="Lead Source"
              value={classification.leadSource}
              onChange={(e) => setClassification({ ...classification, leadSource: e.target.value })}
              options={[
                { value: 'Phone Call', label: 'Phone Call' },
                { value: 'Website', label: 'Website' },
                { value: 'Google Ads', label: 'Google Ads' },
                { value: 'Referral', label: 'Referral' },
                { value: 'Social Media', label: 'Social Media' },
                { value: 'Other', label: 'Other' },
              ]}
            />
          </div>
        </fieldset>

        {/* Deal Information Section */}
        <fieldset className="border border-slate-200 rounded-lg p-5 bg-white shadow-sm">
          <legend className="text-sm font-semibold text-slate-800 px-2 -ml-2 bg-white">Deal Information</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="md:col-span-2">
              <Input
                label="Title *"
                placeholder="e.g. E-commerce platform redesign"
                required
                value={deal.title}
                onChange={(e) => setDeal({ ...deal, title: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Description</label>
              <textarea
                className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors shadow-sm min-h-[80px]"
                placeholder="Brief description of the opportunity"
                value={deal.description}
                onChange={(e) => setDeal({ ...deal, description: e.target.value })}
              />
            </div>
            <Select
              label="Status"
              value={deal.status}
              onChange={(e) => setDeal({ ...deal, status: e.target.value })}
              options={[
                { value: 'New', label: 'New' },
                { value: 'Contacted', label: 'Contacted' },
                { value: 'Qualified', label: 'Qualified' },
                { value: 'Proposal', label: 'Proposal' },
                { value: 'Closed Won', label: 'Closed Won' },
                { value: 'Closed Lost', label: 'Closed Lost' },
              ]}
            />
            <Input
              label="Lead Date *"
              type="date"
              required
              value={deal.leadDate}
              onChange={(e) => setDeal({ ...deal, leadDate: e.target.value })}
            />
            <div className="relative">
              <Input
                label="Estimated Value"
                type="number"
                placeholder="0.00"
                value={deal.estimatedValue}
                onChange={(e) => setDeal({ ...deal, estimatedValue: e.target.value })}
                className="pl-7"
              />
              <span className="absolute left-3 top-[29px] text-slate-500 text-sm pointer-events-none">$</span>
            </div>
            <Input
              label="Assign To"
              placeholder="Auto-assigned to you"
              value={deal.assignTo}
              onChange={(e) => setDeal({ ...deal, assignTo: e.target.value })}
            />
          </div>
        </fieldset>

        {/* Contact Person Section */}
        <fieldset className="border border-slate-200 rounded-lg p-5 bg-white shadow-sm">
          <legend className="text-sm font-semibold text-slate-800 px-2 -ml-2 bg-white">Contact Person</legend>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            <Input
              label="Name"
              placeholder="Full name"
              value={contact.name}
              onChange={(e) => setContact({ ...contact, name: e.target.value })}
            />
            <Input
              label="Designation"
              placeholder="e.g. Procurement Manager"
              value={contact.designation}
              onChange={(e) => setContact({ ...contact, designation: e.target.value })}
            />
            <Input
              label="Mobile No"
              placeholder="+92..."
              value={contact.mobileNo}
              onChange={(e) => setContact({ ...contact, mobileNo: e.target.value })}
            />
          </div>
        </fieldset>

        {/* Follow Up Section */}
        <fieldset className="border border-slate-200 rounded-lg p-5 bg-white shadow-sm">
          <legend className="text-sm font-semibold text-slate-800 px-2 -ml-2 bg-white flex items-center gap-2">
            Follow Up
            <span className="text-[10px] bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-bold">Important</span>
          </legend>
          <div className="mt-2 space-y-4">
            {followUps.map((fu, index) => (
              <div key={fu.id} className="flex flex-col md:flex-row items-start md:items-end gap-3 bg-slate-50 p-3 rounded-md border border-slate-100 relative group">
                <div className="flex-1 w-full">
                  <Input
                    label="Title"
                    value={fu.title}
                    onChange={(e) => handleFollowUpChange(fu.id, 'title', e.target.value)}
                  />
                </div>
                <div className="w-full md:w-40">
                  <Input
                    label="Date"
                    type="date"
                    value={fu.date}
                    onChange={(e) => handleFollowUpChange(fu.id, 'date', e.target.value)}
                  />
                </div>
                <div className="w-full md:w-48">
                  <Select
                    label="Type"
                    value={fu.type}
                    onChange={(e) => handleFollowUpChange(fu.id, 'type', e.target.value)}
                    options={[
                      { value: 'Phone Call', label: 'Phone Call' },
                      { value: 'Meeting', label: 'Meeting' },
                      { value: 'Email', label: 'Email' },
                      { value: 'Visit', label: 'Visit' },
                    ]}
                  />
                </div>
                <div className="flex-1 w-full">
                  <Input
                    label="Notes"
                    value={fu.notes}
                    onChange={(e) => handleFollowUpChange(fu.id, 'notes', e.target.value)}
                  />
                </div>
                <div className="mt-2 md:mt-0 flex-shrink-0">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    className="h-9 w-9 p-0"
                    onClick={() => handleRemoveFollowUp(fu.id)}
                    title="Remove Follow Up"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddFollowUp}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add Follow Up
            </Button>
          </div>
        </fieldset>

        {/* Notes Section */}
        <fieldset className="border border-slate-200 rounded-lg p-5 bg-white shadow-sm">
          <legend className="text-sm font-semibold text-slate-800 px-2 -ml-2 bg-white">Notes</legend>
          <div className="mt-2">
            <textarea
              className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors shadow-sm min-h-[120px]"
              placeholder="Any additional information about this lead..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </fieldset>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push('/leads')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            className="bg-brand-600 hover:bg-brand-700 text-white min-w-[120px]"
          >
            Create Lead
          </Button>
        </div>
      </form>
    </div>
  );
}
