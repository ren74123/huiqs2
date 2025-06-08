import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Building2, User, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { MessageBadge } from '@/components/MessageBadge';

export function ReviewerConsole() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'packages' | 'applications'>('packages');
  const [loading, setLoading] = useState(true);
  const [pendingPackages, setPendingPackages] = useState(0);
  const [pendingApplications, setPendingApplications] = useState(0);

  useEffect(() => {
    console.log('[debug] ReviewerConsole - 当前用户ID:', user?.id);
    if (!user) {
      navigate('/auth');
      return;
    }
    checkReviewerAccess();
    fetchCounts();
  }, [user, navigate]);

  async function checkReviewerAccess() {
    try {
      console.log('[debug] ReviewerConsole - 开始检查审核员权限, 用户ID:', user?.id);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', user?.id)
        .single();

      console.log('[debug] ReviewerConsole - 查询结果:', profile, '错误:', error);

      if (error) throw error;

      if (profile?.user_role !== 'reviewer') {
        console.warn('[debug] ReviewerConsole - 用户不是审核员，跳转到首页');
        navigate('/');
      } else {
        console.log('[debug] ReviewerConsole - 用户是审核员');
      }
    } catch (error) {
      console.error('[debug] ReviewerConsole - 检查审核员权限出错:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  }

  async function fetchCounts() {
    try {
      console.log('[debug] ReviewerConsole - 开始获取待审核数量');
      // Fetch pending packages count
      const { count: packagesCount, error: packagesError } = await supabase
        .from('travel_packages')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      console.log('[debug] ReviewerConsole - 待审核套餐数量:', packagesCount, '错误:', packagesError);
      if (packagesError) throw packagesError;
      setPendingPackages(packagesCount || 0);

      // Fetch pending applications count
      const { count: applicationsCount, error: applicationsError } = await supabase
        .from('agent_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      console.log('[debug] ReviewerConsole - 待审核申请数量:', applicationsCount, '错误:', applicationsError);
      if (applicationsError) throw applicationsError;
      setPendingApplications(applicationsCount || 0);
    } catch (error) {
      console.error('[debug] ReviewerConsole - 获取待审核数量出错:', error);
    }
  }

  const handlePackagesClick = () => {
    console.log('[debug] ReviewerConsole - 点击前往套餐管理');
    navigate('/admin/packages');
  };

  const handleApplicationsClick = () => {
    console.log('[debug] ReviewerConsole - 点击前往旅行社申请');
    navigate('/admin/agents');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F52E6B]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold text-gray-900">审核员后台</h1>
            <div className="flex items-center space-x-4">
              <MessageBadge />
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

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('packages')}
              className={`flex-1 py-4 px-6 text-center ${
                activeTab === 'packages'
                  ? 'border-b-2 border-[#F52E6B] text-[#F52E6B]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center justify-center">
                <Package className="h-5 w-5 mr-2" />
                <span>套餐管理</span>
                {pendingPackages > 0 && (
                  <span className="ml-2 bg-[#F52E6B] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {pendingPackages}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('applications')}
              className={`flex-1 py-4 px-6 text-center ${
                activeTab === 'applications'
                  ? 'border-b-2 border-[#F52E6B] text-[#F52E6B]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center justify-center">
                <Building2 className="h-5 w-5 mr-2" />
                <span>旅行社申请</span>
                {pendingApplications > 0 && (
                  <span className="ml-2 bg-[#F52E6B] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {pendingApplications}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {activeTab === 'packages' ? (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">套餐审核</h2>
              <p className="text-gray-600 mb-4">
                您有 <span className="font-bold text-[#F52E6B]">{pendingPackages}</span> 个待审核的套餐
              </p>
              <button
                onClick={handlePackagesClick}
                className="bg-[#F52E6B] text-white px-4 py-2 rounded-lg hover:bg-[#FE6587]"
              >
                前往审核
              </button>
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">旅行社申请审核</h2>
              <p className="text-gray-600 mb-4">
                您有 <span className="font-bold text-[#F52E6B]">{pendingApplications}</span> 个待审核的旅行社申请
              </p>
              <button
                onClick={handleApplicationsClick}
                className="bg-[#F52E6B] text-white px-4 py-2 rounded-lg hover:bg-[#FE6587]"
              >
                前往审核
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="max-w-screen-xl mx-auto px-4">
          <div className="flex justify-around h-16">
            <button
              onClick={() => navigate('/profile')}
              className="flex flex-col items-center justify-center space-y-1 text-gray-600 hover:text-gray-900"
            >
              <User className="h-6 w-6" />
              <span className="text-xs">用户中心</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('packages');
                handlePackagesClick();
              }}
              className={`flex flex-col items-center justify-center space-y-1 ${
                activeTab === 'packages' ? 'text-[#F52E6B]' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Package className="h-6 w-6" />
              <span className="text-xs">套餐管理</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('applications');
                handleApplicationsClick();
              }}
              className={`flex flex-col items-center justify-center space-y-1 ${
                activeTab === 'applications' ? 'text-[#F52E6B]' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building2 className="h-6 w-6" />
              <span className="text-xs">旅行社申请</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}