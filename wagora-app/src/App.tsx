import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import AuthLayout from './layouts/AuthLayout';
import Dashboard from './pages/dashboard/Dashboard';
import SignIn from './pages/auth/SignIn';
import SignUp from './pages/auth/SignUp';
import ForgotPassword from './pages/auth/ForgotPassword';
import VerifyEmail from './pages/auth/VerifyEmail';
import AuthCallback from './pages/auth/AuthCallback';
import ResetPassword from './pages/auth/ResetPassword';
import Campaigns from './pages/campaigns/Campaigns';
import Prospects from './pages/prospects/Prospects';
import Conversations from './pages/conversations/Conversations';
import Deals from './pages/deals/Deals';
import Analytics from './pages/analytics/Analytics';
import Settings from './pages/settings/Settings';
import Notifications from './pages/notifications/Notifications';
import Onboarding from './pages/onboarding/Onboarding';
import Invoices from './pages/invoices/Invoices';
import CallsManager from './pages/calls/CallsManager';
import NotFound from './pages/errors/NotFound';
import ServerError from './pages/errors/ServerError';
import AiSetup from './pages/ai-setup/AiSetup';

import { ToastProvider } from './components/ui/Toast';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute, PublicRoute } from './components/auth/AuthGuards';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Auth (Public Routes) */}
            {/* Auth Callback — handles PKCE code exchange for OAuth + email verify */}
            {/* Must be OUTSIDE PublicRoute so logged-in users can reach it */}
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />

            <Route path="/auth" element={<PublicRoute><AuthLayout /></PublicRoute>}>
              <Route path="signin" element={<SignIn />} />
              <Route path="signup" element={<SignUp />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route path="verify-email" element={<VerifyEmail />} />
              <Route index element={<Navigate to="/auth/signin" replace />} />
            </Route>

            {/* Onboarding (Protected, handles internal redirection) */}
            <Route 
              path="/onboarding" 
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              } 
            />

            {/* Error pages */}
            <Route path="/error" element={<ServerError />} />

            {/* Main App (Protected) */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="campaigns" element={<Campaigns />} />
              <Route path="prospects" element={<Prospects />} />
              <Route path="conversations" element={<Conversations />} />
              <Route path="deals" element={<Deals />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<Settings />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="calls" element={<CallsManager />} />
              <Route path="ai-setup" element={<AiSetup />} />
            </Route>

            {/* 404 catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
