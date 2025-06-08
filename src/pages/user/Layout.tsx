import React from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { Package, Map, Building2, Settings, MessageSquare } from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { supabase } from '../../lib/supabase';

export function UserLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const [userRole, setUserRole] = React.useState<'user' | 'agent' | 'admin'>('user');

  React.useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchUserRole();
  }, [user, navigate]);

  async function fetchUserRole() {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', user?.id)
        .single();

      if (profile) {
        setUserRole(profile.user_role as 'user' | 'agent' | 'admin');
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  }

  const navItems = [
    {
      path: '/user/orders',
      icon: Package,
      label: '我的订单'
    },
    {
      path: '/user/plans',
      icon: Map,
      label: '我的行程'
    },
    ...(userRole === 'user' ? [
      {
        path: '/user/agent-apply',
        icon: Building2,
        label: '成为旅行社'
      }
    ] : []),
    {
      path: '/user/settings',
      icon: Settings,
      label: '设置'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-3 py-2 text-sm font-medium ${
                    location.pathname === item.path
                      ? 'text-[#F52E6B] border-b-2 border-[#F52E6B]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <item.icon className="h-5 w-5 mr-2" />
                  {item.label}
                </Link>
              ))}
            </div>
            
            <Link
              to="/user/messages"
              className="text-gray-500 hover:text-gray-700"
            >
              <MessageSquare className="h-6 w-6" />
            </Link>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Outlet />
      </div>
    </div>
  );
}