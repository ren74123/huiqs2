import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, User, Phone, Calendar, Package, Map, Heart, Shield, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';

interface UserProfile {
  id: string;
  full_name: string;
  phone: string;
  user_role: 'user' | 'agent' | 'admin' | 'reviewer';
  status: 'active' | 'disabled';
  created_at: string;
  email?: string;
}

interface UserActivity {
  orders: any[];
  plans: any[];
  favorites: any[];
}

export function UserDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activity, setActivity] = useState<UserActivity>({
    orders: [],
    plans: [],
    favorites: []
  });
  const [roleChangeLoading, setRoleChangeLoading] = useState(false);
  const [statusChangeLoading, setStatusChangeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAdminAccess();
    fetchUserData();
  }, [user, id, navigate]);

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

  async function fetchUserData() {
    try {
      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, phone, user_role, status, created_at, email')
        .eq('id', id)
        .single();

      if (profileError) throw profileError;

      setProfile(profileData);

      // Fetch user orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select(`
          *,
          travel_packages (title, price)
        `)
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch travel plans
      const { data: plansData } = await supabase
        .from('travel_plan_logs')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch favorites
      const { data: favoritesData } = await supabase
        .from('favorites')
        .select(`
          *,
          travel_plan_logs (
            from_location,
            to_location,
            travel_date
          )
        `)
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(5);

      setActivity({
        orders: ordersData || [],
        plans: plansData || [],
        favorites: favoritesData || []
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(newRole: 'user' | 'agent' | 'admin' | 'reviewer') {
    if (!profile) return;
    
    setRoleChangeLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // First update the profile in the database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ user_role: newRole })
        .eq('id', id);

      if (updateError) throw updateError;

      // Then update the auth metadata using the edge function
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/set-user-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        },
        body: JSON.stringify({
          user_id: id,
          role: newRole
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user role in auth system');
      }

      // Update local state
      setProfile(prev => prev ? { ...prev, user_role: newRole } : null);
      setSuccess(`用户角色已更新为${
        newRole === 'admin' ? '管理员' :
        newRole === 'agent' ? '旅行社' :
        newRole === 'reviewer' ? '审核员' : '普通用户'
      }`);
    } catch (error: any) {
      console.error('Error updating user role:', error);
      setError(error.message || '更新失败，请重试');
    } finally {
      setRoleChangeLoading(false);
    }
  }

  async function handleStatusChange(newStatus: 'active' | 'disabled') {
    setStatusChangeLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, status: newStatus } : null);
      setSuccess(`用户状态已更新为${newStatus === 'active' ? '正常' : '已禁用'}`);
    } catch (error: any) {
      console.error('Error updating user status:', error);
      setError(error.message || '更新失败，请重试');
    } finally {
      setStatusChangeLoading(false);
    }
  }

  async function handleDeleteUser() {
    if (!window.confirm('确定要删除此用户吗？此操作不可撤销。')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      navigate('/admin/users');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('删除失败，请重试');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F52E6B]"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">用户不存在</h2>
          <button
            onClick={() => navigate('/admin/users')}
            className="text-[#F52E6B] hover:text-[#FE6587]"
          >
            返回用户列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-center">
        <button
          onClick={() => navigate('/admin/users')}
          className="mr-4 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">用户详情</h1>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            <span>{success}</span>
          </div>
        </div>
      )}

      {/* User Profile */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
        <div className="p-6">
          <div className="flex items-center mb-6">
            <div className="w-20 h-20 bg-[#F52E6B] bg-opacity-10 rounded-full flex items-center justify-center">
              <User className="h-10 w-10 text-[#F52E6B]" />
            </div>
            <div className="ml-6">
              <h2 className="text-xl font-bold text-gray-900">
                {profile.full_name || '未设置昵称'}
              </h2>
              <div className="flex items-center mt-2 space-x-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  profile.user_role === 'admin'
                    ? 'bg-purple-100 text-purple-800'
                    : profile.user_role === 'agent'
                    ? 'bg-blue-100 text-blue-800'
                    : profile.user_role === 'reviewer'
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {profile.user_role === 'admin' ? '管理员' :
                   profile.user_role === 'agent' ? '旅行社' :
                   profile.user_role === 'reviewer' ? '审核员' : '用户'}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  profile.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {profile.status === 'active' ? '正常' : '已禁用'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                邮箱
              </label>
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-gray-900">{profile.email || '未绑定'}</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                手机号
              </label>
              <div className="flex items-center">
                <Phone className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-gray-900">{profile.phone || '未绑定'}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                注册时间
              </label>
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-gray-900">
                  {new Date(profile.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">管理操作</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  修改身份
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleRoleChange('user')}
                    disabled={roleChangeLoading}
                    className={`px-4 py-2 rounded-lg ${
                      profile.user_role === 'user'
                        ? 'bg-[#F52E6B] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    } ${roleChangeLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    普通用户
                  </button>
                  <button
                    onClick={() => handleRoleChange('agent')}
                    disabled={roleChangeLoading}
                    className={`px-4 py-2 rounded-lg ${
                      profile.user_role === 'agent'
                        ? 'bg-[#F52E6B] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    } ${roleChangeLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    旅行社
                  </button>
                  <button
                    onClick={() => handleRoleChange('reviewer')}
                    disabled={roleChangeLoading}
                    className={`px-4 py-2 rounded-lg ${
                      profile.user_role === 'reviewer'
                        ? 'bg-[#F52E6B] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    } ${roleChangeLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    审核员
                  </button>
                  <button
                    onClick={() => handleRoleChange('admin')}
                    disabled={roleChangeLoading}
                    className={`px-4 py-2 rounded-lg ${
                      profile.user_role === 'admin'
                        ? 'bg-[#F52E6B] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    } ${roleChangeLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    管理员
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  账号状态
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleStatusChange('active')}
                    disabled={statusChangeLoading}
                    className={`px-4 py-2 rounded-lg ${
                      profile.status === 'active'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    } ${statusChangeLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    启用账号
                  </button>
                  <button
                    onClick={() => handleStatusChange('disabled')}
                    disabled={statusChangeLoading}
                    className={`px-4 py-2 rounded-lg ${
                      profile.status === 'disabled'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    } ${statusChangeLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    禁用账号
                  </button>
                </div>
              </div>

              <div>
                <button
                  onClick={handleDeleteUser}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  删除账号
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center">
            <Package className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">最近订单</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {activity.orders.length === 0 ? (
              <div className="p-4 text-center text-gray-500">暂无订单记录</div>
            ) : (
              activity.orders.map((order) => (
                <div key={order.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">
                        {order.travel_packages?.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        ¥{order.travel_packages?.price}
                      </p>
                    </div>
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      order.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {order.status === 'pending' ? '待确认' : '已联系'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Travel Plans */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center">
            <Map className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">旅行计划</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {activity.plans.length === 0 ? (
              <div className="p-4 text-center text-gray-500">暂无行程记录</div>
            ) : (
              activity.plans.map((plan) => (
                <div key={plan.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">
                        {plan.from_location} → {plan.to_location}
                      </p>
                      <p className="text-sm text-gray-500">
                        {plan.days}天行程
                      </p>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(plan.travel_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}