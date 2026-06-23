import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/lib/supabase/types';

// Domain fix: single source of truth — never falls back to localhost in production
const API_URL = import.meta.env.VITE_API_URL || 'https://api.getwagora.com';

export type Campaign = Database['public']['Tables']['campaigns']['Row'] & {
  campaign_goal?: string;
  target_profile?: any;
};
type InsertCampaign = Database['public']['Tables']['campaigns']['Insert'] & {
  campaign_goal?: string;
  target_profile?: any;
};
type UpdateCampaign = Database['public']['Tables']['campaigns']['Update'] & {
  campaign_goal?: string;
  target_profile?: any;
};

export function useCampaigns() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    if (!user) { setCampaigns([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch(`${API_URL}/api/campaigns/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch campaigns');
      const data = await response.json();
      setCampaigns(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const createCampaign = async (campaign: Omit<InsertCampaign, 'user_id'>) => {
    if (!user) throw new Error('User not authenticated');
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch(`${API_URL}/api/campaigns/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(campaign)
      });
      if (!response.ok) throw new Error('Failed to create campaign');
      const data = await response.json();
      setCampaigns((prev) => [data, ...prev]);
      return data;
    } catch (err: any) { setError(err?.message || 'Failed to create campaign'); throw err; }
  };

  const updateCampaign = async (id: string, updates: UpdateCampaign) => {
    if (!user) throw new Error('User not authenticated');
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch(`${API_URL}/api/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update campaign');
      const data = await response.json();
      setCampaigns((prev) => prev.map((c) => (c.id === id ? data : c)));
      return data;
    } catch (err: any) { setError(err?.message || 'Failed to update campaign'); throw err; }
  };

  const deleteCampaign = async (id: string) => {
    if (!user) throw new Error('User not authenticated');
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch(`${API_URL}/api/campaigns/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete campaign');
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) { setError(err?.message || 'Failed to delete campaign'); throw err; }
  };

  return { campaigns, loading, error, refresh: fetchCampaigns, createCampaign, updateCampaign, deleteCampaign };
}
