'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, MessageSquare, Plus, Send, Activity, FileText, BarChart3, Clock, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';

interface Message {
  id: string;
  role: 'USER' | 'AI';
  content: string;
  createdAt: string;
  metadata?: any;
}

interface Conversation {
  id: string;
  title: string;
  contextType: string;
  contextId?: string;
  updatedAt: string;
}

export default function AIPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newConvForm, setNewConvForm] = useState({ title: '', contextType: 'GENERAL', contextId: '' });

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (activeConvId) fetchMessages(activeConvId);
  }, [activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/ai/conversations');
      const data = await res.json();
      if (data.success) {
        setConversations(data.conversations);
        if (data.conversations.length > 0 && !activeConvId) {
          setActiveConvId(data.conversations[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (id: string) => {
    try {
      const res = await fetch(`/api/ai/conversations/${id}/messages`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !activeConvId) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { id: 'tmp', role: 'USER', content: userMsg, createdAt: new Date().toISOString() }]);
    setSending(true);

    try {
      const res = await fetch(`/api/ai/conversations/${activeConvId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userMsg })
      });
      const data = await res.json();
      if (data.success) {
        fetchMessages(activeConvId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const createConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/ai/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConvForm)
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchConversations();
        setActiveConvId(data.conversation.id);
        setNewConvForm({ title: '', contextType: 'GENERAL', contextId: '' });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const triggerAction = (action: string) => {
    setInput(action);
    setTimeout(() => handleSend(), 50);
  };

  const activeConv = conversations.find(c => c.id === activeConvId);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-indigo-600" />
        <h1 className="text-xl font-bold tracking-tight text-ink">AI Assistant</h1>
      </div>

      <div className="flex-1 flex overflow-hidden bg-surf border border-line rounded-xl shadow-none">
        {/* Sidebar */}
        <div className="w-72 border-r border-line flex flex-col bg-slate-50/50">
          <div className="p-4 border-b border-line">
            <Button className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700" onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4" /> New Conversation
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors flex flex-col gap-1 ${
                  activeConvId === conv.id ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-100 border border-transparent'
                }`}
              >
                <div className="font-semibold text-sm text-ink truncate">{conv.title || 'New Conversation'}</div>
                <div className="flex items-center justify-between text-xs">
                  <Badge variant="outline" className="text-[10px] py-0">{conv.contextType}</Badge>
                  <span className="text-mute"><Clock className="inline h-3 w-3 mr-0.5" />{new Date(conv.updatedAt).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {activeConv ? (
            <>
              {/* Context Header */}
              {activeConv.contextType !== 'GENERAL' && (
                <div className="bg-surf2 border-b border-line p-3 flex gap-2 overflow-x-auto">
                  <Button variant="outline" size="sm" onClick={() => triggerAction('Summarize this context')} className="text-xs h-7 gap-1.5"><FileText className="h-3 w-3" /> Summarize</Button>
                  <Button variant="outline" size="sm" onClick={() => triggerAction('Score this lead')} className="text-xs h-7 gap-1.5"><Activity className="h-3 w-3" /> Score Lead</Button>
                  <Button variant="outline" size="sm" onClick={() => triggerAction('Draft follow-up email')} className="text-xs h-7 gap-1.5"><MessageSquare className="h-3 w-3" /> Draft Email</Button>
                  <Button variant="outline" size="sm" onClick={() => triggerAction('Analyze deal')} className="text-xs h-7 gap-1.5"><BarChart3 className="h-3 w-3" /> Analyze Deal</Button>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-mute space-y-3">
                    <Sparkles className="h-10 w-10 text-indigo-200" />
                    <p>How can I help you today?</p>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div key={msg.id || i} className={`flex ${msg.role === 'USER' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl p-4 shadow-none ${
                        msg.role === 'USER' 
                          ? 'bg-surf2 text-ink rounded-br-sm' 
                          : 'bg-indigo-50 border border-indigo-100 text-ink rounded-bl-sm'
                      }`}>
                        {msg.role === 'AI' && (
                          <div className="flex items-center gap-1.5 mb-2 text-[10px] font-semibold text-indigo-600 uppercase tracking-wide">
                            <Sparkles className="h-3 w-3" /> AI Assistant
                            <span className="text-mute ml-2 normal-case font-normal">[MOCK — Development AI]</span>
                          </div>
                        )}
                        <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                        {msg.role === 'AI' && (
                          <div className="mt-2 text-[10px] text-mute flex items-center justify-between">
                            <span>provider: mock, model: mock-v1</span>
                            <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {sending && (
                  <div className="flex justify-start">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 rounded-bl-sm flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-400 animate-pulse" />
                      <span className="text-xs text-indigo-600 font-medium">AI is thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-surf border-t border-line">
                <form onSubmit={handleSend} className="relative flex items-center">
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Ask AI anything..."
                    disabled={sending}
                    className="w-full bg-surf2 border border-line rounded-full pl-4 pr-12 py-3 text-sm text-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || sending}
                    className="absolute right-2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-mute">
              <LayoutDashboard className="h-12 w-12 text-slate-200 mb-4" />
              <p>Select or create a conversation to start</p>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New AI Conversation">
        <form onSubmit={createConversation} className="space-y-4">
          <Input 
            label="Title (Optional)" 
            value={newConvForm.title} 
            onChange={e => setNewConvForm({...newConvForm, title: e.target.value})} 
          />
          <Select 
            label="Context Type"
            options={[
              { value: 'GENERAL', label: 'General Chat' },
              { value: 'LEAD', label: 'Lead' },
              { value: 'CONTACT', label: 'Contact' },
              { value: 'COMPANY', label: 'Company' },
              { value: 'DEAL', label: 'Deal' },
            ]}
            value={newConvForm.contextType}
            onChange={e => setNewConvForm({...newConvForm, contextType: e.target.value})}
          />
          {newConvForm.contextType !== 'GENERAL' && (
            <Input 
              label="Context Record ID" 
              required
              value={newConvForm.contextId} 
              onChange={e => setNewConvForm({...newConvForm, contextId: e.target.value})} 
            />
          )}
          <div className="pt-4 flex justify-end gap-2 border-t border-line">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
