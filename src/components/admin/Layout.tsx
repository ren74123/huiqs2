import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { AdminNavigation } from './Navigation';
import { useAuthStore } from '../../store/auth';
import { supabase } from '../../lib/supabase';
import { Settings } from 'lucide-react';

export function AdminLayout() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [userRole, setUserRole] = React.useState<'admin' | 'reviewer' | null>(null);
  const [loading, setLoading] = React.useState(true);

  function isAuthorized(role: string | null): role is 'admin' | 'reviewer' {
    return role === 'admin' || role === 'reviewer';
  }

  useEffect(() => {
    console.log('[debug] AdminLayout - 当前用户ID:', user?.id);
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAccess();
  }, [user, navigate]);

  async function checkAccess() {
    try {
      console.log('[debug] AdminLayout - 开始检查权限, 用户ID:', user?.id);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', user?.id)
        .single();

      console.log('[debug] AdminLayout - 查询结果:', profile, '错误:', error);

      const role = profile?.user_role || null;

      if (!error && isAuthorized(role)) {
        console.log('[debug] ✅ 用户身份合法:', role);
        setUserRole(role);
      } else {
        console.warn('[debug] ⛔ 用户无权限，跳转首页，role =', role);
        navigate('/');
      }
    } catch (error) {
      console.error('[debug] AdminLayout - 检查权限出错:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F52E6B]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">
              {userRole === 'admin' ? '管理后台' : '审核员后台'}
            </h1>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => navigate('/profile')}
                className="text-gray-600 hover:text-gray-900"
              >
                <Settings className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <AdminNavigation />
      <main className="py-6">
        <Outlet />
      </main>
    </div>
  );
}