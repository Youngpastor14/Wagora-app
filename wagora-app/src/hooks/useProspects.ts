import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/lib/supabase/types';

// Domain fix: single source of truth — never falls back to localhost in production
const API_URL = import.meta.env.VITE_API_URL || 'https://api.getwagora.com';

type Prospect = Database['public']['Tables']['prospects']['Row'];
type InsertProspect = Database['public']['Tables']['prospects']['Insert'];
type UpdateProspect = Database['public']['Tables']['prospects']['Update'];

export function useProspects(campaignId?: string) {
  const { user } = useAuth();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProspects = useCallback(async () => {
    if (!user) { setProspects([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      let url = `${API_URL}/api/prospects/`;
      if (campaignId) url += `?campaign_id=${campaignId}`;
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error('Failed to fetch prospects');
      const data = await response.json();
      setProspects(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch prospects');
    } finally {
      setLoading(false);
    }
  }, [user, campaignId]);

  useEffect(() => { fetchProspects(); }, [fetchProspects]);

  const createProspect = async (prospect: Omit<InsertProspect, 'user_id'>) => {
    if (!user) throw new Error('User not authenticated');
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch(`${API_URL}/api/prospects/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(prospect)
      });
      if (!response.ok) throw new Error('Failed to create prospect');
      const data = await response.json();
      setProspects((prev) => [data, ...prev]);
      return data;
    } catch (err: any) { setError(err?.message || 'Failed to create prospect'); throw err; }
  };

  const updateProspect = async (id: string, updates: UpdateProspect) => {
    if (!user) throw new Error('User not authenticated');
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch(`${API_URL}/api/prospects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update prospect');
      const data = await response.json();
      setProspects((prev) => prev.map((p) => (p.id === id ? data : p)));
      return data;
    } catch (err: any) { setError(err?.message || 'Failed to update prospect'); throw err; }
  };

  const deleteProspect = async (id: string) => {
    if (!user) throw new Error('User not authenticated');
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch(`${API_URL}/api/prospects/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete prospect');
      setProspects((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) { setError(err?.message || 'Failed to delete prospect'); throw err; }
  };

  return { prospects, loading, error, refresh: fetchProspects, createProspect, updateProspect, deleteProspect };
}
