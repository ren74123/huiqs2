import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  MessageSquare,
  FileText,
  Settings,
  Building2,
  Home,
  Image,
  MapPin,
  Coins,
  Briefcase
} from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { supabase } from '../../lib/supabase';

export function AdminNavigation() {
  const location = useLocation();
  const { user } = useAuthStore();
  const [userRole, setUserRole] = React.useState<'admin' | 'reviewer' | null>(null);
  const [loadingRole, setLoadingRole] = React.useState(true); // ✅ 新增 loading 状态

  React.useEffect(() => {
    console.log('[debug] AdminNavigation - 当前用户ID:', user?.id);
    if (user?.id) {
      fetchUserRole();
    }
  }, [user?.id]);

  async function fetchUserRole() {
    try {
      console.log('[debug] AdminNavigation - 开始获取用户角色');
      const { data, error } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', user?.id)
        .single();

      console.log('[debug] AdminNavigation - 查询结果:', data, '错误:', error);

      if (!error && (data?.user_role === 'admin' || data?.user_role === 'reviewer')) {
        console.log('[debug] AdminNavigation - 设置用户角色:', data.user_role);
        setUserRole(data.user_role);
      }
    } catch (error) {
      console.error('[debug] AdminNavigation - 获取用户角色出错:', error);
    } finally {
      setLoadingRole(false); // ✅ 无论成功失败都关闭 loading
    }
  }

  const getNavItems = () => {
    if (loadingRole) {
      return []; // ✅ 加载中不渲染导航
    }

    const baseItems = [
      {
        path: '/profile',
        icon: Home,
        label: '用户中心'
      }
    ];

    const sharedItems = [
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

    const adminItems = [
      {
        path: '/admin',
        icon: LayoutDashboard,
        label: '仪表盘'
      },
      {
        path: '/admin/users',
        icon: Users,
        label: '用户管理'
      },
      {
        path: '/admin/orders',
        icon: FileText,
        label: '订单管理'
      },
      {
        path: '/admin/messages',
        icon: MessageSquare,
        label: '消息管理'
      },
      {
        path: '/admin/banners',
        icon: Image,
        label: '横幅管理'
      },
      {
        path: '/admin/destinations',
        icon: MapPin,
        label: '目的地管理'
      },
      {
        path: '/admin/enterprise-orders',
        icon: Briefcase,
        label: '企业团建'
      },
      {
        path: '/admin/credits',
        icon: Coins,
        label: '积分管理'
      },
      {
        path: '/admin/info-fee-records',
        icon: Coins,
        label: '信息费记录'
      },
      {
        path: '/admin/settings',
        icon: Settings,
        label: '系统设置'
      }
    ];

    console.log('[debug] AdminNavigation - 当前用户角色:', userRole);

    if (userRole === 'admin') {
      return [...baseItems, ...adminItems];
    } else if (userRole === 'reviewer') {
      return [...baseItems, ...sharedItems];
    }

    return baseItems;
  };

  const navItems = getNavItems();
  console.log('[debug] AdminNavigation - 渲染导航:', navItems);

  return (
    <div className="fixed bottom-4 left-0 right-0 mx-4">
      <div className="max-w-7xl mx-auto bg-white shadow-lg rounded-full px-6 py-2">
        <div className="flex items-center overflow-x-auto scrollbar-hide">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center min-w-[80px] px-4 ${
                  isActive ? 'text-[#F52E6B]' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div
                  className={`p-2 rounded-full transition-colors ${
                    isActive ? 'bg-[#F52E6B] bg-opacity-10' : 'hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="text-xs whitespace-nowrap mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}