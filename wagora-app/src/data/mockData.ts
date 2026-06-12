// ==========================================================================
// WAGORA MOCK DATA — Single source of truth for prototype data
// ==========================================================================

export interface Campaign {
  id: string;
  name: string;
  platform: 'Email' | 'LinkedIn' | 'Instagram';
  prospects: number;
  replies: number;
  closed: number;
  status: 'Live' | 'Paused' | 'Draft' | 'Complete' | 'Needs attention';
  lastActive: string;
  created: string;
  description?: string;
}

export interface Prospect {
  id: string;
  name: string;
  company: string;
  role: string;
  score: number;
  platform: 'Email' | 'LinkedIn' | 'Instagram';
  status: 'New' | 'Outreach sent' | 'Replied' | 'In closing sequence' | 'Call booked' | 'Closed' | 'Not a fit';
  lastContact: string;
  email?: string;
  avatar?: string;
}

export interface Message {
  id: string;
  sender: 'wagora' | 'prospect' | 'user';
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  prospectName: string;
  prospectCompany: string;
  prospectAvatar?: string;
  platform: 'Email' | 'LinkedIn' | 'Instagram';
  status: 'Wagora responding' | 'Awaiting reply' | 'In closing sequence' | 'Call booked' | 'Closed' | 'Flagged — input needed';
  lastMessage: string;
  lastMessageTime: string;
  unread: boolean;
  messages: Message[];
  campaignName: string;
}

export interface Deal {
  id: string;
  client: string;
  company: string;
  service: string;
  value: number;
  closedDate: string;
  campaign: string;
  status: 'Payment confirmed' | 'Awaiting payment' | 'In delivery' | 'Complete';
  closedVia: 'Chat' | 'Call';
  conversationSummary: string;
  commitments: string[];
  suggestedNextStep: string;
}

export interface Activity {
  id: string;
  type: 'prospect_found' | 'reply_received' | 'deal_closed' | 'campaign_status' | 'outreach_sent' | 'call_booked' | 'flagged';
  message: string;
  timestamp: string;
  meta?: string;
}

export interface Notification {
  id: string;
  type: 'deal_closed' | 'call_booked' | 'new_reply' | 'input_needed' | 'campaign_complete' | 'limit_reached' | 'platform_disconnected' | 'payment_confirmed';
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

export interface BrandDocument {
  id: string;
  name: string;
  type: string;
  size: string;
  status: 'Processing' | 'Active' | 'Error — reupload';
  uploadedAt: string;
}

// --- CAMPAIGNS ---
export const campaigns: Campaign[] = [
  {
    id: 'camp-1',
    name: 'Lagos E-commerce Founders',
    platform: 'LinkedIn',
    prospects: 142,
    replies: 38,
    closed: 6,
    status: 'Live',
    lastActive: '2 min ago',
    created: '2025-04-12',
    description: 'Targeting e-commerce founders in Lagos for brand identity packages.',
  },
  {
    id: 'camp-2',
    name: 'SaaS CTOs — Series A',
    platform: 'Email',
    prospects: 89,
    replies: 22,
    closed: 3,
    status: 'Live',
    lastActive: '14 min ago',
    created: '2025-04-18',
    description: 'B2B outreach to Series A SaaS companies for dev tooling.',
  },
  {
    id: 'camp-3',
    name: 'Creative Agency Owners',
    platform: 'Instagram',
    prospects: 67,
    replies: 12,
    closed: 1,
    status: 'Paused',
    lastActive: '3 days ago',
    created: '2025-03-28',
    description: 'Instagram outreach to creative agency owners for collaboration.',
  },
  {
    id: 'camp-4',
    name: 'Fintech Product Leads',
    platform: 'Email',
    prospects: 204,
    replies: 51,
    closed: 8,
    status: 'Complete',
    lastActive: '1 week ago',
    created: '2025-02-15',
    description: 'Email campaign targeting fintech product managers.',
  },
  {
    id: 'camp-5',
    name: 'Healthcare Consultants',
    platform: 'LinkedIn',
    prospects: 0,
    replies: 0,
    closed: 0,
    status: 'Draft',
    lastActive: 'Never',
    created: '2025-05-01',
    description: 'Draft campaign for healthcare consulting firms.',
  },
  {
    id: 'camp-6',
    name: 'D2C Brand Managers',
    platform: 'Email',
    prospects: 56,
    replies: 8,
    closed: 0,
    status: 'Needs attention',
    lastActive: '1 hour ago',
    created: '2025-04-25',
    description: 'Email deliverability issue flagged. Review required.',
  },
];

// --- PROSPECTS ---
export const prospects: Prospect[] = [
  { id: 'p-1', name: 'Adaeze Okonkwo', company: 'Shoprite Digital', role: 'CEO', score: 9, platform: 'LinkedIn', status: 'In closing sequence', lastContact: '1 hour ago' },
  { id: 'p-2', name: 'Marcus Chen', company: 'TechVault', role: 'CTO', score: 8, platform: 'Email', status: 'Replied', lastContact: '3 hours ago' },
  { id: 'p-3', name: 'Sofia Ramirez', company: 'Creativa Studio', role: 'Founder', score: 7, platform: 'Instagram', status: 'Outreach sent', lastContact: '1 day ago' },
  { id: 'p-4', name: 'James Okafor', company: 'PayStack Ventures', role: 'Product Lead', score: 9, platform: 'Email', status: 'Call booked', lastContact: '2 hours ago' },
  { id: 'p-5', name: 'Lina Petrov', company: 'HealthBridge', role: 'COO', score: 6, platform: 'LinkedIn', status: 'New', lastContact: 'Not contacted' },
  { id: 'p-6', name: 'David Mensah', company: 'Accra Logistics', role: 'Managing Director', score: 8, platform: 'Email', status: 'Closed', lastContact: '2 days ago' },
  { id: 'p-7', name: 'Priya Sharma', company: 'NovaTech AI', role: 'VP Engineering', score: 7, platform: 'LinkedIn', status: 'Replied', lastContact: '5 hours ago' },
  { id: 'p-8', name: 'Emeka Nwosu', company: 'FarmConnect', role: 'CEO', score: 5, platform: 'Email', status: 'Not a fit', lastContact: '4 days ago' },
  { id: 'p-9', name: 'Rachel Kim', company: 'StyleHub', role: 'Creative Director', score: 8, platform: 'Instagram', status: 'In closing sequence', lastContact: '30 min ago' },
  { id: 'p-10', name: 'Omar Hassan', company: 'FinEdge', role: 'Head of Growth', score: 9, platform: 'Email', status: 'Replied', lastContact: '1 hour ago' },
  { id: 'p-11', name: 'Chioma Eze', company: 'BrandForge', role: 'Founder', score: 7, platform: 'LinkedIn', status: 'Outreach sent', lastContact: '2 days ago' },
  { id: 'p-12', name: 'Alex Turner', company: 'CloudScale', role: 'CTO', score: 8, platform: 'Email', status: 'Call booked', lastContact: '4 hours ago' },
  { id: 'p-13', name: 'Fatima Al-Rashid', company: 'Medina Consulting', role: 'Partner', score: 6, platform: 'LinkedIn', status: 'New', lastContact: 'Not contacted' },
  { id: 'p-14', name: 'Ben Adeyemi', company: 'QuickServe', role: 'CEO', score: 9, platform: 'Email', status: 'Closed', lastContact: '1 week ago' },
  { id: 'p-15', name: 'Nina Voronova', company: 'DesignPulse', role: 'Art Director', score: 7, platform: 'Instagram', status: 'Replied', lastContact: '6 hours ago' },
  { id: 'p-16', name: 'Kwame Asante', company: 'GreenTech GH', role: 'Founder', score: 8, platform: 'LinkedIn', status: 'Outreach sent', lastContact: '1 day ago' },
];

// --- CONVERSATIONS ---
export const conversations: Conversation[] = [
  {
    id: 'conv-1',
    prospectName: 'Adaeze Okonkwo',
    prospectCompany: 'Shoprite Digital',
    platform: 'LinkedIn',
    status: 'In closing sequence',
    lastMessage: 'That pricing works for us. Can we finalize this week?',
    lastMessageTime: '1 hour ago',
    unread: true,
    campaignName: 'Lagos E-commerce Founders',
    messages: [
      { id: 'm1', sender: 'wagora', content: 'Hi Adaeze — Wagora identified your profile as a strong match for brand identity services. Your expansion into 3 new markets signals a need for consistent brand positioning.', timestamp: '3 days ago' },
      { id: 'm2', sender: 'prospect', content: 'Interesting timing. We have been looking at rebranding for Q3. What does your process look like?', timestamp: '2 days ago' },
      { id: 'm3', sender: 'wagora', content: 'The process runs in 3 phases: brand audit (1 week), identity system design (2 weeks), and rollout documentation (1 week). Investment ranges $3,000–$5,000 depending on scope.', timestamp: '2 days ago' },
      { id: 'm4', sender: 'prospect', content: 'That pricing works for us. Can we finalize this week?', timestamp: '1 hour ago' },
    ],
  },
  {
    id: 'conv-2',
    prospectName: 'Marcus Chen',
    prospectCompany: 'TechVault',
    platform: 'Email',
    status: 'Wagora responding',
    lastMessage: 'Marcus asked about integration timelines.',
    lastMessageTime: '3 hours ago',
    unread: false,
    campaignName: 'SaaS CTOs — Series A',
    messages: [
      { id: 'm5', sender: 'wagora', content: 'Marcus — TechVault\'s developer tooling caught our attention. We help SaaS companies like yours reduce onboarding friction by 40%.', timestamp: '5 days ago' },
      { id: 'm6', sender: 'prospect', content: 'We are evaluating solutions. What is your integration timeline?', timestamp: '3 hours ago' },
    ],
  },
  {
    id: 'conv-3',
    prospectName: 'James Okafor',
    prospectCompany: 'PayStack Ventures',
    platform: 'Email',
    status: 'Call booked',
    lastMessage: 'Call confirmed for Thursday at 2:00 PM WAT.',
    lastMessageTime: '2 hours ago',
    unread: true,
    campaignName: 'Fintech Product Leads',
    messages: [
      { id: 'm7', sender: 'wagora', content: 'James — PayStack Ventures\' growth trajectory matches the profile of companies we have helped scale product operations. Worth a 15-minute call?', timestamp: '4 days ago' },
      { id: 'm8', sender: 'prospect', content: 'Sure. Thursday works. 2 PM WAT.', timestamp: '1 day ago' },
      { id: 'm9', sender: 'wagora', content: 'Call confirmed for Thursday at 2:00 PM WAT.', timestamp: '2 hours ago' },
    ],
  },
  {
    id: 'conv-4',
    prospectName: 'Rachel Kim',
    prospectCompany: 'StyleHub',
    platform: 'Instagram',
    status: 'In closing sequence',
    lastMessage: 'Send over the proposal. We want to move fast on this.',
    lastMessageTime: '30 min ago',
    unread: true,
    campaignName: 'Creative Agency Owners',
    messages: [
      { id: 'm10', sender: 'wagora', content: 'Rachel — StyleHub\'s visual identity is strong. We specialize in scaling that consistency across channels. Interested in a quick audit?', timestamp: '1 week ago' },
      { id: 'm11', sender: 'prospect', content: 'We have been struggling with brand consistency across our 4 channels. What would an audit cost?', timestamp: '3 days ago' },
      { id: 'm12', sender: 'wagora', content: 'The audit is complimentary. If you want to proceed with a full brand alignment package, investment starts at $2,500.', timestamp: '2 days ago' },
      { id: 'm13', sender: 'prospect', content: 'Send over the proposal. We want to move fast on this.', timestamp: '30 min ago' },
    ],
  },
  {
    id: 'conv-5',
    prospectName: 'Omar Hassan',
    prospectCompany: 'FinEdge',
    platform: 'Email',
    status: 'Awaiting reply',
    lastMessage: 'Wagora sent a follow-up on day 3.',
    lastMessageTime: '1 hour ago',
    unread: false,
    campaignName: 'Fintech Product Leads',
    messages: [
      { id: 'm14', sender: 'wagora', content: 'Omar — FinEdge\'s growth in embedded finance is impressive. We help fintech companies streamline their GTM. Worth exploring?', timestamp: '4 days ago' },
      { id: 'm15', sender: 'prospect', content: 'Possibly. What kind of results have you seen?', timestamp: '1 day ago' },
      { id: 'm16', sender: 'wagora', content: 'Our last 3 fintech clients saw 2.4x pipeline growth within 60 days. Happy to share case studies. Want me to send them over?', timestamp: '1 hour ago' },
    ],
  },
  {
    id: 'conv-6',
    prospectName: 'Priya Sharma',
    prospectCompany: 'NovaTech AI',
    platform: 'LinkedIn',
    status: 'Flagged — input needed',
    lastMessage: 'Prospect asked about enterprise pricing — outside configured parameters.',
    lastMessageTime: '5 hours ago',
    unread: true,
    campaignName: 'SaaS CTOs — Series A',
    messages: [
      { id: 'm17', sender: 'wagora', content: 'Priya — NovaTech AI\'s approach to ML ops aligns with what our clients build. We help engineering teams reduce deployment cycles by 50%.', timestamp: '1 week ago' },
      { id: 'm18', sender: 'prospect', content: 'This is relevant. We are a 200-person team though. Do you have enterprise pricing?', timestamp: '5 hours ago' },
    ],
  },
  {
    id: 'conv-7',
    prospectName: 'David Mensah',
    prospectCompany: 'Accra Logistics',
    platform: 'Email',
    status: 'Closed',
    lastMessage: 'Deal closed. Payment confirmed.',
    lastMessageTime: '2 days ago',
    unread: false,
    campaignName: 'Lagos E-commerce Founders',
    messages: [
      { id: 'm19', sender: 'wagora', content: 'David — Accra Logistics\' expansion into last-mile delivery needs consistent brand positioning. We can help.', timestamp: '2 weeks ago' },
      { id: 'm20', sender: 'prospect', content: 'Send a proposal.', timestamp: '1 week ago' },
      { id: 'm21', sender: 'wagora', content: 'Proposal sent. Brand identity package: $4,200. Includes audit, design system, and rollout docs.', timestamp: '5 days ago' },
      { id: 'm22', sender: 'prospect', content: 'Approved. Send the invoice.', timestamp: '3 days ago' },
      { id: 'm23', sender: 'wagora', content: 'Deal closed. Payment confirmed.', timestamp: '2 days ago' },
    ],
  },
  {
    id: 'conv-8',
    prospectName: 'Nina Voronova',
    prospectCompany: 'DesignPulse',
    platform: 'Instagram',
    status: 'Awaiting reply',
    lastMessage: 'Wagora sent initial outreach.',
    lastMessageTime: '6 hours ago',
    unread: false,
    campaignName: 'Creative Agency Owners',
    messages: [
      { id: 'm24', sender: 'wagora', content: 'Nina — DesignPulse\'s portfolio is striking. We help creative studios scale their client acquisition without losing the personal touch.', timestamp: '6 hours ago' },
    ],
  },
];

// --- DEALS ---
export const deals: Deal[] = [
  {
    id: 'deal-1',
    client: 'David Mensah',
    company: 'Accra Logistics',
    service: 'Brand Identity Package',
    value: 4200,
    closedDate: '2025-05-10',
    campaign: 'Lagos E-commerce Founders',
    status: 'Payment confirmed',
    closedVia: 'Chat',
    conversationSummary: 'Prospect responded to initial outreach within 24 hours. Requested proposal after first exchange. Approved after reviewing scope document.',
    commitments: ['Brand audit delivered by May 20', 'Design system v1 by June 3', 'Full rollout docs by June 10'],
    suggestedNextStep: 'Schedule kickoff call and send brand audit questionnaire.',
  },
  {
    id: 'deal-2',
    client: 'Ben Adeyemi',
    company: 'QuickServe',
    service: 'GTM Strategy Sprint',
    value: 6500,
    closedDate: '2025-05-05',
    campaign: 'Fintech Product Leads',
    status: 'In delivery',
    closedVia: 'Call',
    conversationSummary: 'Prospect booked a call after second follow-up. Call lasted 22 minutes. Agreed to GTM sprint during the call.',
    commitments: ['Market analysis by May 15', 'Channel strategy by May 22', 'Launch playbook by May 30'],
    suggestedNextStep: 'Deliver market analysis and schedule review session.',
  },
  {
    id: 'deal-3',
    client: 'James Okafor',
    company: 'PayStack Ventures',
    service: 'Product Operations Audit',
    value: 3800,
    closedDate: '2025-04-28',
    campaign: 'Fintech Product Leads',
    status: 'Complete',
    closedVia: 'Call',
    conversationSummary: 'Multiple touchpoints over 2 weeks. Prospect was evaluating 3 vendors. Won on speed of delivery and fintech expertise.',
    commitments: ['Audit report delivered', 'Implementation roadmap delivered', '30-day check-in completed'],
    suggestedNextStep: 'Propose Phase 2 engagement for implementation support.',
  },
  {
    id: 'deal-4',
    client: 'Marcus Chen',
    company: 'TechVault',
    service: 'Developer Onboarding Optimization',
    value: 5200,
    closedDate: '2025-05-12',
    campaign: 'SaaS CTOs — Series A',
    status: 'Awaiting payment',
    closedVia: 'Chat',
    conversationSummary: 'Prospect engaged after detailed case study share. Moved quickly through closing sequence after seeing 40% onboarding improvement data.',
    commitments: ['Onboarding audit by May 25', 'UX recommendations by June 1', 'Implementation support through June'],
    suggestedNextStep: 'Follow up on invoice sent May 13.',
  },
  {
    id: 'deal-5',
    client: 'Adaeze Okonkwo',
    company: 'Shoprite Digital',
    service: 'Brand Positioning Package',
    value: 4800,
    closedDate: '2025-05-14',
    campaign: 'Lagos E-commerce Founders',
    status: 'Awaiting payment',
    closedVia: 'Chat',
    conversationSummary: 'Strong intent from first message. Prospect confirmed budget range matched. Closing took 3 days from first reply.',
    commitments: ['Brand audit by May 22', 'Positioning framework by May 30', 'Market rollout plan by June 5'],
    suggestedNextStep: 'Send invoice and schedule brand audit kickoff.',
  },
];

// --- ACTIVITIES ---
export const activities: Activity[] = [
  { id: 'act-1', type: 'deal_closed', message: 'Deal closed. Adaeze Okonkwo from Shoprite Digital confirmed.', timestamp: '1 hour ago', meta: '$4,800' },
  { id: 'act-2', type: 'reply_received', message: 'Rachel Kim replied. Wagora is handling it.', timestamp: '30 min ago' },
  { id: 'act-3', type: 'call_booked', message: 'Call booked with James Okafor — Thursday at 2:00 PM.', timestamp: '2 hours ago' },
  { id: 'act-4', type: 'prospect_found', message: '12 new prospects identified for Lagos E-commerce Founders.', timestamp: '3 hours ago' },
  { id: 'act-5', type: 'outreach_sent', message: '34 outreach messages sent across 2 campaigns.', timestamp: '4 hours ago' },
  { id: 'act-6', type: 'flagged', message: 'Wagora flagged a conversation with Priya Sharma. Input needed.', timestamp: '5 hours ago' },
  { id: 'act-7', type: 'reply_received', message: 'Omar Hassan replied. Wagora is handling it.', timestamp: '6 hours ago' },
  { id: 'act-8', type: 'campaign_status', message: 'D2C Brand Managers campaign needs attention. Deliverability issue detected.', timestamp: '8 hours ago' },
  { id: 'act-9', type: 'prospect_found', message: '8 new prospects qualified for SaaS CTOs — Series A.', timestamp: '10 hours ago' },
  { id: 'act-10', type: 'outreach_sent', message: '18 follow-ups sent. Day 3 sequence.', timestamp: '12 hours ago' },
  { id: 'act-11', type: 'deal_closed', message: 'Deal closed. Marcus Chen from TechVault confirmed.', timestamp: '1 day ago', meta: '$5,200' },
  { id: 'act-12', type: 'reply_received', message: 'Nina Voronova replied on Instagram.', timestamp: '1 day ago' },
];

// --- NOTIFICATIONS ---
export const notifications: Notification[] = [
  { id: 'n-1', type: 'deal_closed', message: 'Deal closed. Adaeze Okonkwo from Shoprite Digital confirmed. View summary →', timestamp: '1 hour ago', read: false, link: '/deals' },
  { id: 'n-2', type: 'call_booked', message: 'Call booked with James Okafor — Thursday at 2:00 PM.', timestamp: '2 hours ago', read: false },
  { id: 'n-3', type: 'new_reply', message: 'Rachel Kim replied. Wagora is handling it.', timestamp: '30 min ago', read: false, link: '/conversations' },
  { id: 'n-4', type: 'input_needed', message: 'Wagora flagged a conversation with Priya Sharma. Input needed.', timestamp: '5 hours ago', read: false, link: '/conversations' },
  { id: 'n-5', type: 'campaign_complete', message: 'Fintech Product Leads complete. 204 contacted. 51 replied. 8 closed.', timestamp: '1 day ago', read: true },
  { id: 'n-6', type: 'payment_confirmed', message: 'Payment confirmed. $4,200 received from David Mensah.', timestamp: '2 days ago', read: true },
  { id: 'n-7', type: 'new_reply', message: 'Omar Hassan replied. Wagora is handling it.', timestamp: '6 hours ago', read: true, link: '/conversations' },
  { id: 'n-8', type: 'deal_closed', message: 'Deal closed. Marcus Chen from TechVault confirmed. View summary →', timestamp: '1 day ago', read: true, link: '/deals' },
  { id: 'n-9', type: 'limit_reached', message: 'Monthly prospect limit reached. Upgrade to continue.', timestamp: '3 days ago', read: true, link: '/settings/billing' },
  { id: 'n-10', type: 'platform_disconnected', message: 'Instagram disconnected. Outreach on that channel paused.', timestamp: '3 days ago', read: true, link: '/settings/platforms' },
  { id: 'n-11', type: 'new_reply', message: 'Nina Voronova replied. Wagora is handling it.', timestamp: '1 day ago', read: true, link: '/conversations' },
  { id: 'n-12', type: 'payment_confirmed', message: 'Payment confirmed. $6,500 received from Ben Adeyemi.', timestamp: '5 days ago', read: true },
];

// --- BRAND DOCUMENTS ---
export const brandDocuments: BrandDocument[] = [
  { id: 'doc-1', name: 'Brand Voice Guide v2.pdf', type: 'PDF', size: '2.4 MB', status: 'Active', uploadedAt: '2025-04-10' },
  { id: 'doc-2', name: 'Pricing Deck Q2 2025.pdf', type: 'PDF', size: '5.1 MB', status: 'Active', uploadedAt: '2025-04-12' },
  { id: 'doc-3', name: 'Case Studies Collection.docx', type: 'DOCX', size: '3.8 MB', status: 'Active', uploadedAt: '2025-04-15' },
  { id: 'doc-4', name: 'Service Offering Summary.txt', type: 'TXT', size: '12 KB', status: 'Active', uploadedAt: '2025-04-18' },
  { id: 'doc-5', name: 'Updated Proposal Template.pdf', type: 'PDF', size: '1.7 MB', status: 'Processing', uploadedAt: '2025-05-14' },
];

// --- ANALYTICS DATA ---
export const analyticsData = {
  prospectsIdentified: 558,
  prospectsQualified: 412,
  outreachSent: 389,
  replyRate: 26.4,
  closingRate: 4.6,
  timeToClose: 8.2,
  revenueSecured: 24500,
  prospectsOverTime: [
    { label: 'Week 1', value: 42 },
    { label: 'Week 2', value: 68 },
    { label: 'Week 3', value: 95 },
    { label: 'Week 4', value: 124 },
    { label: 'Week 5', value: 108 },
    { label: 'Week 6', value: 72 },
    { label: 'Week 7', value: 49 },
  ],
  repliesByPlatform: [
    { platform: 'Email', count: 73, percentage: 56 },
    { platform: 'LinkedIn', count: 42, percentage: 32 },
    { platform: 'Instagram', count: 16, percentage: 12 },
  ],
  closingPaths: [
    { label: 'Fast close — chat', count: 9, percentage: 50 },
    { label: 'Call close', count: 5, percentage: 28 },
    { label: 'Nurtured close', count: 2, percentage: 11 },
    { label: 'No response', count: 1, percentage: 6 },
    { label: 'Rejected', count: 1, percentage: 5 },
  ],
  campaignPerformance: [
    { name: 'Lagos E-commerce', prospects: 142, replies: 38, closed: 6 },
    { name: 'SaaS CTOs', prospects: 89, replies: 22, closed: 3 },
    { name: 'Fintech Leads', prospects: 204, replies: 51, closed: 8 },
    { name: 'Creative Agencies', prospects: 67, replies: 12, closed: 1 },
  ],
};

// --- DASHBOARD METRICS ---
export const dashboardMetrics = [
  { label: 'Active campaigns', value: '3', trend: '+1' },
  { label: 'Prospects contacted', value: '389', trend: '+34' },
  { label: 'Replies received', value: '131', trend: '+12' },
  { label: 'In closing sequence', value: '4', trend: '+2' },
  { label: 'Deals closed', value: '18', trend: '+3' },
  { label: 'Calls booked', value: '7', trend: '+2' },
];
