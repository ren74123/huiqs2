import React, { useEffect } from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { supabase } from '../../lib/supabase';

export function DashboardLayout() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [userRole, setUserRole] = React.useState<'admin' | 'agent' | 'reviewer' | null>(null);

  useEffect(() => {
    console.log('[debug] DashboardLayout - 当前用户ID:', user?.id);
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAccess();
  }, [user, navigate]);

  async function checkAccess() {
    try {
      console.log('[debug] DashboardLayout - 开始检查权限, 用户ID:', user?.id);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', user?.id)
        .single();

      console.log('[debug] DashboardLayout - 查询结果:', profile, '错误:', error);

      if (error) {
        console.error('[debug] DashboardLayout - 检查权限错误:', error);
        navigate('/');
        return;
      }

      if (!['admin', 'agent', 'reviewer'].includes(profile?.user_role)) {
        console.warn('[debug] DashboardLayout - 用户无权限，跳转到首页');
        navigate('/');
        return;
      }
      
      console.log('[debug] DashboardLayout - 设置用户角色:', profile.user_role);
      setUserRole(profile.user_role as 'admin' | 'agent' | 'reviewer');
    } catch (error) {
      console.error('[debug] DashboardLayout - 检查权限出错:', error);
      navigate('/');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-end h-16">
            <Link
              to="/profile"
              className="flex items-center text-gray-700 hover:text-[#F52E6B]"
            >
              返回个人中心
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}