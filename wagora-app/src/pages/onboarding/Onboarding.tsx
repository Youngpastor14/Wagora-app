import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, ArrowLeft, Upload, Check, MessageSquare, Sparkles, Loader2, FileText, Send, ShieldAlert, Cpu, Terminal, Settings as SettingsIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';

// CQ-04: single source of truth for API URL
const API_URL = import.meta.env.VITE_API_URL || 'https://api.getwagora.com';

interface ChatMessage {
  id: string;
  sender: 'wagora' | 'user';
  text: string;
  timestamp: string;
  bento?: {
    score: string;
    targets: string;
  };
  review?: boolean;
  isError?: boolean;
}

const WAGORA_SETUP_SYSTEM_PROMPT = `You are Wagora's campaign setup assistant helping configure an autonomous outbound sales campaign. Ask ONE focused question at a time. Keep responses under 3 sentences. Be direct and specific — no filler phrases.

You need to collect these 5 things:
1. Target industry and company type
2. Target job titles or roles
3. Target geography (city, country, or region)
4. What the user sells and who it helps
5. Approximate budget range of their ideal client

When you have all 5, respond with ONLY this JSON (no other text):
{
  "target_industries": ["industry1", "industry2"],
  "target_roles": ["role1", "role2"],
  "geography": ["location1"],
  "offer_description": "what they sell and who it helps",
  "icp_threshold": 7,
  "campaign_name": "suggested campaign name"
}`;

export default function Onboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, markOnboardingComplete } = useAuth();
  const [saving, setSaving] = useState(false);

  // Onboarding modes: 'welcome' | 'select_mode' | 'wizard' | 'ai_chat'
  const [onboardingState, setOnboardingState] = useState<'welcome' | 'select_mode' | 'wizard' | 'ai_chat'>('welcome');

  // AI Chat flow state machine
  const [chatStep, setChatStep] = useState<number>(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [activeLogs, setActiveLogs] = useState<string[]>([]);
  const [showLogsDrawer, setShowLogsDrawer] = useState(false);
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [aiConfig, setAiConfig] = useState<any>(null);
  const [campaignName, setCampaignName] = useState<string>('');

  // Wizard States
  const [currentStep, setCurrentStep] = useState(0);
  const [brandData, setBrandData] = useState({
    name: '', industry: '', whatYouSell: '', brandVoice: 'Professional and direct',
  });
  const [icpData, setIcpData] = useState({
    industries: '', roles: '', companySize: '', geography: '', painPoints: '', threshold: '7',
  });
  const [platforms, setPlatforms] = useState({ email: true, linkedin: false, instagram: false });
  const [wizardDocs, setWizardDocs] = useState<any[]>([]);
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  const [docErrors, setDocErrors] = useState<{ [key: string]: string }>({});

  // BUG-02 FIX: memoize with useCallback so the interval effect doesn't restart on every render
  const fetchWizardDocs = useCallback(async () => {
    if (!user) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch(`${API_URL}/api/documents/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setWizardDocs(data);
      }
    } catch {
      // Non-critical — fail silently, user can still proceed
    }
  }, [user]);

  useEffect(() => {
    if (onboardingState !== 'wizard' && onboardingState !== 'ai_chat') return;
    fetchWizardDocs();
    // Poll every 8s (not 4s) — documents parse slowly, no need to hammer the API
    const interval = setInterval(fetchWizardDocs, 8000);
    return () => clearInterval(interval);
  }, [user, onboardingState, fetchWizardDocs]);

  const handleWizardDocUpload = async (file: File, docType: string, maxSizeMB: number) => {
    if (!file || !user) return;
    
    setDocErrors(prev => ({ ...prev, [docType]: '' }));

    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['pdf', 'docx', 'txt'].includes(fileExt)) {
      setDocErrors(prev => ({ ...prev, [docType]: 'Unsupported file type. Use PDF, DOCX, or TXT.' }));
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setDocErrors(prev => ({ ...prev, [docType]: `File exceeds size limit of ${maxSizeMB}MB.` }));
      return;
    }

    setUploadingDocType(docType);
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);

    try {
      const { error: uploadError } = await supabase.storage
        .from('brand-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const createRes = await fetch(`${API_URL}/api/documents/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: file.name,
          file_type: fileExt.toUpperCase(),
          size: `${fileSizeMB} MB`,
          storage_path: filePath,
          document_type: docType
        })
      });

      if (!createRes.ok) {
        throw new Error('Failed to save document metadata');
      }

      const newDoc = await createRes.json();

      fetch(`${API_URL}/api/documents/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ document_id: newDoc.id })
      }).catch(() => { /* Parsing is async fire-and-forget */ });

      await fetchWizardDocs();
      toast('Document uploaded.', { type: 'success' });
    } catch (err: any) {
      setDocErrors(prev => ({ ...prev, [docType]: err.message || 'Upload failed.' }));
    } finally {
      setUploadingDocType(null);
    }
  };

  const handleWizardDocDelete = async (docId: string, storagePath: string) => {
    try {
      await supabase.storage
        .from('brand-documents')
        .remove([storagePath]);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const deleteRes = await fetch(`${API_URL}/api/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!deleteRes.ok) {
        throw new Error('Failed to delete document from database');
      }

      await fetchWizardDocs();
      toast('Document deleted.', { type: 'success' });
    } catch (err: any) {
      toast(`Deletion failed: ${err.message}`, { type: 'error' });
    }
  };

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isThinking]);

  // Initial welcome message when entering AI chat
  useEffect(() => {
    if (onboardingState !== 'ai_chat') return;
    setChatMessages([
      {
        id: 'msg-0',
        sender: 'wagora',
        text: 'Tell me what you want to build. Who are you trying to reach?',
        timestamp: '09:41 AM',
      }
    ]);
    setActiveLogs(['Secure session initialized.', 'Calibrating neural networks...', 'Awaiting operator input...']);
  }, [onboardingState]);

  // Handle Send action in AI Chat
  const handleSendChat = async (text: string) => {
    if (!text.trim()) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp,
    };

    setChatMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsThinking(true);
    // UX-08 FIX: advance chatStep so preset chips and disabled states work correctly
    // Step 0 → 1 on first user message (shows step-1 preset chips)
    setChatStep(prev => Math.min(prev + 1, 2));
    setActiveLogs(prev => [...prev, 'Sending query to Wagora brain...', 'Contacting Groq inference nodes...']);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      // API_URL is defined at module level

      const chatHistory = chatMessages
        .concat(userMsg)
        .filter(m => !m.isError && !m.review)
        .map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        }));

      const payload = {
        messages: chatHistory,
        system_prompt: WAGORA_SETUP_SYSTEM_PROMPT,
        workspace_id: user?.id || ''
      };

      const response = await fetch(`${API_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('API server returned error status');
      }

      const data = await response.json();
      setIsThinking(false);

      const wagoraReply = data.reply;
      const config = data.config;
      const isComplete = data.is_complete;

      const replyMsgId = `wagora-${Date.now()}`;

      if (isComplete && config) {
        setAiConfig(config);

        setBrandData(prev => ({
          ...prev,
          name: config.campaign_name || prev.name,
          industry: config.target_industries?.[0] || prev.industry,
          whatYouSell: config.offer_description || prev.whatYouSell,
        }));

        setIcpData(prev => ({
          ...prev,
          industries: config.target_industries ? config.target_industries.join(', ') : prev.industries,
          roles: config.target_roles ? config.target_roles.join(', ') : prev.roles,
          geography: config.geography ? config.geography.join(', ') : prev.geography,
          threshold: config.icp_threshold ? String(config.icp_threshold) : prev.threshold,
        }));

        setCampaignName(config.campaign_name || '');

        setChatMessages(prev => [
          ...prev,
          {
            id: replyMsgId,
            sender: 'wagora',
            text: wagoraReply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          {
            id: `wagora-review-${Date.now()}`,
            sender: 'wagora',
            text: 'Wagora has configured your campaign. Review below.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            review: true,
          }
        ]);

        setActiveLogs(prev => [...prev, 'Configuration analysis complete.', 'Campaign parameters locked.']);
        // Step → 2: input becomes disabled, launch buttons are shown
        setChatStep(2);
      } else {
        setChatMessages(prev => [
          ...prev,
          {
            id: replyMsgId,
            sender: 'wagora',
            text: wagoraReply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
        ]);
        setActiveLogs(prev => [...prev, 'Response received successfully.', 'Awaiting next instruction.']);
      }
    } catch (err) {
      setIsThinking(false);
      setChatMessages(prev => [
        ...prev,
        {
          id: `wagora-error-${Date.now()}`,
          sender: 'wagora',
          text: 'AI setup is unavailable. Set up your campaign manually instead.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true
        }
      ]);
      setActiveLogs(prev => [...prev, 'Error: Backend server unreachable.']);
    }
  };

  const handlePresetSelect = (text: string) => {
    handleSendChat(text);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file.name);
      toast(`Document "${file.name}" uploaded. Wagora is parsing content...`, { type: 'success' });
      setActiveLogs(prev => [...prev, `Ingested file: ${file.name}`, 'Parsing layout tree...', 'Extracted value statements.']);
      
      // Auto reply with file content confirmation
      handleSendChat(`Uploaded brand document: ${file.name}`);
    }
  };

  const saveOnboardingAndLaunch = async (isAI: boolean) => {
    if (!user) {
      toast("Error: No authenticated user found", { type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const brandName = isAI ? (aiConfig?.campaign_name || 'AI Onboarded Brand') : (brandData.name || 'My Brand');
      const brandIndustry = isAI ? (aiConfig?.target_industries?.[0] || 'Fintech') : (brandData.industry || 'B2B');
      const sellText = isAI ? (aiConfig?.offer_description || 'Fintech sales and optimization services') : brandData.whatYouSell;
      const icpText = isAI 
        ? `Industries: ${aiConfig?.target_industries?.join(', ') || 'Any'}. Geography: ${aiConfig?.geography?.join(', ') || 'Any'}. Roles: ${aiConfig?.target_roles?.join(', ') || 'Any'}`
        : `Industries: ${icpData.industries || 'Any'}. Geography: ${icpData.geography || 'Any'}. Pain points: ${icpData.painPoints || 'None'}`;

      // 1. Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          business_name: brandName,
          industry: brandIndustry,
          onboarding_completed: true
        })
        .eq('id', user.id);

      if (profileError) throw new Error(profileError.message);

      // 2. Update workspace_settings table
      const { error: settingsError } = await supabase
        .from('workspace_settings')
        .update({
          what_you_sell: sellText,
          target_client_description: icpText,
          connected_platforms: platforms
        })
        .eq('user_id', user.id);

      if (settingsError) throw new Error(settingsError.message);

      // 3. Create initial campaign
      const selectedPlatform = Object.keys(platforms).find(k => platforms[k as keyof typeof platforms]) || 'email';
      const cPlatform = selectedPlatform.toLowerCase() === 'linkedin' 
        ? 'LinkedIn' 
        : selectedPlatform.toLowerCase() === 'instagram' 
        ? 'Instagram' 
        : 'Email';
      
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          user_id: user.id,
          name: isAI ? (aiConfig?.campaign_name || 'AI Onboarded Campaign') : (campaignName || `${brandName} Launch Campaign`),
          platform: cPlatform,
          description: `Outreach targeting: ${icpText}`,
          // BUG-06 FIX: launch as Draft — user must connect Gmail and add prospects first
          status: 'Draft'
        })
        .select()
        .single();

      if (campaignError) throw new Error(campaignError.message);

      // 4. Create initial activity
      await supabase
        .from('activities')
        .insert({
          user_id: user.id,
          type: 'campaign_status',
          message: `Campaign "${campaign.name}" has been launched successfully via autonomous setup.`,
          meta: 'Live'
        });

      // 5. Mark onboarding complete in React state so route guards let the user in
      markOnboardingComplete();

      toast("Setup complete! Connect Gmail in Settings → Platforms to activate your campaign.", { type: 'success' });
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      toast(`Setup failed: ${err?.message || 'Please check your connection and try again.'}`, { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleLaunch = () => {
    saveOnboardingAndLaunch(true);
  };

  const handleWizardLaunch = () => {
    saveOnboardingAndLaunch(false);
  };

  const handleFinishLater = async () => {
    // 1. Persist to Supabase (best-effort — don't block navigation on failure)
    if (user) {
      // fire-and-forget: Supabase builder returns PromiseLike, wrap for .catch()
      Promise.resolve(
        supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id)
      ).catch(() => {/* silent — user still proceeds to dashboard */});
    }

    // 2. Synchronously patch React state BEFORE navigate so ProtectedRoute
    //    sees isOnboardingComplete = true on its next render and does NOT
    //    redirect back to /onboarding (which caused the fake page-refresh bug)
    markOnboardingComplete();

    // 3. Navigate to dashboard
    navigate('/dashboard', { replace: true });
  };

  // Convert AI configurations
  // MIN-03 FIX: Removed hardcoded 'DesignForge' placeholder data — now starts blank
  const handleEditFirst = () => {
    if (aiConfig) {
      setBrandData({
        name: aiConfig.campaign_name || '',
        industry: aiConfig.target_industries?.[0] || '',
        whatYouSell: aiConfig.offer_description || '',
        brandVoice: 'Professional and direct',
      });
      setIcpData({
        industries: aiConfig.target_industries ? aiConfig.target_industries.join(', ') : '',
        roles: aiConfig.target_roles ? aiConfig.target_roles.join(', ') : '',
        companySize: '',
        geography: aiConfig.geography ? aiConfig.geography.join(', ') : '',
        painPoints: '',
        threshold: aiConfig.icp_threshold ? String(aiConfig.icp_threshold) : '7',
      });
    } else {
      // No AI config — start with blank fields so real user data is entered
      setBrandData({ name: '', industry: '', whatYouSell: '', brandVoice: 'Professional and direct' });
      setIcpData({ industries: '', roles: '', companySize: '', geography: '', painPoints: '', threshold: '7' });
    }
    setPlatforms({ email: true, linkedin: false, instagram: false });
    setCurrentStep(4);
    setOnboardingState('wizard');
  };

  const nextWizard = () => { if (currentStep < 4) setCurrentStep(currentStep + 1); };
  const prevWizard = () => { if (currentStep > 0) setCurrentStep(currentStep - 1); };

  return (
    // UX-05 FIX: removed select-none from root — users must be able to copy text
    <div className="min-h-screen bg-[var(--background-primary)] text-[var(--text-primary)] flex flex-col relative">
      {/* Absolute top progress indicator (2px Teal Line) */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-[var(--border-subtle)] z-50">
        <div 
          className="h-full bg-[var(--accent-primary)] transition-all duration-500" 
          style={{ 
            width: onboardingState === 'welcome' ? '10%' : 
                   onboardingState === 'select_mode' ? '25%' :
                   onboardingState === 'wizard' ? `${30 + currentStep * 20}%` :
                   `${35 + chatStep * 30}%`
          }} 
        />
      </div>

      {/* Main Container */}
      {onboardingState === 'ai_chat' ? (
        /* ==========================================
           FULL SCREEN IMMERSIVE AI CHAT CANVAS
           ========================================== */
        <div className="flex-1 flex flex-col lg:flex-row h-screen overflow-hidden">
          {/* Main Chat Panel */}
          <div className="flex-1 flex flex-col h-full border-r border-[var(--border-default)] bg-[var(--background-primary)] relative">
            
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--background-primary)] backdrop-blur-sm shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center bg-[var(--text-primary)] text-[var(--background-primary)] rounded-sm">
                  <Cpu size={16} />
                </div>
                <div>
                  <h1 className="font-clash text-sm font-bold text-[var(--text-primary)] tracking-tight leading-none">Wagora AI</h1>
                  <p className="text-[9px] font-mono text-[var(--text-muted)] tracking-wider mt-1 uppercase">Autonomous Setup Phase 02</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-primary)] animate-pulse" />
                <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-wider">Active Operator</span>
              </div>
            </header>

            {/* Chats Timeline Scroll Canvas */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex justify-center my-2">
                <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-widest bg-[var(--surface-elevated)] border border-[var(--border-subtle)] px-3 py-1 rounded-full">
                  Secure Session Initialized
                </span>
              </div>

              {chatMessages.map(msg => (
                <div 
                  key={msg.id}
                  className={`flex flex-col max-w-[85%] animate-fade-in ${
                    msg.sender === 'user' ? 'ml-auto items-end' : 'items-start'
                  }`}
                >
                  <div 
                    className={`p-4 rounded-xl shadow-sm text-sm leading-relaxed ${
                      msg.sender === 'user' 
                        ? 'bg-[var(--text-primary)] text-[var(--background-primary)] rounded-tr-none border border-[var(--border-default)]'
                        : msg.isError
                        ? 'bg-[var(--surface-card)] text-red-500 rounded-tl-none border border-red-500/25'
                        : 'bg-[var(--surface-card)] text-[var(--text-primary)] rounded-tl-none border border-[var(--border-default)]'
                    }`}
                  >
                    <p>{msg.text}</p>

                    {/* Fallback button for errors */}
                    {msg.isError && (
                      <div className="mt-3">
                        <button
                          onClick={() => {
                            setOnboardingState('wizard');
                            setCurrentStep(0);
                          }}
                          className="px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white rounded-[var(--radius-md)] text-xs font-bold transition-all"
                        >
                          Set up manually
                        </button>
                      </div>
                    )}

                    {/* Bento Cards (Nested in chat) */}
                    {msg.bento && (
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="bg-[var(--surface-elevated)] p-3 border border-[var(--border-subtle)] rounded-lg">
                          <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wider">ICP Strength</p>
                          <p className="text-lg font-clash font-bold text-[var(--accent-primary)] mt-1">
                            {msg.bento.score}
                          </p>
                        </div>
                        <div className="bg-[var(--surface-elevated)] p-3 border border-[var(--border-subtle)] rounded-lg">
                          <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wider">Total Targets</p>
                          <p className="text-lg font-clash font-bold text-[var(--text-primary)] mt-1">
                            {msg.bento.targets}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Configuration Review Layout (Nested in chat) */}
                    {msg.review && (
                      <div className="mt-4 space-y-3 w-full text-[var(--text-primary)]">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                          <div className="p-3 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-lg">
                            <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase">Brand Profile</p>
                            <p className="text-xs font-semibold mt-1">{aiConfig?.campaign_name || 'AI Onboarded'}</p>
                            <p className="text-[10px] text-[var(--text-secondary)]">Voice: Professional and direct</p>
                          </div>
                          <div className="p-3 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-lg">
                            <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase">Ideal Client (ICP)</p>
                            <p className="text-xs font-semibold mt-1">{aiConfig?.target_industries?.[0] || 'Fintech'}</p>
                            <p className="text-[10px] text-[var(--text-secondary)]">Score Threshold: {aiConfig?.icp_threshold || '7'}+</p>
                          </div>
                          <div className="p-3 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-lg">
                            <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase">Outbox channels</p>
                            {/* MIN-04 FIX: derive from actual platforms state, not hardcoded strings */}
                            <p className="text-xs font-semibold mt-1">
                              {Object.entries(platforms).filter(([,v]) => v).map(([k]) => k.charAt(0).toUpperCase() + k.slice(1)).join(' & ') || 'Email'}
                            </p>
                            <p className="text-[10px] text-[var(--text-secondary)]">20 outreach emails per day on Free</p>
                          </div>
                          <div className="p-3 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-lg">
                            <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase">Outreach Limits</p>
                            <p className="text-xs font-semibold mt-1">Spaced delivery</p>
                            <p className="text-[10px] text-[var(--text-secondary)]">Follow-ups: Day 3, 7, 14</p>
                          </div>
                        </div>

                        {/* Interactive Launch triggers */}
                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                          <button
                            onClick={handleEditFirst}
                            className="flex-1 px-4 py-2 border border-[var(--border-default)] bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)] text-[var(--text-primary)] rounded-[var(--radius-md)] text-xs font-bold transition-all"
                          >
                            Edit parameters
                          </button>
                          <button
                            onClick={handleLaunch}
                            disabled={saving}
                            className="flex-1 px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 text-white rounded-[var(--radius-md)] text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                          >
                            {saving ? (
                              <>
                                <Loader2 size={12} className="animate-spin" /> Launching...
                              </>
                            ) : (
                              'Launch campaign'
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] font-mono text-[var(--text-muted)] mt-1.5 px-1">
                    {msg.timestamp} · {msg.sender === 'user' ? 'Operator' : 'Wagora'}
                  </span>
                </div>
              ))}

              {/* Typing simulation */}
              {isThinking && (
                <div className="flex flex-col items-start max-w-[80%] animate-pulse">
                  <div className="p-4 bg-[var(--surface-card)] text-[var(--text-secondary)] rounded-xl rounded-tl-none border border-[var(--border-default)] flex items-center gap-2">
                    <Loader2 size={13} className="animate-spin text-[var(--accent-primary)]" />
                    <span className="text-xs">Wagora is calibrating parameters...</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Quick replies & Footer inputs */}
            <footer className="p-4 border-t border-[var(--border-default)] bg-[var(--background-primary)]">
              {/* Presets suggestions */}
              {chatStep === 0 && !isThinking && chatMessages.length === 1 && (
                <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none shrink-0">
                  <button 
                    onClick={() => handlePresetSelect("Focus on Series A-B fintech startups based in North America. Specifically looking for Heads of Growth or VP Sales.")}
                    className="px-3 py-1.5 bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] whitespace-nowrap transition-colors"
                  >
                    Series A-B Fintech North America
                  </button>
                  <button 
                    onClick={() => handlePresetSelect("Target SaaS founders in Europe with 10-50 employees for our design services.")}
                    className="px-3 py-1.5 bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] whitespace-nowrap transition-colors"
                  >
                    European SaaS Founders
                  </button>
                </div>
              )}

              {chatStep === 1 && !isThinking && (
                <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none shrink-0">
                  <button 
                    onClick={() => handlePresetSelect("We specialize in Webflow development and identity design. Pricing details are: Brand alignment begins at $1,500, complex sites at $5,000.")}
                    className="px-3 py-1.5 bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] whitespace-nowrap transition-colors"
                  >
                    Add specifications: Webflow & identity packages
                  </button>
                </div>
              )}

              {/* Input Control Hub */}
              <div className="relative flex items-end gap-2 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-1.5 focus-within:ring-1 focus-within:ring-[var(--accent-primary)] focus-within:border-[var(--accent-primary)] transition-all">
                <textarea
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChat(inputText);
                    }
                  }}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none py-2.5 px-3 max-h-32 focus:outline-none min-h-[38px] font-satoshi"
                  placeholder={chatStep === 2 ? "Campaign calibrated. Click Launch or edit above." : "Command Wagora..."}
                  rows={1}
                  disabled={chatStep === 2 || isThinking}
                />
                <div className="flex items-center gap-1.5 pr-1 pb-1">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={chatStep === 2 || isThinking}
                    className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-40 transition-colors flex items-center justify-center border border-transparent hover:border-[var(--border-default)] rounded-lg"
                    title="Upload support guidelines document"
                  >
                    <Upload size={14} />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".pdf,.docx,.txt"
                    className="hidden"
                  />
                  <button 
                    onClick={() => handleSendChat(inputText)}
                    disabled={!inputText.trim() || chatStep === 2 || isThinking}
                    className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-white p-2 rounded-lg flex items-center justify-center transition-all shadow-sm"
                  >
                    <Send size={13} />
                  </button>
                </div>
              </div>

              {/* Utility hotkeys and action sheets */}
              <div className="mt-2.5 flex items-center justify-between px-1 shrink-0">
                <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wider">ENTER to send message</p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setShowLogsDrawer(true)}
                    className="text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors flex items-center gap-1 font-mono uppercase"
                  >
                    <Terminal size={11} />
                    Logs
                  </button>
                  <button 
                    onClick={() => setShowConfigDrawer(true)}
                    className="text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors flex items-center gap-1 font-mono uppercase"
                  >
                    <SettingsIcon size={11} />
                    Config
                  </button>
                </div>
              </div>
            </footer>
          </div>

          {/* Desktop Operator Visualizer Sidebar */}
          <div className="hidden xl:block w-72 bg-[var(--background-secondary)] p-6 space-y-6 flex-col overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-[var(--border-default)]">
              <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-widest">Operator Visualizer</span>
              <Cpu size={12} className="text-[var(--accent-primary)] animate-pulse" />
            </div>

            <div className="border border-[var(--border-default)] bg-[var(--surface-card)] rounded-lg p-3 overflow-hidden shadow-sm">
              <img 
                className="w-full h-32 object-cover rounded grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-700" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBXpJvm2lz1qyFVp7QyLB-E3TXNKWqXW2mDnJP7ylt8UpLUE1qondY0dSKTxznBnCQm4URD8p4bxIB6dUW3_Th37xcMyql_2h-VyvwWSCJANOqMPatygJMvgKLcp-gpO47nTJ4LOnmgPU33KuhNEKgQY4EW8uqbTyfNdzI0k7te4Oxy9bsIOKkMyopGBCqK4HpmhA4Vq863VllX8ZyBFW2k3hGW0MTX6rmXeZ28xsyaR-Q23NjnJxldpcrsNGofRJMkKJNiI2N4YVQ" 
                alt="System visualizer graphic grid representing network connections"
              />
              <div className="mt-3 space-y-1.5">
                <div className="h-1 bg-[var(--accent-primary)] w-full rounded-full" />
                <div className="h-1 bg-[var(--border-default)] w-3/4 rounded-full" />
                <div className="h-1 bg-[var(--border-default)] w-1/2 rounded-full" />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">Live System Logs</h4>
              <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg p-4 font-mono text-[10px] text-[var(--text-secondary)] space-y-2 h-44 overflow-y-auto">
                {activeLogs.map((log, i) => (
                  <div key={i} className="flex items-start gap-1.5 leading-normal">
                    <span className="text-[var(--accent-primary)]">&gt;</span>
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg">
              <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase">System Status</span>
              <p className="text-xs font-semibold mt-1">Calibrating outreach limits</p>
              <div className="mt-2.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-ping" />
                <span className="text-[10px] text-[var(--text-secondary)]">Outbox stream live</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => setOnboardingState('select_mode')}
                className="w-full flex justify-center items-center gap-1.5 py-2 border border-[var(--border-default)] bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
              >
                <ArrowLeft size={12} /> Exit setup
              </button>
            </div>
          </div>

          {/* Action Sheets/Drawers */}
          {/* Logs Drawer overlay */}
          {showLogsDrawer && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-end" onClick={() => setShowLogsDrawer(false)}>
              <div className="w-full max-w-md bg-[var(--surface-card)] border-l border-[var(--border-default)] h-full p-6 space-y-6 flex flex-col justify-between" onClick={e => e.stopPropagation()}>
                <div className="space-y-4 flex-1 overflow-y-auto">
                  <div className="flex justify-between items-center pb-2 border-b border-[var(--border-subtle)]">
                    <h3 className="font-clash font-bold text-lg">System Session Logs</h3>
                    <button onClick={() => setShowLogsDrawer(false)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">Close</button>
                  </div>
                  <div className="bg-[var(--surface-elevated)] p-4 border border-[var(--border-subtle)] rounded-lg font-mono text-xs text-[var(--text-secondary)] space-y-2 h-[420px] overflow-y-auto">
                    {activeLogs.map((log, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-[var(--accent-primary)]">&gt;</span>
                        <span>{log}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <button 
                  onClick={() => setShowLogsDrawer(false)}
                  className="w-full py-2.5 bg-[var(--text-primary)] text-[var(--background-primary)] text-sm font-bold rounded-lg hover:opacity-90"
                >
                  Close Logs
                </button>
              </div>
            </div>
          )}

          {/* Config Parameters Drawer */}
          {showConfigDrawer && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-end" onClick={() => setShowConfigDrawer(false)}>
              <div className="w-full max-w-md bg-[var(--surface-card)] border-l border-[var(--border-default)] h-full p-6 space-y-6 flex flex-col justify-between" onClick={e => e.stopPropagation()}>
                <div className="space-y-4 flex-1 overflow-y-auto">
                  <div className="flex justify-between items-center pb-2 border-b border-[var(--border-subtle)]">
                    <h3 className="font-clash font-bold text-lg">Calibrated campaign parameters</h3>
                    <button onClick={() => setShowConfigDrawer(false)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">Close</button>
                  </div>
                  <pre className="bg-[var(--surface-elevated)] p-4 border border-[var(--border-subtle)] rounded-lg font-mono text-[11px] text-[var(--text-secondary)] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {/* MIN-03 FIX: only show real config, no fake placeholder data */}
                    {aiConfig ? JSON.stringify(aiConfig, null, 2) : 'No configuration yet — complete the AI setup to see your campaign parameters.'}
                  </pre>
                </div>
                <button 
                  onClick={() => setShowConfigDrawer(false)}
                  className="w-full py-2.5 bg-[var(--text-primary)] text-[var(--background-primary)] text-sm font-bold rounded-lg hover:opacity-90"
                >
                  Confirm Configuration
                </button>
              </div>
            </div>
          )}

        </div>
      ) : (
        /* ==========================================
           STANDARD WELCOME / SELECT MODE / WIZARD
           ========================================== */
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-xl">
            
            {/* Welcome Screen */}
            {onboardingState === 'welcome' && (
              <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-elevated)] p-8 sm:p-10 text-center space-y-6 animate-slide-in-up">
                <div className="w-12 h-12 rounded-full bg-[rgba(0,200,150,0.1)] border border-[var(--accent-primary)] flex items-center justify-center mx-auto mb-2">
                  <Sparkles size={20} className="text-[var(--accent-primary)]" />
                </div>
                <div className="space-y-2">
                  <h1 className="font-clash text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
                    Build your pipeline. Let Wagora run it.
                  </h1>
                  <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
                    Wagora handles outreach, conversations, and closing. You handle delivery. Setup takes 8 minutes.
                  </p>
                </div>
                <div className="pt-4 flex flex-col gap-3">
                  <button 
                    onClick={() => setOnboardingState('select_mode')} 
                    className="w-full flex items-center justify-center gap-2 bg-[var(--accent-primary)] text-white py-3 rounded-[var(--radius-md)] text-sm font-bold hover:bg-[var(--accent-primary-hover)] transition-colors shadow-lg shadow-[rgba(0,200,150,0.15)]"
                  >
                    Get started <ArrowRight size={16} />
                  </button>
                  <button 
                    onClick={handleFinishLater} 
                    className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                  >
                    Finish this later
                  </button>
                </div>
              </div>
            )}

            {/* Mode Selector Screen */}
            {onboardingState === 'select_mode' && (
              <div className="space-y-6 animate-slide-in-up">
                <div className="text-center space-y-1">
                  <h2 className="font-clash text-2xl font-bold text-[var(--text-primary)]">Choose your setup path</h2>
                  <p className="text-sm text-[var(--text-secondary)]">Wagora offers two ways to configure your pipeline.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Conversational AI Mode Card */}
                  <button
                    onClick={() => setOnboardingState('ai_chat')}
                    className="group p-6 bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)] border border-[var(--border-default)] hover:border-[var(--accent-primary)] rounded-[var(--radius-lg)] text-left transition-all space-y-4 hover:shadow-[var(--shadow-elevated)]"
                  >
                    <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[rgba(0,200,150,0.08)] border border-[var(--border-subtle)] flex items-center justify-center group-hover:bg-[rgba(0,200,150,0.12)] group-hover:border-[var(--accent-primary)] transition-all">
                      <MessageSquare size={18} className="text-[var(--accent-primary)]" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">AI Setup Interface</h3>
                        <span className="px-2 py-0.5 rounded-full bg-[rgba(0,200,150,0.1)] text-[var(--accent-primary)] text-[10px] font-bold">2 mins</span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        Brief Wagora in plain natural language. Wagora will configure, model, and prepare the campaign boundaries.
                      </p>
                    </div>
                  </button>

                  {/* Guided Wizard Mode Card */}
                  <button
                    onClick={() => setOnboardingState('wizard')}
                    className="group p-6 bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)] border border-[var(--border-default)] hover:border-[var(--accent-primary)] rounded-[var(--radius-lg)] text-left transition-all space-y-4 hover:shadow-[var(--shadow-elevated)]"
                  >
                    <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center group-hover:border-[var(--accent-primary)] transition-all">
                      <SlidersIcon size={18} className="text-[var(--text-secondary)] group-hover:text-[var(--accent-primary)]" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">Guided Wizard</h3>
                        <span className="px-2 py-0.5 rounded-full bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] text-[10px] font-bold">8 mins</span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        Manually define your brand voice, upload docs, detail your ideal target profile, and set platform thresholds step-by-step.
                      </p>
                    </div>
                  </button>
                </div>

                <div className="flex justify-center pt-2">
                  <button 
                    onClick={() => setOnboardingState('welcome')} 
                    className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                  >
                    <ArrowLeft size={12} /> Back to welcome
                  </button>
                </div>
              </div>
            )}

            {/* Wizard Setup Flow */}
            {onboardingState === 'wizard' && (
              <div>
                {/* Steps indicator */}
                <div className="mb-6 flex items-center justify-between">
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">{currentStep + 1} of 5 · {['Brand', 'Ideal client', 'Platforms', 'Set Up Your AI', 'Review'][currentStep]}</p>
                  <button onClick={handleFinishLater} className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">Finish this later</button>
                </div>
                
                <div className="flex gap-1.5 mb-6">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex-1 h-1 rounded-full transition-all" style={{ backgroundColor: i <= currentStep ? 'var(--accent-primary)' : 'var(--border-default)' }} />
                  ))}
                </div>

                <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-elevated)] p-6 sm:p-8 animate-slide-in-up">
                  {/* Step 1: Brand */}
                  {currentStep === 0 && (
                    <div className="space-y-5">
                      <div>
                        <h2 className="font-clash text-xl font-bold text-[var(--text-primary)]">Your brand.</h2>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">Wagora uses this to represent you in every outreach and conversation.</p>
                      </div>
                      {[
                        { label: 'Brand name', key: 'name' as const, placeholder: 'Fortex Forge' },
                        { label: 'Industry', key: 'industry' as const, placeholder: 'B2B Services' },
                        { label: 'What you sell', key: 'whatYouSell' as const, placeholder: 'Brand identity packages for growing companies' },
                      ].map(f => (
                        <div key={f.key}>
                          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">{f.label}</label>
                          <input type="text" value={brandData[f.key]} onChange={e => setBrandData(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder} className="w-full px-3 py-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none" />
                        </div>
                      ))}
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Brand voice</label>
                        <p className="text-xs text-[var(--text-muted)] mb-2">This shapes how Wagora writes and responds. Choose what is closest to how you naturally communicate.</p>
                        <div className="grid grid-cols-2 gap-2">
                          {['Professional and direct', 'Conversational and warm', 'Bold and assertive', 'Minimal and precise'].map(v => (
                            <button key={v} onClick={() => setBrandData(prev => ({ ...prev, brandVoice: v }))} className={`p-3 rounded-[var(--radius-md)] border text-xs font-semibold text-left transition-all ${brandData.brandVoice === v ? 'border-[var(--accent-primary)] bg-[rgba(0,200,150,0.08)] text-[var(--text-primary)]' : 'border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'}`}>
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="pt-2 border-t border-[var(--border-subtle)]">
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Brand documents</label>
                        <p className="text-xs text-[var(--text-muted)] mb-3">Offer guides, pricing decks, tone of voice docs, past proposals. More context means sharper outreach.</p>
                        <button className="flex items-center gap-2 px-4 py-2 border border-dashed border-[var(--border-default)] rounded-[var(--radius-md)] text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors">
                          <Upload size={16} /> Add documents
                        </button>
                        <p className="text-[10px] text-[var(--text-muted)] mt-2">PDF, DOCX, or TXT. Up to 10 files, 20MB each.</p>
                      </div>
                    </div>
                  )}

                  {/* Step 2: ICP */}
                  {currentStep === 1 && (
                    <div className="space-y-5">
                      <div>
                        <h2 className="font-clash text-xl font-bold text-[var(--text-primary)]">Your ideal client.</h2>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">Wagora uses this to identify, score, and qualify every prospect before a single message is sent.</p>
                      </div>
                      {[
                        { label: 'Target industries', key: 'industries' as const, placeholder: 'E-commerce, SaaS, Fintech' },
                        { label: 'Target roles and titles', key: 'roles' as const, placeholder: 'CEO, CTO, Founder, Head of Growth' },
                        { label: 'Company size', key: 'companySize' as const, placeholder: '10-200 employees' },
                        { label: 'Geography', key: 'geography' as const, placeholder: 'Lagos, Accra, Nairobi, London' },
                      ].map(f => (
                        <div key={f.key}>
                          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">{f.label}</label>
                          <input type="text" value={icpData[f.key]} onChange={e => setIcpData(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder} className="w-full px-3 py-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none" />
                        </div>
                      ))}
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Key pain points</label>
                        <p className="text-xs text-[var(--text-muted)] mb-1">Be specific. The more precisely you describe the problem your client is dealing with, the more accurately Wagora can match.</p>
                        <textarea value={icpData.painPoints} onChange={e => setIcpData(prev => ({ ...prev, painPoints: e.target.value }))} placeholder="Inconsistent brand identity across channels, slow client acquisition, no structured pipeline..." rows={3} className="w-full px-3 py-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none resize-none font-satoshi" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Minimum ICP match score</label>
                        <p className="text-xs text-[var(--text-muted)] mb-2">Wagora scores every prospect 1–10. Only prospects above this threshold enter the campaign.</p>
                        <div className="flex gap-2">
                          {['6', '7', '8', '9'].map(t => (
                            <button key={t} onClick={() => setIcpData(prev => ({ ...prev, threshold: t }))} className={`flex-1 py-2 rounded-[var(--radius-md)] border text-sm font-bold transition-all ${icpData.threshold === t ? 'border-[var(--accent-primary)] bg-[rgba(0,200,150,0.08)] text-[var(--accent-primary)]' : 'border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-secondary)]'}`}>
                              {t}+
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Platforms */}
                  {currentStep === 2 && (
                    <div className="space-y-5">
                      <div>
                        <h2 className="font-clash text-xl font-bold text-[var(--text-primary)]">Where Wagora reaches out.</h2>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">Connect your accounts. Set your limits. Wagora operates within those boundaries.</p>
                      </div>
                      {[
                        { id: 'email', name: 'Email', desc: 'Primary channel. Highest deliverability. Recommended.', key: 'email' as const },
                        { id: 'linkedin', name: 'LinkedIn', desc: 'Strong for B2B. Requires account connection.', key: 'linkedin' as const },
                        { id: 'instagram', name: 'Instagram', desc: 'Best for creative and consumer-facing brands.', key: 'instagram' as const },
                      ].map(p => (
                        <button key={p.id} onClick={() => setPlatforms(prev => ({ ...prev, [p.key]: !prev[p.key] }))} className={`w-full flex items-center gap-4 p-4 rounded-[var(--radius-md)] border text-left transition-all ${platforms[p.key] ? 'border-[var(--accent-primary)] bg-[rgba(0,200,150,0.06)]' : 'border-[var(--border-default)] bg-[var(--surface-elevated)]'}`}>
                          <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${platforms[p.key] ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]' : 'border-[var(--border-default)]'}`}>
                            {platforms[p.key] && <Check size={12} className="text-white" />}
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-[var(--text-primary)]">{p.name}</h4>
                            <p className="text-xs text-[var(--text-muted)]">{p.desc}</p>
                          </div>
                        </button>
                      ))}
                      <div className="pt-4 border-t border-[var(--border-subtle)]">
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Follow-up intervals</label>
                        <p className="text-xs text-[var(--text-muted)] mb-2">If a prospect does not reply, Wagora follows up at these intervals. Stops on first reply.</p>
                        <div className="flex gap-2 text-sm font-medium text-[var(--text-secondary)]">
                          {['Day 3', 'Day 7', 'Day 14'].map(d => (
                            <span key={d} className="px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">{d}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Set Up Your AI */}
                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="font-clash text-xl font-bold text-[var(--text-primary)]">Set up your AI.</h2>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">Upload brand documents. Wagora parses them to write outreach and handle conversations in your voice.</p>
                      </div>

                      <div className="space-y-4">
                        {[
                          { key: 'business_profile', name: 'About My Business', desc: 'General business profile or introduction (max 5MB)', maxSize: 5, required: true },
                          { key: 'service_catalog', name: 'My Services and Prices', desc: 'Catalog detailing offerings and pricing (max 10MB)', maxSize: 10, required: true },
                          { key: 'ideal_client', name: 'My Ideal Client', desc: 'Ideal client profile and target persona guidelines (max 5MB)', maxSize: 5, required: true },
                          { key: 'brand_voice', name: 'My Brand Voice', desc: 'Tone of voice and communication manual (max 5MB)', maxSize: 5, required: true },
                          { key: 'social_proof', name: 'Reviews and Results', desc: 'Case studies, reviews, and client results (max 10MB)', maxSize: 10, required: false },
                          { key: 'verbal_identity', name: 'My Verbal Identity', desc: 'Brand naming and taglines (max 10MB)', maxSize: 10, required: false }
                        ].map(type => {
                          const doc = wizardDocs.find(d => d.document_type === type.key);
                          const isUploading = uploadingDocType === type.key;
                          const error = docErrors[type.key];

                          return (
                            <div key={type.key} className="p-4 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-elevated)] space-y-3">
                              <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">{type.name}</h4>
                                    {type.required && (
                                      <span className="px-1.5 py-0.5 rounded-full bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] text-[9px] font-bold uppercase tracking-wider">Required</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-[var(--text-muted)]">{type.desc}</p>
                                </div>

                                <div>
                                  {doc ? (
                                    <button
                                      type="button"
                                      onClick={() => handleWizardDocDelete(doc.id, doc.storage_path)}
                                      className="text-xs font-bold text-[var(--destructive)] hover:underline cursor-pointer bg-transparent border-none p-0"
                                    >
                                      Remove
                                    </button>
                                  ) : (
                                    <label className={`text-xs font-bold text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] cursor-pointer flex items-center gap-1.5 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                      {isUploading ? (
                                        <>
                                          <Loader2 size={12} className="animate-spin" /> Uploading...
                                        </>
                                      ) : (
                                        <>
                                          <Upload size={12} /> Upload
                                        </>
                                      )}
                                      <input
                                        type="file"
                                        accept=".pdf,.docx,.txt"
                                        onChange={e => {
                                          const file = e.target.files?.[0];
                                          if (file) handleWizardDocUpload(file, type.key, type.maxSize);
                                        }}
                                        className="hidden"
                                      />
                                    </label>
                                  )}
                                </div>
                              </div>

                              {doc && (
                                <div className="flex items-center justify-between bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] p-2.5">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <FileText size={14} className="text-[var(--text-muted)] shrink-0" />
                                    <span className="text-xs text-[var(--text-primary)] truncate font-medium">{doc.name}</span>
                                    <span className="text-[10px] text-[var(--text-muted)] shrink-0 font-mono">({doc.size})</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                      doc.status === 'Active' 
                                        ? 'bg-[rgba(0,200,150,0.1)] text-[var(--accent-primary)]' 
                                        : doc.status === 'Processing' 
                                        ? 'bg-amber-500/10 text-amber-500 animate-pulse' 
                                        : 'bg-red-500/10 text-red-500'
                                    }`}>
                                      {doc.status}
                                    </span>
                                  </div>
                                </div>
                              )}

                              {error && (
                                <p className="text-[10px] font-semibold text-[var(--destructive)] flex items-center gap-1">
                                  <ShieldAlert size={10} /> {error}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Step 5: Review */}
                  {currentStep === 4 && (
                    <div className="space-y-5">
                      <div>
                        <h2 className="font-clash text-xl font-bold text-[var(--text-primary)]">Review before launch.</h2>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">Wagora begins scraping prospects and preparing outreach once you confirm.</p>
                      </div>
                      {[
                        { label: 'Brand', items: [brandData.name || 'Not set', brandData.industry || 'Not set', brandData.brandVoice], step: 0 },
                        { label: 'Ideal client', items: [icpData.industries || 'Not set', icpData.roles || 'Not set', `Score threshold: ${icpData.threshold}+`], step: 1 },
                        { label: 'Platforms', items: Object.entries(platforms).filter(([,v]) => v).map(([k]) => k.charAt(0).toUpperCase() + k.slice(1)), step: 2 },
                        { label: 'Brand documents', items: [
                          `Business Profile: ${wizardDocs.find(d => d.document_type === 'business_profile')?.name || 'Not uploaded'}`,
                          `Service Catalog: ${wizardDocs.find(d => d.document_type === 'service_catalog')?.name || 'Not uploaded'}`,
                          `Ideal Client: ${wizardDocs.find(d => d.document_type === 'ideal_client')?.name || 'Not uploaded'}`,
                          `Brand Voice: ${wizardDocs.find(d => d.document_type === 'brand_voice')?.name || 'Not uploaded'}`,
                        ], step: 3 },
                      ].map(s => (
                        <div key={s.label} className="p-4 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-elevated)]">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-[var(--text-primary)]">{s.label}</h4>
                            <button type="button" onClick={() => setCurrentStep(s.step)} className="text-xs font-bold text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] bg-transparent border-none p-0 cursor-pointer">Edit</button>
                          </div>
                          <div className="space-y-1">
                            {s.items.map((item, i) => (
                              <p key={i} className="text-xs text-[var(--text-secondary)]">{item}</p>
                            ))}
                          </div>
                        </div>
                      ))}
                      <div className="p-4 rounded-[var(--radius-md)] border border-[var(--accent-primary)] bg-[rgba(0,200,150,0.06)]">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">Ready.</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">Wagora will identify prospects matching your ICP. First outreach goes out within 2 hours.</p>
                      </div>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex gap-3 mt-8">
                    <button 
                      type="button"
                      onClick={currentStep === 0 ? () => setOnboardingState('select_mode') : prevWizard} 
                      className="flex items-center gap-2 px-4 py-2.5 bg-[var(--surface-elevated)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-[var(--radius-md)] text-sm font-bold hover:bg-[var(--surface-card)] transition-colors cursor-pointer"
                    >
                      <ArrowLeft size={16} /> Back
                    </button>
                    <button 
                      type="button"
                      onClick={currentStep === 4 ? handleWizardLaunch : nextWizard} 
                      disabled={saving || (currentStep === 3 && !['business_profile', 'service_catalog', 'ideal_client', 'brand_voice'].every(type => wizardDocs.some(d => d.document_type === type)))}
                      className="flex-1 flex items-center justify-center gap-2 bg-[var(--accent-primary)] text-white py-2.5 rounded-[var(--radius-md)] text-sm font-bold hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      {saving && currentStep === 4 ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Launching...
                        </>
                      ) : (
                        <>
                          {currentStep === 4 ? 'Launch campaign' : 'Continue'} <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

// CQ-05 FIX: renamed from 'Settings' to 'SlidersIcon' to avoid naming conflict with settings page
// Simple custom component for Sliders
function SlidersIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="2" y1="14" x2="6" y2="14" />
      <line x1="10" y1="8" x2="14" y2="8" />
      <line x1="18" y1="16" x2="22" y2="16" />
    </svg>
  );
}
