'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  MessageSquare, 
  Mail, 
  MessageCircle, 
  Phone, 
  Send, 
  Sparkles,
  AlertCircle,
  Clock,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { clsx } from 'clsx';

interface Message {
  id: string;
  body: string;
  direction: 'INBOUND' | 'OUTBOUND';
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  createdAt: string;
}

interface Conversation {
  id: string;
  entityName: string;
  entityType: 'LEAD' | 'CONTACT';
  channel: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PHONE';
  lastMessage: string;
  unreadCount: number;
  updatedAt: string;
  messages?: Message[];
}

export default function CommunicationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/communications/conversations');
      const data = await res.json();
      if (data.success && data.data) {
        // Need to map the schema data to match the UI shape if needed, or just use it
        setConversations(data.data.map((c: any) => ({
          ...c,
          entityName: c.contactId ? 'Contact Record' : c.leadId ? 'Lead Record' : 'Unknown',
          entityType: c.contactId ? 'CONTACT' : 'LEAD',
          unreadCount: 0,
          updatedAt: c.lastMessageAt || c.createdAt,
          lastMessage: 'View conversation...',
          messages: []
        })));
      } else {
        setConversations(mockConversations);
      }
    } catch (err) {
      // Fallback for development
      setConversations(mockConversations);
    } finally {
      setLoading(false);
    }
  }, []);

  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedConv && selectedConv.id && !selectedConv.id.startsWith('c')) {
      const fetchMessages = async () => {
        try {
          const res = await fetch(`/api/communications/conversations/${selectedConv.id}/messages`);
          const data = await res.json();
          if (data.success && data.data) {
            setMessages(data.data.map((m: any) => ({
              id: m.id,
              body: m.content,
              direction: m.direction,
              status: m.status,
              createdAt: m.createdAt
            })));
          }
        } catch (e) {
          console.error(e);
        }
      };
      fetchMessages();
    } else if (selectedConv) {
      setMessages(selectedConv.messages || mockMessages);
    } else {
      setMessages([]);
    }
  }, [selectedConv]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConv || !replyText.trim()) return;
    
    setIsSending(true);
    try {
      const res = await fetch(`/api/communications/conversations/${selectedConv.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyText, recipientAddress: 'customer@example.com' }),
      });
      const data = await res.json();
      
      if (data.success) {
        // Update local state temporarily
        const newMessage: Message = {
          id: Date.now().toString(),
          body: replyText,
          direction: 'OUTBOUND',
          status: 'SENT',
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, newMessage]);
        setReplyText('');
      } else {
        alert('Failed to send message.');
      }
    } catch (err) {
      console.error(err);
      // Mock update
      const newMessage: Message = {
        id: Date.now().toString(),
        body: replyText,
        direction: 'OUTBOUND',
        status: 'SENT',
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, newMessage]);
      setReplyText('');
    } finally {
      setIsSending(false);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'EMAIL': return <Mail className="h-4 w-4 text-mute" />;
      case 'SMS': 
      case 'WHATSAPP': return <MessageCircle className="h-4 w-4 text-mute" />;
      case 'PHONE': return <Phone className="h-4 w-4 text-mute" />;
      default: return <MessageSquare className="h-4 w-4 text-mute" />;
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-surf2 border border-line rounded-xl overflow-hidden shadow-none">
      {/* Left Panel - Conversation List */}
      <div className="w-80 bg-surf border-r border-line flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-line bg-slate-50/50">
          <h2 className="font-bold text-ink text-lg">Inbox</h2>
          <Input 
            placeholder="Search messages..." 
            className="mt-3 bg-surf text-xs h-8"
          />
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-10 h-10 bg-slate-200 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 bg-slate-200 rounded w-2/3" />
                    <div className="h-3 bg-slate-200 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-4 m-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-sm text-center">
              <AlertCircle className="h-5 w-5 mx-auto mb-2 text-rose-500" />
              {error}
              <Button size="sm" variant="outline" className="mt-3 w-full bg-surf" onClick={fetchConversations}>
                Retry
              </Button>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-mute">
              <MessageSquare className="h-8 w-8 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-medium text-ink">No conversations yet</p>
              <p className="text-xs mt-1">Start a conversation from a lead or contact page.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConv(conv)}
                  className={clsx(
                    "w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-start gap-3",
                    selectedConv?.id === conv.id && "bg-blue-50/50"
                  )}
                >
                  <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-mute" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <p className={clsx(
                        "text-sm truncate pr-2",
                        conv.unreadCount > 0 ? "font-semibold text-ink" : "font-medium text-ink"
                      )}>
                        {conv.entityName}
                      </p>
                      <span className="text-[10px] text-mute whitespace-nowrap">
                        {new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {getChannelIcon(conv.channel)}
                      <p className={clsx(
                        "text-xs truncate",
                        conv.unreadCount > 0 ? "text-ink font-medium" : "text-mute"
                      )}>
                        {conv.lastMessage}
                      </p>
                    </div>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                      {conv.unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Middle Panel - Messages */}
      <div className="flex-1 bg-surf flex flex-col min-w-0">
        {selectedConv ? (
          <>
            <div className="p-4 border-b border-line flex justify-between items-center bg-surf shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
                  <User className="h-5 w-5 text-mute" />
                </div>
                <div>
                  <h3 className="font-bold text-ink">{selectedConv.entityName}</h3>
                  <div className="flex items-center gap-2 text-xs text-mute">
                    {getChannelIcon(selectedConv.channel)}
                    <span>{selectedConv.channel.charAt(0) + selectedConv.channel.slice(1).toLowerCase()}</span>
                    <span>•</span>
                    <span>{selectedConv.entityType}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={clsx(
                    "flex flex-col max-w-[80%]",
                    msg.direction === 'OUTBOUND' ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div 
                    className={clsx(
                      "p-3 rounded-2xl text-sm shadow-xs",
                      msg.direction === 'OUTBOUND' 
                        ? "bg-blue-600 text-white rounded-tr-sm" 
                        : "bg-surf border border-line text-ink rounded-tl-sm"
                    )}
                  >
                    {msg.body}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-mute">
                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {msg.direction === 'OUTBOUND' && (
                      <>
                        <span>•</span>
                        <span className="uppercase">{msg.status}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-line bg-surf shrink-0">
              <div className="flex gap-2 mb-3">
                <Button variant="outline" size="sm" className="text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-indigo-200 h-7 px-2">
                  <Sparkles className="h-3 w-3 mr-1" /> AI Suggested Reply
                </Button>
              </div>
              <form onSubmit={handleSend} className="flex gap-2">
                <Input
                  className="flex-1"
                  placeholder={`Reply via ${selectedConv.channel.toLowerCase()}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                <Button type="submit" isLoading={isSending} className="shrink-0 bg-blue-600 hover:bg-blue-700">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-mute bg-slate-50/50">
            <MessageCircle className="h-12 w-12 mb-4 text-slate-200" />
            <p className="font-medium text-mute">Select a conversation</p>
            <p className="text-sm">Choose a thread from the left panel to start messaging.</p>
          </div>
        )}
      </div>

      {/* Right Panel - Context */}
      <div className="w-72 bg-surf2 border-l border-line hidden lg:flex flex-col shrink-0">
        <div className="p-4 border-b border-line bg-surf">
          <h2 className="font-bold text-ink text-sm">CRM Context</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {selectedConv ? (
            <div className="space-y-4">
              <div className="panel border-line shadow-none">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-mute uppercase tracking-wider">
                      {selectedConv.entityType} DETAILS
                    </span>
                    <Badge variant="purple" className="text-[10px] px-1.5 py-0">ACTIVE</Badge>
                  </div>
                  <h3 className="font-bold text-ink mb-1">{selectedConv.entityName}</h3>
                  <div className="text-xs text-mute space-y-1 mt-3">
                    <p className="flex justify-between"><span>Company:</span> <span className="font-medium text-ink">Acme Corp</span></p>
                    <p className="flex justify-between"><span>Title:</span> <span className="font-medium text-ink">Director</span></p>
                    <p className="flex justify-between"><span>Owner:</span> <span className="font-medium text-ink">Jane Smith</span></p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-4 text-xs h-7">
                    View Full Profile
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-mute uppercase tracking-wider mb-2">Recent Activity</h4>
                <div className="space-y-3 relative before:absolute before:inset-y-0 before:left-2 before:w-0.5 before:bg-slate-200">
                  {[
                    { title: 'Email Sent', time: '2 hours ago', type: 'email' },
                    { title: 'Meeting Scheduled', time: 'Yesterday', type: 'meeting' },
                    { title: 'Lead Created', time: 'Oct 12', type: 'system' }
                  ].map((act, i) => (
                    <div key={i} className="relative flex gap-3 items-start">
                      <div className="h-4 w-4 rounded-full bg-surf border-2 border-brand-500 z-10 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-ink">{act.title}</p>
                        <p className="text-[10px] text-mute flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" /> {act.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-mute mt-10">
              <User className="h-8 w-8 mx-auto mb-3 text-slate-300" />
              <p className="text-sm">No context available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Mock Data
const mockMessages: Message[] = [
  { id: '1', body: 'Hi there, I noticed you downloaded our whitepaper on B2B sales automation.', direction: 'OUTBOUND', status: 'DELIVERED', createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: '2', body: 'Yes, I did. I am looking for ways to streamline our team\'s workflow.', direction: 'INBOUND', status: 'READ', createdAt: new Date(Date.now() - 82400000).toISOString() },
  { id: '3', body: 'That\'s exactly what our platform does best. Would you have 15 minutes for a quick demo this week?', direction: 'OUTBOUND', status: 'READ', createdAt: new Date(Date.now() - 4000000).toISOString() },
];

const mockConversations: Conversation[] = [
  { id: 'c1', entityName: 'Alex Johnson', entityType: 'LEAD', channel: 'EMAIL', lastMessage: 'Would you have 15 minutes for a quick demo this week?', unreadCount: 0, updatedAt: new Date().toISOString(), messages: mockMessages },
  { id: 'c2', entityName: 'Sarah Williams', entityType: 'CONTACT', channel: 'SMS', lastMessage: 'Thanks, I will check it out.', unreadCount: 2, updatedAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'c3', entityName: 'TechFlow Inc.', entityType: 'LEAD', channel: 'EMAIL', lastMessage: 'Can you send over the pricing details?', unreadCount: 1, updatedAt: new Date(Date.now() - 7200000).toISOString() },
];
