import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/lib/supabase/types';

type Conversation = Database['public']['Tables']['conversations']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];
type InsertMessage = Database['public']['Tables']['messages']['Insert'];

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Keep track of the active conversation ID using a ref to prevent closure issues in realtime callback
  const activeConversationIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  const fetchConversations = useCallback(async () => {
    if (!user) {
      setConversations([]);
      setLoadingConversations(false);
      return;
    }
    setLoadingConversations(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setConversations(data || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch conversations');
    } finally {
      setLoadingConversations(false);
    }
  }, [user]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setMessages(data || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch messages');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId, fetchMessages]);

  // Fetch initial conversations
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Set up Realtime subscriptions for conversations and messages
  useEffect(() => {
    if (!user) return;

    // 1. Subscribe to conversations changes
    const conversationsChannel = supabase
      .channel('conversations-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newConv = payload.new as Conversation;
            setConversations((prev) => [newConv, ...prev.filter((c) => c.id !== newConv.id)]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedConv = payload.new as Conversation;
            setConversations((prev) =>
              prev
                .map((c) => (c.id === updatedConv.id ? updatedConv : c))
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedConv = payload.old as { id: string };
            setConversations((prev) => prev.filter((c) => c.id !== deletedConv.id));
            if (activeConversationIdRef.current === deletedConv.id) {
              setActiveConversationId(null);
            }
          }
        }
      )
      .subscribe();

    // 2. Subscribe to messages changes
    const messagesChannel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.conversation_id === activeConversationIdRef.current) {
            setMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [user]);

  const sendMessage = async (content: string) => {
    if (!user || !activeConversationId) throw new Error('Cannot send message: no active conversation');
    
    setError(null);
    try {
      const { data, error: sendError } = await supabase
        .from('messages')
        .insert({
          conversation_id: activeConversationId,
          content,
          sender: 'user'
        })
        .select()
        .single();

      if (sendError) {
        throw new Error(sendError.message);
      }

      // Also update the last message in the conversation row
      await supabase
        .from('conversations')
        .update({
          last_message: content,
          last_message_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          unread: false
        })
        .eq('id', activeConversationId);

      // The postgres realtime listener will automatically append the message to state, 
      // but we return it here for immediate caller use if needed
      return data;
    } catch (err: any) {
      setError(err?.message || 'Failed to send message');
      throw err;
    }
  };

  const markAsRead = async (conversationId: string) => {
    if (!user) return;
    try {
      await supabase
        .from('conversations')
        .update({ unread: false })
        .eq('id', conversationId);
    } catch {
      // Silent fail — read state is non-critical
    }
  };

  return {
    conversations,
    activeConversationId,
    setActiveConversationId,
    messages,
    loadingConversations,
    loadingMessages,
    error,
    sendMessage,
    markAsRead,
    refreshConversations: fetchConversations
  };
}
