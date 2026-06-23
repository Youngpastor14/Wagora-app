import { useState, useEffect } from 'react';
import { Loader2, ShieldAlert, Sparkles, User, Info } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase/client';

// Domain fix: single source of truth
const API_URL = import.meta.env.VITE_API_URL || 'https://api.getwagora.com';

export default function SalesAgent() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessName, setBusinessName] = useState('Wagora Partner');
  const [agentId, setAgentId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('Amara');
  const [gender, setGender] = useState<'male' | 'female' | 'neutral'>('female');
  const [age, setAge] = useState(28);
  const [personaTone, setPersonaTone] = useState<'professional' | 'friendly' | 'direct' | 'consultative'>('friendly');
  const [disclosureMode, setDisclosureMode] = useState<'full_persona' | 'assistant_disclosure'>('assistant_disclosure');

  // Fetch business name and active agent config on load
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Get user profile first for business name
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const profileRes = await fetch(`${API_URL}/api/prospects/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }); // Standard api call to verify connection and get data if needed, or query supabase auth
        const user = session?.user;
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('business_name').eq('id', user.id).single();
          if (profile?.business_name) {
            setBusinessName(profile.business_name);
          }
        }

        // Fetch active agent settings
        const agentRes = await fetch(`${API_URL}/api/agents/active`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (agentRes.ok) {
          const resData = await agentRes.json();
          if (resData.status === 'success' && resData.agent) {
            const ag = resData.agent;
            setAgentId(ag.id);
            setName(ag.name);
            setGender(ag.gender);
            setAge(ag.age);
            setPersonaTone(ag.persona_tone);
            setDisclosureMode(ag.disclosure_mode);
          }
        }
      } catch {
        // Non-critical — settings load failure handled gracefully by form defaults
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      toast('Agent name is required.', { type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch(`${API_URL}/api/agents/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: agentId,
          name,
          gender,
          age,
          persona_tone: personaTone,
          disclosure_mode: disclosureMode
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      const resData = await response.json();
      if (resData.status === 'success') {
        setAgentId(resData.agent.id);
        toast('Agent saved. All future outreach will use this persona.', { type: 'success' });
      } else {
        throw new Error('Invalid server response');
      }
    } catch (err: any) {
      toast(err.message || 'Failed to save agent.', { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Generate real-time intro preview
  const getPreviewText = () => {
    const introLabel = disclosureMode === 'assistant_disclosure'
      ? `Hi [Prospect Name], I am ${name}, a sales assistant for ${businessName}.`
      : `Hi [Prospect Name], I am ${name}, a sales professional at ${businessName}.`;

    const toneDetails = {
      professional: ` I am writing to introduce our widget services and discuss how we might assist your operations.`,
      friendly: ` I came across your profile and wanted to reach out to say hello and see how things are going.`,
      direct: ` I wanted to touch base directly about your machinery operations and see if we can help.`,
      consultative: ` I have been reviewing your current industry challenges and wanted to share some optimization strategies.`
    };

    return `${introLabel}${toneDetails[personaTone]}`;
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="animate-spin text-[var(--accent-primary)]" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Identity Card */}
      <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <User className="text-[var(--accent-primary)]" size={18} />
          <h2 className="font-clash font-bold text-[var(--text-primary)]">Agent identity</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Agent name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Amara, James, Zoe"
              className="w-full px-3 py-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Gender</label>
            <div className="flex gap-2">
              {(['male', 'female', 'neutral'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={`flex-1 py-2 rounded-[var(--radius-md)] text-xs font-bold border capitalize transition-colors ${
                    gender === g
                      ? 'bg-[var(--accent-primary)] text-white border-transparent'
                      : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] border-[var(--border-default)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
            <span>Age</span>
            <span>{age} years old</span>
          </div>
          <input
            type="range"
            min="22"
            max="55"
            value={age}
            onChange={(e) => setAge(parseInt(e.target.value))}
            className="w-full h-1.5 bg-[var(--surface-elevated)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Personality tone</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: 'professional', label: 'Professional', desc: 'Formal tone, concise messages, no slang.' },
              { id: 'friendly', label: 'Friendly', desc: 'Warm tone, conversational, uses first names.' },
              { id: 'direct', label: 'Direct', desc: 'Blunt tone, short sentences, gets to the point.' },
              { id: 'consultative', label: 'Consultative', desc: 'Trusted advisor, asks questions, shows understanding.' },
            ].map((tone) => (
              <div
                key={tone.id}
                onClick={() => setPersonaTone(tone.id as any)}
                className={`p-3 rounded-[var(--radius-lg)] border cursor-pointer transition-all ${
                  personaTone === tone.id
                    ? 'border-[var(--accent-primary)] bg-[var(--surface-elevated)] shadow-[var(--shadow-card)]'
                    : 'border-[var(--border-default)] hover:border-[var(--border-subtle)]'
                }`}
              >
                <p className="text-xs font-bold text-[var(--text-primary)]">{tone.label}</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">{tone.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Disclosure Card */}
      <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Info className="text-[var(--accent-primary)]" size={18} />
          <h2 className="font-clash font-bold text-[var(--text-primary)]">Disclosure mode</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => setDisclosureMode('assistant_disclosure')}
            className={`p-4 rounded-[var(--radius-lg)] border cursor-pointer transition-all relative overflow-hidden flex flex-col justify-between h-36 ${
              disclosureMode === 'assistant_disclosure'
                ? 'border-[var(--accent-primary)] bg-[var(--surface-elevated)]'
                : 'border-[var(--border-default)] hover:border-[var(--border-subtle)]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[var(--text-primary)]">Present as an AI assistant</p>
                <span className="px-2 py-0.5 text-[9px] font-bold bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded">Recommended</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-2">
                Your agent introduces itself as a sales assistant for your brand. Safer across all platforms.
              </p>
            </div>
          </div>

          <div
            onClick={() => setDisclosureMode('full_persona')}
            className={`p-4 rounded-[var(--radius-lg)] border cursor-pointer transition-all relative overflow-hidden flex flex-col justify-between h-36 ${
              disclosureMode === 'full_persona'
                ? 'border-[var(--accent-primary)] bg-[var(--surface-elevated)]'
                : 'border-[var(--border-default)] hover:border-[var(--border-subtle)]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[var(--text-primary)]">Present as a human sales rep</p>
                <span className="px-2 py-0.5 text-[9px] font-bold bg-amber-500/10 text-amber-500 rounded flex items-center gap-1">
                  <ShieldAlert size={10} /> Platform risk
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-2">
                Your agent presents as a real person. No AI disclosure. Higher conversion potential. Review platform terms.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Card */}
      <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="text-yellow-500 animate-pulse" size={16} />
          <h3 className="font-clash font-bold text-[var(--text-primary)] text-sm">Real-time introduction preview</h3>
        </div>
        <div className="p-3 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-lg">
          <p className="text-xs text-[var(--text-secondary)] italic leading-relaxed">
            &ldquo;{getPreviewText()}&rdquo;
          </p>
        </div>
      </div>

      {/* Save Trigger */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-[var(--accent-primary)] text-white py-2.5 rounded-[var(--radius-md)] text-sm font-bold hover:bg-[var(--accent-primary-hover)] transition-colors cursor-pointer disabled:opacity-50"
      >
        {saving && <Loader2 size={14} className="animate-spin" />}
        Save agent settings
      </button>
    </div>
  );
}
