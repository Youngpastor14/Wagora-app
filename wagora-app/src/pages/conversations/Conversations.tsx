import { useState, useEffect } from 'react';
import { ArrowLeft, Send, Flag, Archive, UserCheck, AlertTriangle, MessageSquare, Globe, Mail, Camera, Loader2 } from 'lucide-react';
import { useConversations } from '@/hooks/useConversations';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import type { Database } from '@/lib/supabase/types';
import { supabase } from '@/lib/supabase/client';

type Conversation = Database['public']['Tables']['conversations']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];

const filters = ['All', 'Needs attention', 'In progress', 'Closing', 'Closed'];

const PlatformIcon = ({ platform }: { platform: string }) => {
  switch (platform) {
    case 'LinkedIn': return <Globe size={14} />;
    case 'Email': return <Mail size={14} />;
    case 'Instagram': return <Camera size={14} />;
    default: return <MessageSquare size={14} />;
  }
};

interface ThreadViewProps {
  conv: Conversation;
  messages: Message[];
  loadingMessages: boolean;
  messageInput: string;
  setMessageInput: (val: string) => void;
  handleBackToList: () => void;
  onSendMessage: () => void;
  generatingReply: boolean;
  onGenerateReply: (overridePath: string | null) => void;
}

const ThreadView = ({ 
  conv, 
  messages,
  loadingMessages,
  messageInput, 
  setMessageInput, 
  handleBackToList, 
  onSendMessage,
  generatingReply,
  onGenerateReply
}: ThreadViewProps) => {
  const [overridePath, setOverridePath] = useState<string>('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const lastMessage = messages[messages.length - 1] || null;
  const canGenerateReply = lastMessage && lastMessage.sender !== 'user' && lastMessage.sender !== 'wagora';

  return (
    <div className="flex flex-col h-full bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden">
      {/* Thread Header */}
      <div className="p-4 border-b border-[var(--border-default)] bg-[var(--surface-card)]">
        <div className="flex items-center gap-3">
          <button onClick={handleBackToList} className="sm:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <ArrowLeft size={18} />
          </button>
          <div className="w-9 h-9 rounded-full bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)] shrink-0">
            {conv.prospect_name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-clash font-bold text-[var(--text-primary)] text-sm truncate">{conv.prospect_name}</h3>
              <span className="text-[var(--text-muted)]"><PlatformIcon platform={conv.platform} /></span>
            </div>
            <p className="text-xs text-[var(--text-muted)] truncate">{conv.prospect_company} · {conv.campaign_name || 'No campaign'}</p>
          </div>
          <StatusBadge status={conv.status} />
        </div>
      </div>

      {/* Flagged Alert */}
      {conv.status === 'Flagged — input needed' && (
        <div className="mx-4 mt-4 p-3 rounded-[var(--radius-md)] border border-[var(--destructive)] bg-[rgba(229,62,62,0.06)] flex items-start gap-3 animate-fade-in">
          <AlertTriangle size={16} className="text-[var(--destructive)] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Input needed.</p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">Wagora flagged this conversation. Situation is outside its configured parameters.</p>
            <div className="flex gap-2 mt-2">
              <button className="px-2.5 py-1 text-[11px] font-bold rounded bg-[var(--surface-card)] border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-colors">Take over</button>
              <button className="px-2.5 py-1 text-[11px] font-bold rounded bg-[var(--surface-card)] border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-colors">Give Wagora instructions</button>
            </div>
          </div>
        </div>
      )}

      {/* Closed Label */}
      {conv.status === 'Closed' && (
        <div className="mx-4 mt-4 p-3 rounded-[var(--radius-md)] border border-[var(--accent-primary)] bg-[rgba(0,200,150,0.06)] animate-fade-in">
          <p className="text-sm font-semibold text-[var(--accent-primary)]">Closed. Deal summary generated.</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {loadingMessages ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="animate-spin text-[var(--accent-primary)]" size={24} />
          </div>
        ) : (
          messages.map(m => (
            <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-[var(--radius-lg)] text-sm leading-relaxed ${
                m.sender === 'wagora'
                  ? 'bg-[var(--surface-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-tl-none'
                  : m.sender === 'user'
                    ? 'bg-[var(--accent-primary)] text-white rounded-tr-none'
                    : 'bg-[var(--surface-card)] text-[var(--text-primary)] border border-[var(--border-default)] rounded-tl-none'
              }`}>
                <p>{m.content}</p>
                <p className={`text-[9px] font-mono mt-1.5 ${
                  m.sender === 'user' ? 'text-white/70 text-right' : 'text-[var(--text-muted)]'
                }`}>
                  {m.sender === 'wagora' ? 'Wagora' : m.sender === 'user' ? 'You' : conv.prospect_name.split(' ')[0]} · {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
        {generatingReply && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-[var(--surface-elevated)] border border-[var(--border-subtle)] px-4 py-2.5 rounded-[var(--radius-lg)] rounded-tl-none flex items-center gap-2 text-xs text-[var(--text-secondary)] font-medium">
              <Loader2 className="animate-spin text-[var(--accent-primary)]" size={12} />
              AI agent is generating response...
            </div>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="border-t border-[var(--border-default)] bg-[var(--surface-card)] p-3 space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap">
            <UserCheck size={13} /> Hand off to me
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap">
            <Flag size={13} /> Add to nurture
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap">
            <Archive size={13} /> Archive
          </button>
        </div>

        {canGenerateReply && (
          <div className="flex items-center gap-3 p-2 bg-[var(--surface-elevated)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
            <button
              onClick={() => onGenerateReply(overridePath || null)}
              disabled={generatingReply}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[var(--radius-md)] bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)] transition-all disabled:opacity-55 cursor-pointer active:scale-95 duration-100"
            >
              {generatingReply ? <Loader2 size={13} className="animate-spin" /> : <MessageSquare size={13} />}
              Generate AI reply
            </button>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[11px] text-[var(--text-muted)] font-medium">Strategy override:</span>
              <select
                value={overridePath}
                onChange={(e) => setOverridePath(e.target.value)}
                className="text-xs px-2 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-primary)] focus:outline-none cursor-pointer"
              >
                <option value="">Auto detect</option>
                <option value="close">Force close</option>
                <option value="call">Force book call</option>
                <option value="nurture">Force nurture</option>
              </select>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send manual message..."
            className="flex-1 px-3 py-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
          />
          <button 
            onClick={onSendMessage}
            className="px-4 bg-[var(--accent-primary)] text-white rounded-[var(--radius-md)] hover:bg-[var(--accent-primary-hover)] transition-colors flex items-center justify-center active:scale-95 duration-100"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Conversations() {
  const { toast } = useToast();
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    messages,
    loadingConversations,
    loadingMessages,
    error,
    sendMessage,
    markAsRead
  } = useConversations();

  const [activeFilter, setActiveFilter] = useState('All');
  const [messageInput, setMessageInput] = useState('');
  const [mobileShowThread, setMobileShowThread] = useState(false);

  const selectedConv = conversations.find(c => c.id === activeConversationId) || null;

  useEffect(() => {
    // Mark as read when selected
    if (activeConversationId) {
      markAsRead(activeConversationId);
    }
  }, [activeConversationId]);

  // Set default selected conversation if none set and list loaded
  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId, setActiveConversationId]);

  const filtered = conversations.filter(c => {
    switch (activeFilter) {
      case 'Needs attention': return c.status === 'Flagged — input needed';
      case 'In progress': return c.status === 'Wagora responding' || c.status === 'Awaiting reply';
      case 'Closing': return c.status === 'In closing sequence' || c.status === 'Call booked';
      case 'Closed': return c.status === 'Closed';
      default: return true;
    }
  });

  const handleSelectConv = (id: string) => {
    setActiveConversationId(id);
    setMobileShowThread(true);
  };

  const handleBackToList = () => {
    setMobileShowThread(false);
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeConversationId) return;

    const content = messageInput;
    setMessageInput('');

    try {
      await sendMessage(content);
    } catch (err: any) {
      toast(`Failed to send message: ${err.message}`, { type: 'error' });
      setMessageInput(content); // Restore
    }
  };

  const [generatingReply, setGeneratingReply] = useState(false);

  const handleGenerateReply = async (override: string | null) => {
    if (!activeConversationId) return;
    setGeneratingReply(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      const response = await fetch(`${apiUrl}/api/conversations/reply/${activeConversationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          override_path: override
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI reply');
      }

      const resData = await response.json();
      toast(`AI reply generated. Path detected: ${resData.path.toUpperCase()}`, { type: 'success' });
    } catch (err: any) {
      toast(err.message || 'Failed to generate AI reply.', { type: 'error' });
    } finally {
      setGeneratingReply(false);
    }
  };

  if (loadingConversations) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center">
        <Loader2 className="animate-spin text-[var(--accent-primary)]" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-red-500 font-semibold">Error loading conversations</p>
        <p className="text-xs text-[var(--text-secondary)]">{error}</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col p-4 sm:p-6 lg:p-8">
      {/* Mobile: Show thread or list */}
      <div className="sm:hidden flex-1 flex flex-col">
        {mobileShowThread && selectedConv ? (
          <ThreadView 
            conv={selectedConv} 
            messages={messages}
            loadingMessages={loadingMessages}
            messageInput={messageInput}
            setMessageInput={setMessageInput}
            handleBackToList={handleBackToList}
            onSendMessage={handleSendMessage}
            generatingReply={generatingReply}
            onGenerateReply={handleGenerateReply}
          />
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="pb-3">
              <h1 className="font-clash text-2xl font-bold text-[var(--text-primary)] mb-3">Conversations</h1>
              <div className="flex gap-1 overflow-x-auto pb-1">
                {filters.map(f => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors ${
                      activeFilter === f
                        ? 'bg-[var(--accent-primary)] text-white'
                        : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <EmptyState headline="No conversations yet." body="Conversations appear when prospects reply." />
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {filtered.map(c => (
                    <div key={c.id} onClick={() => handleSelectConv(c.id)} className="py-3 hover:bg-[var(--surface-elevated)] transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-full bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)]">
                            {c.prospect_name.split(' ').map(n => n[0]).join('')}
                          </div>
                          {c.unread && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[var(--accent-primary)] rounded-full border-2 border-[var(--surface-card)]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={`text-sm truncate ${c.unread ? 'font-bold text-[var(--text-primary)]' : 'font-medium text-[var(--text-primary)]'}`}>{c.prospect_name}</span>
                            <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap ml-2">{c.last_message_time || ''}</span>
                          </div>
                          <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{c.last_message || ''}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Desktop: Split pane */}
      <div className="hidden sm:flex flex-1 min-h-0 gap-6">
        {/* Left Panel - List */}
        <div className="w-80 lg:w-96 flex flex-col bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--surface-card)]">
            <h1 className="font-clash text-lg font-bold text-[var(--text-primary)] mb-3">Conversations</h1>
            <div className="flex gap-1 flex-wrap">
              {filters.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-2.5 py-1 text-[10px] font-semibold rounded-full whitespace-nowrap transition-colors ${
                    activeFilter === f
                      ? 'bg-[var(--accent-primary)] text-white'
                      : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)]">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-xs text-[var(--text-muted)]">No conversations.</div>
            ) : (
              filtered.map(c => (
                <div
                  key={c.id}
                  onClick={() => setActiveConversationId(c.id)}
                  className={`p-4 cursor-pointer transition-colors ${
                    activeConversationId === c.id ? 'bg-[var(--surface-elevated)]' : 'hover:bg-[var(--surface-elevated)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-full bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)]">
                        {c.prospect_name.split(' ').map(n => n[0]).join('')}
                      </div>
                      {c.unread && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[var(--accent-primary)] rounded-full border-2 border-[var(--surface-card)]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs truncate ${c.unread ? 'font-bold' : 'font-medium'} text-[var(--text-primary)]`}>{c.prospect_name}</span>
                        <span className="text-[9px] text-[var(--text-muted)] whitespace-nowrap ml-2">{c.last_message_time || ''}</span>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] truncate">{c.prospect_company}</p>
                      <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">{c.last_message || ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 ml-12">
                    <StatusBadge status={c.status} />
                    <span className="text-[9px] text-[var(--text-muted)] flex items-center gap-1 font-medium">
                      <PlatformIcon platform={c.platform} /> {c.platform}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Thread */}
        <div className="flex-1 min-w-0">
          {selectedConv ? (
            <ThreadView 
              conv={selectedConv} 
              messages={messages}
              loadingMessages={loadingMessages}
              messageInput={messageInput}
              setMessageInput={setMessageInput}
              handleBackToList={handleBackToList}
              onSendMessage={handleSendMessage}
              generatingReply={generatingReply}
              onGenerateReply={handleGenerateReply}
            />
          ) : (
            <div className="h-full bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] flex items-center justify-center">
              <EmptyState headline="No conversations selected." body="Select a thread from the list to view history." />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
