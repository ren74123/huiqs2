import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, User, Settings, Briefcase } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';

export function AgentConsole() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [pendingEnterpriseOrders, setPendingEnterpriseOrders] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAgentAccess();
    fetchCounts();
  }, [user, navigate]);

  async function checkAgentAccess() {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      if (profile?.user_role !== 'agent') {
        navigate('/');
      }
    } catch (error) {
      console.error('Error checking agent access:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  }

  async function fetchCounts() {
    try {
      setError(null);
      
      // Fetch pending orders count
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, travel_packages!inner(agent_id)')
        .eq('travel_packages.agent_id', user?.id)
        .eq('contract_status', 'pending');

      if (ordersError) throw ordersError;
      setPendingOrders(ordersData?.length || 0);

      // Fetch enterprise orders count
      const { data: enterpriseData, error: enterpriseError } = await supabase
        .from('enterprise_orders')
        .select('id')
        .eq('status', 'approved');

      if (enterpriseError) throw enterpriseError;
      setPendingEnterpriseOrders(enterpriseData?.length || 0);
    } catch (error) {
      console.error('Error fetching counts:', error);
      setError('Failed to load data. Please try refreshing the page.');
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
      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold text-gray-900">旅行社后台</h1>
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

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Regular Orders */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">订单管理</h2>
              <p className="text-gray-600 mb-4">
                您有 <span className="font-bold text-[#F52E6B]">{pendingOrders}</span> 个待处理的订单
              </p>
              <button
                onClick={() => navigate('/agent/orders')}
                className="bg-[#F52E6B] text-white px-4 py-2 rounded-lg hover:bg-[#FE6587]"
              >
                查看订单
              </button>
            </div>
          </div>

          {/* Enterprise Orders */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">企业团建订单</h2>
              <p className="text-gray-600 mb-4">
                当前有 <span className="font-bold text-[#F52E6B]">{pendingEnterpriseOrders}</span> 个企业团建需求可以接单
              </p>
              <button
                onClick={() => navigate('/agent/enterprise-orders')}
                className="bg-[#F52E6B] text-white px-4 py-2 rounded-lg hover:bg-[#FE6587]"
              >
                查看企业团建
              </button>
            </div>
          </div>
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
              onClick={() => navigate('/agent/orders')}
              className="flex flex-col items-center justify-center space-y-1 text-gray-600 hover:text-gray-900"
            >
              <Package className="h-6 w-6" />
              <span className="text-xs">订单管理</span>
            </button>
            <button
              onClick={() => navigate('/agent/enterprise-orders')}
              className="flex flex-col items-center justify-center space-y-1 text-gray-600 hover:text-gray-900"
            >
              <Briefcase className="h-6 w-6" />
              <span className="text-xs">企业团建</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}