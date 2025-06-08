import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Package, 
  FileText,
  MessageSquare,
  Settings,
  Building2,
  Image,
  MapPin
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';
import { Card } from '../../components/admin/Card';

interface DashboardStats {
  totalUsers: number;
  totalPackages: number;
  pendingApplications: number;
  totalOrders: number;
  totalMessages: number;
  systemSettings: any;
  totalBanners: number;
  totalDestinations: number;
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalPackages: 0,
    pendingApplications: 0,
    totalOrders: 0,
    totalMessages: 0,
    systemSettings: null,
    totalBanners: 0,
    totalDestinations: 0
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAdminAccess();
    fetchDashboardStats();
  }, [user, navigate]);

  async function checkAdminAccess() {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      if (profile?.user_role !== 'admin') {
        navigate('/');
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/');
    }
  }

  async function fetchDashboardStats() {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all stats in parallel for better performance
      const [
        { count: usersCount, error: usersError },
        { count: packagesCount, error: packagesError },
        { count: applicationsCount, error: applicationsError },
        { count: ordersCount, error: ordersError },
        { count: messagesCount, error: messagesError },
        { data: settings, error: settingsError },
        { count: bannersCount, error: bannersError },
        { count: destinationsCount, error: destinationsError }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact' }),
        supabase.from('travel_packages').select('*', { count: 'exact' }),
        supabase.from('agent_applications').select('*', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('orders').select('*', { count: 'exact' }),
        supabase.from('messages').select('*', { count: 'exact' }),
        supabase.from('system_settings').select('*').single(),
        supabase.from('banners').select('*', { count: 'exact' }),
        supabase.from('popular_destinations').select('*', { count: 'exact' })
      ]);

      // Check for any errors
      const errors = [
        usersError && 'Error fetching users',
        packagesError && 'Error fetching packages',
        applicationsError && 'Error fetching applications',
        ordersError && 'Error fetching orders',
        messagesError && 'Error fetching messages',
        settingsError && 'Error fetching settings',
        bannersError && 'Error fetching banners',
        destinationsError && 'Error fetching destinations'
      ].filter(Boolean);

      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }

      setStats({
        totalUsers: usersCount || 0,
        totalPackages: packagesCount || 0,
        pendingApplications: applicationsCount || 0,
        totalOrders: ordersCount || 0,
        totalMessages: messagesCount || 0,
        systemSettings: settings,
        totalBanners: bannersCount || 0,
        totalDestinations: destinationsCount || 0
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }

  const cards = [
    {
      title: '用户管理',
      value: stats.totalUsers,
      icon: <Users />,
      iconBgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
      onClick: () => navigate('/admin/users')
    },
    {
      title: '套餐管理',
      value: stats.totalPackages,
      icon: <Package />,
      iconBgColor: 'bg-green-100',
      iconColor: 'text-green-600',
      onClick: () => navigate('/admin/packages')
    },
    {
      title: '订单管理',
      value: stats.totalOrders,
      icon: <FileText />,
      iconBgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
      onClick: () => navigate('/admin/orders')
    },
    {
      title: '消息管理',
      value: stats.totalMessages,
      icon: <MessageSquare />,
      iconBgColor: 'bg-pink-100',
      iconColor: 'text-pink-600',
      onClick: () => navigate('/admin/messages')
    },
    {
      title: '旅行社申请',
      value: stats.pendingApplications,
      icon: <Building2 />,
      iconBgColor: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      onClick: () => navigate('/admin/agents')
    },
    {
      title: '系统设置',
      value: stats.systemSettings?.maintenance_mode ? '维护中' : '运行中',
      icon: <Settings />,
      iconBgColor: 'bg-gray-100',
      iconColor: 'text-gray-600',
      onClick: () => navigate('/admin/settings')
    },
    {
      title: '横幅管理',
      value: stats.totalBanners,
      icon: <Image />,
      iconBgColor: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      onClick: () => navigate('/admin/banners')
    },
    {
      title: '目的地管理',
      value: stats.totalDestinations,
      icon: <MapPin />,
      iconBgColor: 'bg-orange-100',
      iconColor: 'text-orange-600',
      onClick: () => navigate('/admin/destinations')
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F52E6B]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-red-600 text-xl">Error loading dashboard data</div>
        <div className="text-gray-600">{error}</div>
        <button 
          onClick={() => fetchDashboardStats()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <Card key={index} {...card} />
      ))}
    </div>
  );
}