import { useState } from 'react';
import { Settings as SettingsIcon, FileText, Wifi, CreditCard, Gauge, Bell, Users, Shield, User } from 'lucide-react';
import WorkspaceSettings from './WorkspaceSettings';
import BrandDocuments from './BrandDocuments';
import PlatformSettings from './PlatformSettings';
import BillingSettings from './BillingSettings';
import OutreachSettings from './OutreachSettings';
import NotificationSettings from './NotificationSettings';
import TeamSettings from './TeamSettings';
import SecuritySettings from './SecuritySettings';
import SalesAgent from './SalesAgent';

const tabs = [
  { id: 'workspace', label: 'Workspace', icon: SettingsIcon },
  { id: 'agent', label: 'Sales agent', icon: User },
  { id: 'documents', label: 'Brand documents', icon: FileText },
  { id: 'platforms', label: 'Platforms', icon: Wifi },
  { id: 'outreach', label: 'Outreach limits', icon: Gauge },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'security', label: 'Security', icon: Shield },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('workspace');

  const renderContent = () => {
    switch (activeTab) {
      case 'workspace': return <WorkspaceSettings />;
      case 'agent': return <SalesAgent />;
      case 'documents': return <BrandDocuments />;
      case 'platforms': return <PlatformSettings />;
      case 'outreach': return <OutreachSettings />;
      case 'notifications': return <NotificationSettings />;
      case 'team': return <TeamSettings />;
      case 'billing': return <BillingSettings />;
      case 'security': return <SecuritySettings />;
      default: return <WorkspaceSettings />;
    }
  };

  return (
    <div className="p-4 sm:p-8">
      <h1 className="font-clash text-2xl font-bold text-[var(--text-primary)] mb-6">Settings</h1>

      <div className="flex flex-col sm:flex-row gap-6">
        {/* Desktop Sidebar */}
        <nav className="hidden sm:block w-56 shrink-0 space-y-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium transition-colors ${
                activeTab === t.id
                  ? 'bg-[var(--surface-elevated)] text-[var(--text-primary)] border-l-2 border-[var(--accent-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]'
              }`}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </nav>

        {/* Mobile Tabs */}
        <div className="sm:hidden flex gap-1 overflow-x-auto pb-2 -mx-4 px-4">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-full whitespace-nowrap transition-colors ${
                activeTab === t.id
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
