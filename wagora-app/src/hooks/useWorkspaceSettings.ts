import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/lib/supabase/types';

type WorkspaceSettings = Database['public']['Tables']['workspace_settings']['Row'];
type UpdateSettings = Database['public']['Tables']['workspace_settings']['Update'];

export function useWorkspaceSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('workspace_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setSettings(data);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch workspace settings');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (updates: UpdateSettings) => {
    if (!user) throw new Error('User not authenticated');
    setError(null);
    try {
      const { data, error: updateError } = await supabase
        .from('workspace_settings')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(updateError.message);
      }
      setSettings(data);
      return data;
    } catch (err: any) {
      setError(err?.message || 'Failed to update workspace settings');
      throw err;
    }
  };

  return {
    settings,
    loading,
    error,
    refresh: fetchSettings,
    updateSettings
  };
}
