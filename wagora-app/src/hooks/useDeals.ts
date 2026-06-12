import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/lib/supabase/types';

type Deal = Database['public']['Tables']['deals']['Row'];
type InsertDeal = Database['public']['Tables']['deals']['Insert'];
type UpdateDeal = Database['public']['Tables']['deals']['Update'];

export function useDeals() {
  const { user } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeals = useCallback(async () => {
    if (!user) {
      setDeals([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('deals')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setDeals(data || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch deals');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const createDeal = async (deal: Omit<InsertDeal, 'user_id'>) => {
    if (!user) throw new Error('User not authenticated');
    setError(null);
    try {
      const { data, error: createError } = await supabase
        .from('deals')
        .insert({
          ...deal,
          user_id: user.id
        })
        .select()
        .single();

      if (createError) {
        throw new Error(createError.message);
      }
      setDeals((prev) => [data, ...prev]);
      return data;
    } catch (err: any) {
      setError(err?.message || 'Failed to create deal');
      throw err;
    }
  };

  const updateDeal = async (id: string, updates: UpdateDeal) => {
    if (!user) throw new Error('User not authenticated');
    setError(null);
    try {
      const { data, error: updateError } = await supabase
        .from('deals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw new Error(updateError.message);
      }
      setDeals((prev) => prev.map((d) => (d.id === id ? data : d)));
      return data;
    } catch (err: any) {
      setError(err?.message || 'Failed to update deal');
      throw err;
    }
  };

  const deleteDeal = async (id: string) => {
    if (!user) throw new Error('User not authenticated');
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('deals')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }
      setDeals((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      setError(err?.message || 'Failed to delete deal');
      throw err;
    }
  };

  return {
    deals,
    loading,
    error,
    refresh: fetchDeals,
    createDeal,
    updateDeal,
    deleteDeal
  };
}
