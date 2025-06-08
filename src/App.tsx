import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/auth';

import { Navigation } from './components/Navigation';
import { Home } from './pages/Home';
import { TravelPlanPage } from './pages/TravelPlan';
import { PlanDetail } from './pages/plan-log/[id]';
import { SharePlan } from './pages/share/plan/[id]';
import { Packages } from './pages/Packages';
import { PackageDetail } from './pages/PackageDetail';
import { BookPackage } from './pages/BookPackage';
import { UserProfile } from './pages/UserProfile';
import { AgentApplication } from './pages/AgentApplication';
import Auth from './pages/Auth';
import { ForgotPassword } from './pages/ForgotPassword';
import { ChangePassword } from './pages/ChangePassword';
import { AuthCallback } from './pages/AuthCallback';
import { AdminLayout } from './components/admin/Layout';
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminMessages } from './pages/admin/Messages';
import { AdminUsers } from './pages/admin/Users';
import { UserDetail } from './pages/admin/UserDetail';
import { AdminApplications } from './pages/admin/Applications';
import { AdminSettings } from './pages/admin/Settings';
import { AdminPackages } from './pages/admin/Packages';
import { AdminOrders } from './pages/admin/Orders';
import { OrderDetail } from './pages/admin/OrderDetail';
import { MessageDetail } from './pages/admin/MessageDetail';
import { Messages } from './pages/Messages';
import { DashboardLayout } from './pages/dashboard/Layout';
import { PublishPackage } from './pages/dashboard/PublishPackage';
import { EditPackage } from './pages/dashboard/EditPackage';
import { MyPackages } from './pages/dashboard/MyPackages';
import { MyOrders } from './pages/dashboard/MyOrders';
import { AgentDetail } from './pages/admin/agents/[id]';
import { AdminAgents } from './pages/admin/agents';
import { AgentLayout } from './pages/agent/Layout';
import { AgentDashboard } from './pages/agent/Dashboard';
import { AgentOrders } from './pages/agent/Orders';
import { AgentConsole } from './pages/agent/Console';
import { AdminBanners } from './pages/admin/Banners';
import { AdminDestinations } from './pages/admin/Destinations';
import { ReviewerLayout } from './pages/reviewer/Layout';
import { ReviewerConsole } from './pages/reviewer/Console';
import { CreditManagement } from './pages/admin/CreditManagement';
import { EnterpriseCustom } from './pages/EnterpriseCustom';
import { EnterpriseOrders } from './pages/admin/EnterpriseOrders';
import { InfoFeeRecords } from './pages/admin/InfoFeeRecords';
import { EnterpriseOrders as AgentEnterpriseOrders } from './pages/agent/EnterpriseOrders';
import AlipayPaymentSimulator from './pages/alipay/pay';
import AlipayReturn from './pages/alipay/return';
import { MainLayout } from './pages/MainLayout';
import DebugTokenPage from './pages/dev/token';

function App() {
  const { setUser } = useAuthStore();

  useEffect(() => {
    async function loadUserSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email,
            phone: session.user.phone
          });
        }
      } catch (error) {
        console.error('Error loading user session:', error);
      }
    }
    
    loadUserSession();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email,
            phone: session.user.phone
          });
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );
    
    // Clean up subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [setUser]);

  return (
    <Router>
      <Routes>
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="messages" element={<AdminMessages />} />
          <Route path="messages/:id" element={<MessageDetail />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="users/:id" element={<UserDetail />} />
          <Route path="applications" element={<AdminApplications />} />
          <Route path="agents" element={<AdminAgents />} />
          <Route path="agents/:id" element={<AgentDetail />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="packages" element={<AdminPackages />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="banners" element={<AdminBanners />} />
          <Route path="destinations" element={<AdminDestinations />} />
          <Route path="credits" element={<CreditManagement />} />
          <Route path="enterprise-orders" element={<EnterpriseOrders />} />
          <Route path="info-fee-records" element={<InfoFeeRecords />} />
        </Route>

        {/* Agent Routes */}
        <Route path="/agent" element={<AgentLayout />}>
          <Route path="dashboard" element={<AgentDashboard />} />
          <Route path="orders" element={<AgentOrders />} />
          <Route path="enterprise-orders" element={<AgentEnterpriseOrders />} />
        </Route>
        <Route path="/agent/console" element={<AgentConsole />} />

        {/* Reviewer Routes */}
        <Route path="/reviewer" element={<ReviewerLayout />}>
          <Route path="dashboard" element={<AgentDashboard />} />
        </Route>
        <Route path="/reviewer/console" element={<ReviewerConsole />} />

        {/* Dashboard Routes */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route path="publish" element={<PublishPackage />} />
          <Route path="edit/:id" element={<EditPackage />} />
          <Route path="my-packages" element={<MyPackages />} />
          <Route path="my-orders" element={<MyOrders />} />
        </Route>

        {/* Auth Routes */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/change-password" element={<ChangePassword />} />

        {/* Alipay Routes */}
        <Route path="/alipay/pay" element={<AlipayPaymentSimulator />} />
        <Route path="/alipay/return" element={<AlipayReturn />} />

        {/* Debug Routes */}
        <Route path="/dev/token" element={<DebugTokenPage />} />

        {/* Public Routes */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="plan" element={<TravelPlanPage />} />
          <Route path="plan-log/:id" element={<PlanDetail />} />
          <Route path="share/plan/:id" element={<SharePlan />} />
          <Route path="packages" element={<Packages />} />
          <Route path="packages/:id" element={<PackageDetail />} />
          <Route path="book/:id" element={<BookPackage />} />
          <Route path="profile" element={<UserProfile />} />
          <Route path="become-agent" element={<AgentApplication />} />
          <Route path="messages" element={<Messages />} />
          <Route path="enterprise-custom" element={<EnterpriseCustom />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;