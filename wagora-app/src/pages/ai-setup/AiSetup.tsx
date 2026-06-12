import { useState, useRef, useEffect, useCallback, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Send, Mic, MicOff, Paperclip, RotateCcw,
  Bot, Loader2, CheckCircle2, ChevronRight, ExternalLink,
  FileText, X, Upload, Megaphone, Users, MessageSquare,
  Target, Zap, Phone, Mail, Link2, Camera,
  PlayCircle, Clock, AlertCircle,
} from 'lucide-react';
import { useCampaigns, type Campaign } from '@/hooks/useCampaigns';

/* ────────────────────────────────────────────────────────────
   TYPES
──────────────────────────────────────────────────────────── */
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  quickReplies?: string[];
  attachments?: UploadedFile[];
}

interface UploadedFile {
  name: string;
  type: string;
  size: string;
}

interface AgentAction {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  timestamp: Date;
}

interface CampaignDraft {
  name?: string;
  platform?: 'Email' | 'LinkedIn' | 'Instagram';
  description?: string;
  targetIndustry?: string;
  targetLocation?: string;
  targetAudienceSize?: number;
  outreachGoal?: string;
  tone?: string;
  messageTemplate?: string;
  followUpDays?: number;
}

/* ────────────────────────────────────────────────────────────
   CAMPAIGN STORE — shared state that persists to "Campaigns"
──────────────────────────────────────────────────────────── */
// We use a simple module-level store so the created campaign is
// available in Campaigns.tsx without a full Redux/Zustand setup.
export const pendingCampaignStore = { campaign: null as Campaign | null };

/* ────────────────────────────────────────────────────────────
   CONVERSATION ENGINE
   A state-machine that drives what the agent asks next.
──────────────────────────────────────────────────────────── */
type Stage =
  | 'idle'
  | 'goal'
  | 'platform'
  | 'industry'
  | 'location'
  | 'audience'
  | 'tone'
  | 'message_template'
  | 'followup'
  | 'confirm'
  | 'executing'
  | 'done';

interface ConversationState {
  stage: Stage;
  draft: CampaignDraft;
  actions: AgentAction[];
}

type ConvAction =
  | { type: 'ADVANCE'; stage: Stage; draftPatch?: Partial<CampaignDraft> }
  | { type: 'ADD_ACTION'; action: AgentAction }
  | { type: 'UPDATE_ACTION'; id: string; status: AgentAction['status'] }
  | { type: 'RESET' };

function convReducer(state: ConversationState, action: ConvAction): ConversationState {
  switch (action.type) {
    case 'ADVANCE':
      return { ...state, stage: action.stage, draft: { ...state.draft, ...action.draftPatch } };
    case 'ADD_ACTION':
      return { ...state, actions: [...state.actions, action.action] };
    case 'UPDATE_ACTION':
      return {
        ...state,
        actions: state.actions.map(a =>
          a.id === action.id ? { ...a, status: action.status } : a
        ),
      };
    case 'RESET':
      return { stage: 'idle', draft: {}, actions: [] };
    default:
      return state;
  }
}

/* ─────── Helpers ─────── */
function extractPlatform(text: string): 'Email' | 'LinkedIn' | 'Instagram' | undefined {
  const l = text.toLowerCase();
  if (l.includes('linkedin')) return 'LinkedIn';
  if (l.includes('instagram') || l.includes('ig')) return 'Instagram';
  if (l.includes('email') || l.includes('mail')) return 'Email';
  return undefined;
}

function extractNumber(text: string): number | undefined {
  const m = text.match(/\b(\d[\d,]*)\b/);
  return m ? parseInt(m[1].replace(/,/g, '')) : undefined;
}

function buildCampaignName(draft: CampaignDraft): string {
  const loc = draft.targetLocation ? ` — ${draft.targetLocation}` : '';
  const base = draft.targetIndustry
    ? `${draft.targetIndustry} Outreach${loc}`
    : draft.outreachGoal
    ? draft.outreachGoal
    : 'AI-Built Campaign';
  return base;
}

function buildDescription(draft: CampaignDraft): string {
  const parts: string[] = [];
  if (draft.outreachGoal) parts.push(draft.outreachGoal);
  if (draft.targetIndustry && draft.targetLocation)
    parts.push(`Targeting ${draft.targetIndustry} businesses in ${draft.targetLocation}.`);
  else if (draft.targetIndustry)
    parts.push(`Targeting ${draft.targetIndustry} businesses.`);
  if (draft.tone) parts.push(`Tone: ${draft.tone}.`);
  return parts.join(' ') || 'AI-generated campaign via Wagora Agent.';
}

/* ────────────────────────────────────────────────────────────
   AGENT SCRIPT — What the agent asks at each stage
──────────────────────────────────────────────────────────── */
const agentScript: Record<Stage, { message: string; quickReplies?: string[] }> = {
  idle: { message: '' },
  goal: {
    message: `Got it — I'm on it. First, help me understand your **end goal**.\n\nWhat do you want to achieve with this campaign? Be as specific or as broad as you like — I'll figure out the rest.`,
    quickReplies: ['Find new clients in my niche', 'Follow up with warm leads', 'Cold outreach to decision-makers', 'Re-engage past clients', 'Book discovery calls'],
  },
  platform: {
    message: `Understood. Now — which **outreach channel** should I set up for this campaign? Each has different strengths.`,
    quickReplies: ['Email', 'LinkedIn', 'Instagram'],
  },
  industry: {
    message: `Which **industry or niche** are we targeting? This shapes how Wagora writes your outreach messages and filters prospects.`,
    quickReplies: ['Real Estate', 'SaaS / Tech', 'Finance & Fintech', 'E-Commerce', 'Healthcare', 'Logistics', 'Creative / Agency', 'Consulting'],
  },
  location: {
    message: `Where are your ideal prospects **located**? You can be broad (e.g. "Nigeria") or specific (e.g. "Lagos Island").`,
    quickReplies: ['Lagos', 'Abuja', 'All of Nigeria', 'London', 'New York', 'Dubai', 'Pan-Africa', 'Global'],
  },
  audience: {
    message: `How many prospects should this campaign target? I'll size the outreach sequence accordingly.`,
    quickReplies: ['Under 50', '50–150', '150–500', '500–1,000', '1,000+'],
  },
  tone: {
    message: `What **tone** should Wagora use when reaching out on your behalf?`,
    quickReplies: ['Professional & formal', 'Friendly & conversational', 'Bold & direct', 'Consultative & value-led', 'Casual & relaxed'],
  },
  message_template: {
    message: `Do you have a specific **opener or message angle** you want me to use? You can describe it, paste a draft, or attach a doc.\n\nIf not, I'll generate one based on your brand voice.`,
    quickReplies: ['Generate one for me', "I'll describe it", 'Attach a document'],
  },
  followup: {
    message: `How many **follow-up touchpoints** should Wagora send if a prospect doesn't reply?`,
    quickReplies: ['1 follow-up', '2 follow-ups', '3 follow-ups (recommended)', '4–5 follow-ups', 'Keep following up until they reply'],
  },
  confirm: { message: '' },
  executing: { message: '' },
  done: { message: '' },
};

/* ────────────────────────────────────────────────────────────
   SUBCOMPONENTS
──────────────────────────────────────────────────────────── */
function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 150, 300].map(delay => (
        <span
          key={delay}
          className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

function AgentAvatar({ small = false }: { small?: boolean }) {
  const sz = small ? 'w-7 h-7' : 'w-9 h-9';
  return (
    <div className={`${sz} rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-emerald-600 flex items-center justify-center shrink-0 shadow-sm`}>
      <Sparkles size={small ? 14 : 17} className="text-white" />
    </div>
  );
}

function formatContent(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((p, i) =>
    i % 2 === 1
      ? <strong key={i} className="font-semibold text-[var(--text-primary)]">{p}</strong>
      : p
  );
}

function ActionItem({ action }: { action: AgentAction }) {
  const icons = {
    pending: <Clock size={13} className="text-[var(--text-muted)]" />,
    running: <Loader2 size={13} className="text-[var(--accent-primary)] animate-spin" />,
    done: <CheckCircle2 size={13} className="text-emerald-500" />,
    error: <AlertCircle size={13} className="text-[var(--destructive)]" />,
  };
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <span className="shrink-0">{icons[action.status]}</span>
      <span className={`text-[12px] leading-snug ${
        action.status === 'done' ? 'text-[var(--text-secondary)] line-through opacity-60' :
        action.status === 'running' ? 'text-[var(--text-primary)] font-medium' :
        'text-[var(--text-muted)]'
      }`}>
        {action.label}
      </span>
    </div>
  );
}

function CampaignPreviewCard({ draft, isComplete = false }: { draft: CampaignDraft; isComplete?: boolean }) {
  const platformIcon = draft.platform === 'Email' ? <Mail size={14} />
    : draft.platform === 'LinkedIn' ? <Link2 size={14} />
    : draft.platform === 'Instagram' ? <Camera size={14} />
    : <Megaphone size={14} />;

  const fields = [
    { icon: <Target size={12} />, label: 'Goal', value: draft.outreachGoal },
    { icon: <Megaphone size={12} />, label: 'Industry', value: draft.targetIndustry },
    { icon: <Users size={12} />, label: 'Location', value: draft.targetLocation },
    { icon: platformIcon, label: 'Channel', value: draft.platform },
    { icon: <MessageSquare size={12} />, label: 'Tone', value: draft.tone },
    { icon: <Zap size={12} />, label: 'Follow-ups', value: draft.followUpDays ? `${draft.followUpDays} touchpoints` : undefined },
  ].filter(f => f.value);

  if (fields.length === 0) return null;

  return (
    <div className={`rounded-xl border p-4 transition-all duration-300 ${
      isComplete
        ? 'bg-gradient-to-br from-[var(--accent-primary)]/8 to-emerald-500/5 border-[var(--accent-primary)]/30'
        : 'bg-[var(--surface-card)] border-[var(--border-default)]'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] uppercase tracking-widest text-[var(--text-muted)] font-bold font-clash">
          {isComplete ? '✅ Campaign Ready' : '🔧 Building Campaign'}
        </p>
        {isComplete && (
          <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 rounded-full px-2 py-0.5">READY TO LAUNCH</span>
        )}
      </div>

      {draft.name && (
        <h3 className="font-clash font-bold text-[var(--text-primary)] text-[15px] mb-3 leading-tight">{draft.name}</h3>
      )}

      <div className="space-y-2">
        {fields.map(f => (
          <div key={f.label} className="flex items-center gap-2">
            <span className="text-[var(--text-muted)] shrink-0">{f.icon}</span>
            <span className="text-[12px] text-[var(--text-muted)] shrink-0 w-14">{f.label}</span>
            <span className="text-[12px] text-[var(--text-primary)] font-medium truncate">{f.value}</span>
          </div>
        ))}
      </div>

      {draft.targetAudienceSize && (
        <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-[var(--text-muted)]">Prospects target</span>
            <span className="text-[13px] font-bold font-mono text-[var(--text-primary)]">
              {draft.targetAudienceSize.toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   STARTER CARDS
──────────────────────────────────────────────────────────── */
const STARTERS = [
  { icon: Users, label: 'Reach real estate brands in Lagos', gradient: 'from-emerald-500 to-teal-600' },
  { icon: Mail, label: 'Cold email 200 fintech founders', gradient: 'from-blue-500 to-indigo-600' },
  { icon: Phone, label: 'Book discovery calls with SaaS CTOs', gradient: 'from-purple-500 to-violet-600' },
  { icon: MessageSquare, label: 'Follow up with warm leads on WhatsApp', gradient: 'from-orange-500 to-rose-600' },
];

/* ────────────────────────────────────────────────────────────
   MAIN COMPONENT
──────────────────────────────────────────────────────────── */
export default function AiSetup() {
  const navigate = useNavigate();
  const { createCampaign } = useCampaigns();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [createdCampaign, setCreatedCampaign] = useState<Campaign | null>(null);

  const [conv, dispatch] = useReducer(convReducer, { stage: 'idle', draft: {}, actions: [] });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isIdle = messages.length === 0;
  const isExecuting = conv.stage === 'executing';
  const isDone = conv.stage === 'done';

  /* ── scroll to bottom ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  /* ── add assistant message after delay ── */
  const assistantSay = useCallback((
    content: string,
    quickReplies?: string[],
    delayMs = 700 + Math.random() * 600
  ) => {
    setIsThinking(true);
    return new Promise<void>(resolve => {
      setTimeout(() => {
        setIsThinking(false);
        setMessages(prev => [...prev, {
          id: `ai-${Date.now()}-${Math.random()}`,
          role: 'assistant',
          content,
          timestamp: new Date(),
          quickReplies,
        }]);
        resolve();
      }, delayMs);
    });
  }, []);

  /* ── add action to log ── */
  const addAction = useCallback((label: string): string => {
    const id = `act-${Date.now()}-${Math.random()}`;
    dispatch({ type: 'ADD_ACTION', action: { id, label, status: 'pending', timestamp: new Date() } });
    return id;
  }, []);

  const runAction = useCallback((id: string, doneAfterMs = 1200) => {
    dispatch({ type: 'UPDATE_ACTION', id, status: 'running' });
    return new Promise<void>(resolve => {
      setTimeout(() => {
        dispatch({ type: 'UPDATE_ACTION', id, status: 'done' });
        resolve();
      }, doneAfterMs);
    });
  }, []);

  /* ── EXECUTION: simulate creating the campaign ── */
  const executeCampaign = useCallback(async (draft: CampaignDraft) => {
    dispatch({ type: 'ADVANCE', stage: 'executing' });

    const step1 = addAction('Drafting campaign name and description');
    const step2 = addAction('Configuring prospect filters');
    const step3 = addAction('Generating outreach message templates');
    const step4 = addAction('Setting up follow-up sequences');
    const step5 = addAction('Saving campaign to Wagora');

    await runAction(step1, 1400);
    await runAction(step2, 1600);
    await runAction(step3, 1800);
    await runAction(step4, 1200);

    try {
      const savedCampaign = await createCampaign({
        name: draft.name ?? buildCampaignName(draft),
        platform: draft.platform ?? 'Email',
        description: buildDescription(draft),
        status: 'Live',
        prospects: draft.targetAudienceSize ?? 0,
        replies: 0,
        closed: 0,
        last_active: 'Just now',
      });

      await runAction(step5, 1000);

      pendingCampaignStore.campaign = savedCampaign;
      setCreatedCampaign(savedCampaign);

      dispatch({ type: 'ADVANCE', stage: 'done', draftPatch: { name: savedCampaign.name } });

      await assistantSay(
        `🚀 **Your campaign is live.**\n\n"${savedCampaign.name}" has been created and added to Wagora. Here's what I've set up:\n\n• **${savedCampaign.platform}** outreach configured\n• **${(savedCampaign.prospects || 0).toLocaleString()}** prospects in the pipeline\n• Message templates drafted in your brand tone\n• Follow-up sequences armed and ready\n\nWagora will begin prospecting immediately. You can monitor everything under **Campaigns**.`,
        ['View campaign', 'Build another campaign', 'Go to Dashboard'],
        1200
      );
    } catch (err: any) {
      dispatch({ type: 'UPDATE_ACTION', id: step5, status: 'error' });
      await assistantSay(
        `❌ **Failed to save the campaign to the database.**\n\nError: ${err.message || 'Unknown error'}. Please try again.`,
        ['Yes — build it now', 'Start over'],
        1000
      );
      dispatch({ type: 'ADVANCE', stage: 'confirm' });
    }
  }, [addAction, runAction, assistantSay, createCampaign]);

  /* ── SEND handler — drives the conversation forward ── */
  const handleSend = useCallback(async (text: string, files: UploadedFile[] = []) => {
    const trimmed = text.trim();
    if ((!trimmed && files.length === 0) || isThinking || isExecuting || isDone) return;

    setInput('');
    setUploadedFiles([]);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed || `[Attached: ${files.map(f => f.name).join(', ')}]`,
      timestamp: new Date(),
      attachments: files.length > 0 ? files : undefined,
    };
    setMessages(prev => [...prev, userMsg]);

    const lower = trimmed.toLowerCase();
    const stage = conv.stage;
    const draft = conv.draft;

    /* ── Stage machine: process reply and advance ── */
    if (stage === 'idle' || stage === 'goal') {
      const patch: Partial<CampaignDraft> = { outreachGoal: trimmed };
      dispatch({ type: 'ADVANCE', stage: 'platform', draftPatch: patch });
      const script = agentScript.platform;
      await assistantSay(script.message, script.quickReplies);
      return;
    }

    if (stage === 'platform') {
      const platform = extractPlatform(trimmed) ?? (trimmed as Campaign['platform']);
      dispatch({ type: 'ADVANCE', stage: 'industry', draftPatch: { platform } });
      await assistantSay(agentScript.industry.message, agentScript.industry.quickReplies);
      return;
    }

    if (stage === 'industry') {
      dispatch({ type: 'ADVANCE', stage: 'location', draftPatch: { targetIndustry: trimmed } });
      await assistantSay(agentScript.location.message, agentScript.location.quickReplies);
      return;
    }

    if (stage === 'location') {
      dispatch({ type: 'ADVANCE', stage: 'audience', draftPatch: { targetLocation: trimmed } });
      await assistantSay(agentScript.audience.message, agentScript.audience.quickReplies);
      return;
    }

    if (stage === 'audience') {
      let size = extractNumber(trimmed);
      if (!size) {
        if (lower.includes('under 50')) size = 30;
        else if (lower.includes('50') && lower.includes('150')) size = 100;
        else if (lower.includes('150') || lower.includes('500')) size = 300;
        else if (lower.includes('1,000') || lower.includes('1000')) size = 1000;
        else size = 100;
      }
      dispatch({ type: 'ADVANCE', stage: 'tone', draftPatch: { targetAudienceSize: size } });
      await assistantSay(agentScript.tone.message, agentScript.tone.quickReplies);
      return;
    }

    if (stage === 'tone') {
      dispatch({ type: 'ADVANCE', stage: 'message_template', draftPatch: { tone: trimmed } });
      await assistantSay(agentScript.message_template.message, agentScript.message_template.quickReplies);
      return;
    }

    if (stage === 'message_template') {
      const template = lower.includes('generate') ? 'AI-generated based on brand voice' : trimmed;
      dispatch({ type: 'ADVANCE', stage: 'followup', draftPatch: { messageTemplate: template } });
      await assistantSay(agentScript.followup.message, agentScript.followup.quickReplies);
      return;
    }

    if (stage === 'followup') {
      let followUps = extractNumber(trimmed) ?? 3;
      if (lower.includes('1 follow')) followUps = 1;
      else if (lower.includes('2 follow')) followUps = 2;
      else if (lower.includes('3 follow')) followUps = 3;
      else if (lower.includes('4') || lower.includes('5')) followUps = 5;
      else if (lower.includes('keep follow')) followUps = 10;

      const finalDraft: CampaignDraft = { ...draft, followUpDays: followUps };
      const campaignName = buildCampaignName(finalDraft);
      const updatedDraft = { ...finalDraft, name: campaignName };
      dispatch({ type: 'ADVANCE', stage: 'confirm', draftPatch: updatedDraft });

      await assistantSay(
        `Here's your campaign summary — everything I need to build this for you:\n\n🎯 **Goal:** ${updatedDraft.outreachGoal}\n📡 **Channel:** ${updatedDraft.platform}\n🏢 **Industry:** ${updatedDraft.targetIndustry}\n📍 **Location:** ${updatedDraft.targetLocation}\n👥 **Prospects:** ${(updatedDraft.targetAudienceSize ?? 0).toLocaleString()}\n💬 **Tone:** ${updatedDraft.tone}\n🔄 **Follow-ups:** ${followUps} touchpoints\n\nShall I **build and launch** this campaign now?`,
        ['Yes — build it now', 'Let me adjust something', 'Start over'],
        1000
      );
      return;
    }

    if (stage === 'confirm') {
      if (lower.includes('yes') || lower.includes('build') || lower.includes('launch') || lower.includes('go')) {
        await executeCampaign(conv.draft);
      } else if (lower.includes('start over') || lower.includes('restart')) {
        dispatch({ type: 'RESET' });
        setMessages([]);
        setCreatedCampaign(null);
      } else {
        await assistantSay(
          `No problem. What would you like to change?\n\nYou can say things like "Change the channel to Email" or "Target 500 prospects instead".`,
          ['Change the channel', 'Change the location', 'Change the tone', 'Start over']
        );
      }
      return;
    }

    if (stage === 'done') {
      if (lower.includes('view campaign') || lower.includes('campaigns')) {
        navigate('/campaigns');
      } else if (lower.includes('another') || lower.includes('new')) {
        dispatch({ type: 'RESET' });
        setMessages([]);
        setCreatedCampaign(null);
      } else if (lower.includes('dashboard')) {
        navigate('/dashboard');
      } else {
        await assistantSay(
          `Your campaign "${conv.draft.name}" is live in Wagora. Would you like to view it or start building another one?`,
          ['View campaign', 'Build another campaign', 'Go to Dashboard']
        );
      }
    }
  }, [isThinking, isExecuting, isDone, conv, assistantSay, executeCampaign, navigate]);

  /* ── starter prompt handler ── */
  const handleStarter = useCallback(async (text: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages([userMsg]);
    dispatch({ type: 'ADVANCE', stage: 'goal' });

    // Parse what we can from the starter
    const platform = extractPlatform(text);
    const size = extractNumber(text);
    const patch: Partial<CampaignDraft> = {
      outreachGoal: text,
      ...(platform ? { platform } : {}),
      ...(size ? { targetAudienceSize: size } : {}),
    };
    dispatch({ type: 'ADVANCE', stage: 'platform', draftPatch: patch });

    await assistantSay(agentScript.platform.message, agentScript.platform.quickReplies, 900);
  }, [assistantSay]);

  /* ── voice ── */
  const handleVoiceToggle = useCallback(() => {
    if (isRecording) {
      setIsRecording(false);
      if (recordTimerRef.current) clearTimeout(recordTimerRef.current);
      // Simulate transcription
      const samples = [
        'I want to reach out to real estate agents in Lagos',
        'Cold email 100 fintech founders about our SaaS product',
        'Follow up with 50 warm leads from last quarter',
        'Book discovery calls with e-commerce brand owners',
      ];
      setInput(samples[Math.floor(Math.random() * samples.length)]);
    } else {
      setIsRecording(true);
      // Auto-stop after 8 seconds
      recordTimerRef.current = setTimeout(() => {
        setIsRecording(false);
        setInput('I want to reach out to real estate agents in Lagos');
      }, 8000);
    }
  }, [isRecording]);

  /* ── file upload ── */
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    const parsed: UploadedFile[] = Array.from(files).map(f => ({
      name: f.name,
      type: f.type || 'Unknown',
      size: `${(f.size / 1024).toFixed(1)} KB`,
    }));
    setUploadedFiles(prev => [...prev, ...parsed]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input, uploadedFiles);
    }
  };

  const handleReset = () => {
    dispatch({ type: 'RESET' });
    setMessages([]);
    setCreatedCampaign(null);
    setInput('');
    setUploadedFiles([]);
    inputRef.current?.focus();
  };

  /* ── progress bar ── */
  const stageOrder: Stage[] = ['idle', 'goal', 'platform', 'industry', 'location', 'audience', 'tone', 'message_template', 'followup', 'confirm', 'executing', 'done'];
  const progress = Math.round((stageOrder.indexOf(conv.stage) / (stageOrder.length - 1)) * 100);

  const hasActions = conv.actions.length > 0;

  return (
    <div
      className="flex h-[calc(100vh-64px)] bg-[var(--background-primary)] overflow-hidden"
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* ── Drag overlay ── */}
      {dragOver && (
        <div className="absolute inset-0 z-50 bg-[var(--accent-primary)]/10 border-2 border-dashed border-[var(--accent-primary)] flex items-center justify-center rounded-xl m-4 pointer-events-none">
          <div className="text-center">
            <Upload size={40} className="text-[var(--accent-primary)] mx-auto mb-2" />
            <p className="text-[var(--accent-primary)] font-bold font-clash">Drop files here</p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          LEFT: CHAT PANEL
      ══════════════════════════════════════════════ */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Header */}
        <div className="shrink-0 border-b border-[var(--border-default)] px-5 py-3.5 bg-[var(--background-primary)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AgentAvatar />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-clash font-bold text-[var(--text-primary)] text-[15px] leading-none">Wagora Agent</h1>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white bg-[var(--accent-primary)] rounded px-1.5 py-0.5">AI</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  {isDone ? '✅ Campaign created' : isExecuting ? '⚡ Building your campaign...' : isIdle ? 'Tell me your goal' : 'Gathering campaign details...'}
                </p>
              </div>
            </div>
            {!isIdle && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-all border border-[var(--border-subtle)]"
              >
                <RotateCcw size={13} />
                <span className="hidden sm:inline">New session</span>
              </button>
            )}
          </div>

          {/* Progress bar */}
          {!isIdle && (
            <div className="flex items-center gap-3 mt-3">
              <div className="flex-1 h-1 bg-[var(--surface-elevated)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-emerald-400 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[11px] text-[var(--text-muted)] font-mono shrink-0 w-9 text-right">{progress}%</span>
            </div>
          )}
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

            {/* ── IDLE: Welcome screen ── */}
            {isIdle && (
              <div className="flex flex-col items-center justify-center min-h-[55vh] text-center animate-fade-in">
                <div className="relative mb-7">
                  <div className="absolute inset-0 rounded-full bg-[var(--accent-primary)] blur-3xl opacity-15 scale-[2]" />
                  <div className="relative w-18 h-18 w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-emerald-600 flex items-center justify-center shadow-lg">
                    <Sparkles size={32} className="text-white" />
                  </div>
                </div>

                <h2 className="font-clash font-bold text-[26px] text-[var(--text-primary)] leading-tight mb-3">
                  Your AI Campaign Agent
                </h2>
                <p className="text-[var(--text-secondary)] text-[14px] max-w-sm leading-relaxed mb-2">
                  Tell me your goal. I'll ask the right questions — and then build the entire campaign inside Wagora for you.
                </p>
                <p className="text-[var(--text-muted)] text-[12px] mb-8">
                  Text · Voice · Documents — whatever works for you
                </p>

                {/* Input modes */}
                <div className="flex items-center gap-4 mb-8">
                  {[
                    { icon: MessageSquare, label: 'Type it' },
                    { icon: Mic, label: 'Voice note' },
                    { icon: FileText, label: 'Upload doc' },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex flex-col items-center gap-1.5 text-[var(--text-muted)]">
                      <div className="w-10 h-10 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center">
                        <Icon size={16} />
                      </div>
                      <span className="text-[11px]">{label}</span>
                    </div>
                  ))}
                </div>

                {/* Starter cards */}
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-xl">
                  {STARTERS.map(({ icon: Icon, label, gradient }) => (
                    <button
                      key={label}
                      onClick={() => handleStarter(label)}
                      className="group flex items-center gap-3 p-3.5 text-left bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl hover:border-[var(--accent-primary)] hover:shadow-md transition-all duration-200"
                    >
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
                        <Icon size={15} className="text-white" />
                      </div>
                      <span className="text-[12.5px] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors font-medium leading-snug flex-1">{label}</span>
                      <ChevronRight size={14} className="shrink-0 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Messages ── */}
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex items-end gap-2.5 animate-slide-in-up ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {msg.role === 'assistant' && <AgentAvatar small />}

                <div className={`flex flex-col gap-1.5 max-w-[82%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-4 py-3 rounded-2xl text-[13.5px] leading-relaxed whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'bg-[var(--accent-primary)] text-white rounded-br-sm'
                      : 'bg-[var(--surface-card)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-bl-sm shadow-sm'
                  }`}>
                    {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}

                    {/* Attachments */}
                    {msg.attachments?.map(f => (
                      <div key={f.name} className="mt-2 flex items-center gap-2 bg-white/10 rounded-lg p-2">
                        <FileText size={13} />
                        <span className="text-[12px] truncate">{f.name}</span>
                        <span className="text-[11px] opacity-60">{f.size}</span>
                      </div>
                    ))}
                  </div>

                  {/* Quick replies — only on last AI message */}
                  {msg.role === 'assistant' && msg === messages[messages.length - 1] && !isThinking && !isExecuting && msg.quickReplies && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {msg.quickReplies.map(reply => (
                        <button
                          key={reply}
                          onClick={() => {
                            if (reply === 'View campaign') navigate('/campaigns');
                            else if (reply === 'Go to Dashboard') navigate('/dashboard');
                            else if (reply === 'Build another campaign') { dispatch({ type: 'RESET' }); setMessages([]); setCreatedCampaign(null); }
                            else handleSend(reply);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[var(--surface-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/5 transition-all"
                        >
                          {reply === 'View campaign' && <ExternalLink size={11} />}
                          {reply === 'Yes — build it now' && <PlayCircle size={11} />}
                          {reply}
                        </button>
                      ))}
                    </div>
                  )}

                  <span className="text-[11px] text-[var(--text-muted)] px-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isThinking && (
              <div className="flex items-end gap-2.5 animate-slide-in-up">
                <AgentAvatar small />
                <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <TypingDots />
                </div>
              </div>
            )}

            {/* Campaign created success */}
            {isDone && createdCampaign && (
              <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 rounded-2xl p-5 animate-scale-in">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  <span className="font-clash font-bold text-[var(--text-primary)] text-[15px]">Campaign live in Wagora</span>
                </div>
                <p className="text-[13px] text-[var(--text-secondary)] mb-4">"{createdCampaign.name}" is ready. Wagora is prospecting now.</p>
                <button
                  onClick={() => navigate('/campaigns')}
                  className="w-full flex items-center justify-center gap-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white py-2.5 rounded-xl text-[13px] font-bold transition-colors"
                >
                  <ExternalLink size={14} />
                  Open in Campaigns
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ── Input bar ── */}
        <div className="shrink-0 border-t border-[var(--border-default)] bg-[var(--background-primary)] px-4 py-4">
          {/* Uploaded file chips */}
          {uploadedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {uploadedFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-[12px] text-[var(--text-secondary)]">
                  <FileText size={12} />
                  <span className="max-w-[120px] truncate">{f.name}</span>
                  <button onClick={() => setUploadedFiles(prev => prev.filter((_, j) => j !== i))} className="text-[var(--text-muted)] hover:text-[var(--destructive)] transition-colors">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Recording indicator */}
          {isRecording && (
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[12px] text-red-500 font-medium">Recording... tap mic to stop</span>
            </div>
          )}

          <div className="flex items-end gap-2.5 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl px-4 py-3 shadow-sm focus-within:border-[var(--accent-primary)] transition-all">
            <textarea
              ref={inputRef}
              id="agent-input"
              rows={1}
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                isDone ? 'Ask a follow-up or start a new campaign...' :
                isExecuting ? 'Building your campaign...' :
                isIdle ? 'Describe your campaign goal...' :
                'Type your answer or pick a suggestion above...'
              }
              disabled={isThinking || isExecuting}
              className="flex-1 bg-transparent text-[14px] text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none outline-none border-none leading-relaxed min-h-[24px] max-h-[120px] disabled:opacity-40"
              style={{ boxShadow: 'none' }}
            />

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Attach */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] transition-all"
                title="Attach document"
              >
                <Paperclip size={16} />
              </button>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => handleFileSelect(e.target.files)} />

              {/* Voice */}
              <button
                onClick={handleVoiceToggle}
                className={`p-2 rounded-lg transition-all ${
                  isRecording
                    ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]'
                }`}
                title={isRecording ? 'Stop recording' : 'Voice input'}
              >
                {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              {/* Send */}
              <button
                onClick={() => handleSend(input, uploadedFiles)}
                disabled={(!input.trim() && uploadedFiles.length === 0) || isThinking || isExecuting}
                className="w-9 h-9 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-sm"
              >
                {isThinking || isExecuting
                  ? <Loader2 size={16} className="text-white animate-spin" />
                  : <Send size={16} className="text-white" />
                }
              </button>
            </div>
          </div>

          <p className="text-center text-[11px] text-[var(--text-muted)] mt-2">
            <kbd className="font-mono px-1 py-0.5 bg-[var(--surface-elevated)] rounded text-[10px]">Enter</kbd> send ·{' '}
            <kbd className="font-mono px-1 py-0.5 bg-[var(--surface-elevated)] rounded text-[10px]">Shift+Enter</kbd> new line · Voice & file upload supported
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          RIGHT: AGENT ACTIVITY + CAMPAIGN PREVIEW
          Only shows once the conversation starts
      ══════════════════════════════════════════════ */}
      {!isIdle && (
        <aside className="hidden lg:flex w-[300px] shrink-0 flex-col border-l border-[var(--border-default)] bg-[var(--background-secondary)] overflow-y-auto">
          <div className="p-5 space-y-5">

            {/* Campaign preview */}
            <div>
              <p className="text-[11px] uppercase tracking-widest text-[var(--text-muted)] font-bold mb-3 font-clash">Campaign Preview</p>
              <CampaignPreviewCard draft={conv.draft} isComplete={isDone} />
            </div>

            {/* Agent activity log */}
            {hasActions && (
              <div>
                <p className="text-[11px] uppercase tracking-widest text-[var(--text-muted)] font-bold mb-2 font-clash">Agent Activity</p>
                <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl px-4 py-3 divide-y divide-[var(--border-subtle)]">
                  {conv.actions.map(a => <ActionItem key={a.id} action={a} />)}
                </div>
              </div>
            )}

            {/* What I can do */}
            {!hasActions && (
              <div>
                <p className="text-[11px] uppercase tracking-widest text-[var(--text-muted)] font-bold mb-3 font-clash">What I'll Build</p>
                <div className="space-y-2">
                  {[
                    { icon: Target, text: 'Campaign name & description' },
                    { icon: Users, text: 'Prospect filters & targeting' },
                    { icon: MessageSquare, text: 'Outreach message templates' },
                    { icon: Zap, text: 'Follow-up sequences' },
                    { icon: Megaphone, text: 'Live campaign in Wagora' },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-2.5 text-[12px] text-[var(--text-secondary)]">
                      <div className="w-6 h-6 rounded-md bg-[var(--surface-elevated)] flex items-center justify-center shrink-0">
                        <Icon size={12} className="text-[var(--accent-primary)]" />
                      </div>
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Input modes */}
            {!hasActions && (
              <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-4">
                <p className="text-[11px] uppercase tracking-widest text-[var(--text-muted)] font-bold mb-3 font-clash">Input Methods</p>
                <div className="space-y-2.5 text-[12px] text-[var(--text-secondary)]">
                  <div className="flex items-center gap-2"><MessageSquare size={13} className="text-[var(--accent-primary)]" /> Type your responses</div>
                  <div className="flex items-center gap-2"><Mic size={13} className="text-[var(--accent-primary)]" /> Record a voice note</div>
                  <div className="flex items-center gap-2"><FileText size={13} className="text-[var(--accent-primary)]" /> Upload brand documents</div>
                  <div className="flex items-center gap-2"><Paperclip size={13} className="text-[var(--accent-primary)]" /> Attach any files</div>
                </div>
              </div>
            )}

            {/* Done: view button */}
            {isDone && createdCampaign && (
              <button
                onClick={() => navigate('/campaigns')}
                className="w-full flex items-center justify-center gap-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white py-2.5 rounded-xl text-[13px] font-bold transition-colors"
              >
                <ExternalLink size={14} />
                Open in Campaigns
              </button>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
