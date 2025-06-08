import React, { useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { Package, User, Building2, Settings } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { supabase } from '@/lib/supabase';
import { MessageBadge } from '@/components/MessageBadge';

export function ReviewerLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkReviewerAccess();
  }, [user, navigate]);

  async function checkReviewerAccess() {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', user?.id)
        .single();

      if (profile?.user_role !== 'reviewer') {
        navigate('/');
      }
    } catch (error) {
      console.error('Error checking reviewer access:', error);
      navigate('/');
    }
  }

  const navItems = [
    {
      path: '/profile',
      icon: User,
      label: '用户中心'
    },
    {
      path: '/admin/packages',
      icon: Package,
      label: '套餐管理'
    },
    {
      path: '/admin/agents',
      icon: Building2,
      label: '旅行社申请'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">审核员后台</h1>
            <div className="flex items-center space-x-4">
              <MessageBadge />
              <Link to="/profile" className="text-gray-600 hover:text-gray-900">
                <Settings className="h-6 w-6" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Outlet />
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="max-w-screen-xl mx-auto px-4">
          <div className="flex justify-around h-16">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center space-y-1 ${
                  location.pathname === item.path
                    ? 'text-[#F52E6B]'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <item.icon className="h-6 w-6" />
                <span className="text-xs">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}