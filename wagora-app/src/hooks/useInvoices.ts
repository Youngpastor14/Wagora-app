import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/lib/supabase/types';

type Invoice = Database['public']['Tables']['invoices']['Row'];
type InsertInvoice = Database['public']['Tables']['invoices']['Insert'];
type UpdateInvoice = Database['public']['Tables']['invoices']['Update'];

type InvoiceTemplate = Database['public']['Tables']['invoice_templates']['Row'];
type InsertTemplate = Database['public']['Tables']['invoice_templates']['Insert'];
type UpdateTemplate = Database['public']['Tables']['invoice_templates']['Update'];

export function useInvoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    if (!user) {
      setInvoices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setInvoices(data || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchTemplates = useCallback(async () => {
    if (!user) {
      setTemplates([]);
      setTemplatesLoading(false);
      return;
    }
    setTemplatesLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('invoice_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setTemplates(data || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setTemplatesLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInvoices();
    fetchTemplates();
  }, [fetchInvoices, fetchTemplates]);

  const createInvoice = async (invoice: Omit<InsertInvoice, 'user_id'>) => {
    if (!user) throw new Error('User not authenticated');
    setError(null);
    try {
      const { data, error: createError } = await supabase
        .from('invoices')
        .insert({
          ...invoice,
          user_id: user.id
        })
        .select()
        .single();

      if (createError) {
        throw new Error(createError.message);
      }
      setInvoices((prev) => [data, ...prev]);
      return data;
    } catch (err: any) {
      setError(err?.message || 'Failed to create invoice');
      throw err;
    }
  };

  const updateInvoice = async (id: string, updates: UpdateInvoice) => {
    if (!user) throw new Error('User not authenticated');
    setError(null);
    try {
      const { data, error: updateError } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw new Error(updateError.message);
      }
      setInvoices((prev) => prev.map((inv) => (inv.id === id ? data : inv)));
      return data;
    } catch (err: any) {
      setError(err?.message || 'Failed to update invoice');
      throw err;
    }
  };

  const deleteInvoice = async (id: string) => {
    if (!user) throw new Error('User not authenticated');
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }
      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    } catch (err: any) {
      setError(err?.message || 'Failed to delete invoice');
      throw err;
    }
  };

  const createTemplate = async (template: Omit<InsertTemplate, 'user_id'>) => {
    if (!user) throw new Error('User not authenticated');
    try {
      const { data, error: createError } = await supabase
        .from('invoice_templates')
        .insert({
          ...template,
          user_id: user.id
        })
        .select()
        .single();

      if (createError) {
        throw new Error(createError.message);
      }
      setTemplates((prev) => [data, ...prev]);
      return data;
    } catch (err: any) {
      console.error('Failed to create template:', err);
      throw err;
    }
  };

  const updateTemplate = async (id: string, updates: UpdateTemplate) => {
    if (!user) throw new Error('User not authenticated');
    try {
      const { data, error: updateError } = await supabase
        .from('invoice_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw new Error(updateError.message);
      }
      setTemplates((prev) => prev.map((t) => (t.id === id ? data : t)));
      return data;
    } catch (err: any) {
      console.error('Failed to update template:', err);
      throw err;
    }
  };

  return {
    invoices,
    templates,
    loading,
    templatesLoading,
    error,
    refresh: fetchInvoices,
    refreshTemplates: fetchTemplates,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    createTemplate,
    updateTemplate
  };
}
