import { Outlet } from 'react-router-dom';
import SideNav from '../components/shell/SideNav';
import TopBar from '../components/shell/TopBar';
import BottomNav from '../components/shell/BottomNav';
import VerificationBanner from '../components/auth/VerificationBanner';

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-[var(--background-primary)] text-[var(--text-primary)] font-body-md">
      {/* Side Navigation for Desktop and Tablet */}
      <SideNav />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen pb-16 sm:pb-0 sm:ml-20 lg:ml-64 transition-all duration-300">
        <TopBar />
        
        {/* Verification Banner (shown if email is unverified) */}
        <VerificationBanner />
        
        {/* Scrollable Content Canvas */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation for Mobile (< 560px) */}
      <BottomNav />
    </div>
  );
}
