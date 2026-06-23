import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/lib/supabase/types';

type Activity = Database['public']['Tables']['activities']['Row'];
type InsertActivity = Database['public']['Tables']['activities']['Insert'];

export function useActivities(limit = 20) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    if (!user) {
      setActivities([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setActivities(data || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch activities');
    } finally {
      setLoading(false);
    }
  }, [user, limit]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const addActivity = async (activity: Omit<InsertActivity, 'user_id'>) => {
    if (!user) throw new Error('User not authenticated');
    try {
      const { data, error: insertError } = await supabase
        .from('activities')
        .insert({
          ...activity,
          user_id: user.id
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }
      setActivities((prev) => [data, ...prev].slice(0, limit));
      return data;
    } catch (err: any) {
      // Non-critical — activity write failure is silent
      throw err;
    }
  };

  return {
    activities,
    loading,
    error,
    refresh: fetchActivities,
    addActivity
  };
}
