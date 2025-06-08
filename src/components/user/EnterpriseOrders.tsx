import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Clock, Users, Building2, AlertCircle, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';
import { isValidUUID } from '../../utils/validation';

interface EnterpriseOrder {
  id: string;
  user_id: string;
  contact_name: string;
  contact_phone: string;
  departure_location: string;
  destination_location: string;
  travel_date: string;
  people_count: number | null;
  requirements: string | null;
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  created_at: string;
  updated_at: string;
}

export function EnterpriseOrders() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<EnterpriseOrder[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  async function fetchOrders() {
    try {
      setLoading(true);
      setError(null);

      // Add timeout to the fetch operation
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 10000);
      });

      const fetchPromise = supabase
        .from('enterprise_orders')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      const { data, error } = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]) as any;

      if (error) throw error;
      
      if (!data) {
        throw new Error('No data received from server');
      }
      
      setOrders(data);
      setRetryCount(0); // Reset retry count on successful fetch
    } catch (error) {
      console.error('Error fetching enterprise orders:', error);
      
      // Implement retry logic
      if (retryCount < MAX_RETRIES) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          fetchOrders();
        }, Math.pow(2, retryCount) * 1000); // Exponential backoff
        setError('正在重试获取企业团建订单数据...');
      } else {
        setError('获取企业团建订单失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">已审核</span>;
      case 'completed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">已完成</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">已拒绝</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">待审核</span>;
    }
  };

  const toggleOrderExpand = (orderId: string) => {
    if (!isValidUUID(orderId)) return;
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#F52E6B] border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-700 mb-4">{error}</p>
        <button 
          onClick={() => fetchOrders()}
          className="inline-block bg-[#F52E6B] text-white px-4 py-2 rounded-lg hover:bg-[#FE6587]"
        >
          重试
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">暂无企业团建订单</p>
        <button 
          onClick={() => navigate('/enterprise-custom')}
          className="inline-block bg-[#F52E6B] text-white px-4 py-2 rounded-lg hover:bg-[#FE6587]"
        >
          创建企业团建需求
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">企业团建订单</h2>
        <button 
          onClick={() => navigate('/enterprise-custom')}
          className="bg-[#F52E6B] text-white px-4 py-2 rounded-lg hover:bg-[#FE6587]"
        >
          创建新需求
        </button>
      </div>

      {orders.map((order) => (
        <div
          key={order.id}
          className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow w-full"
        >
          <div className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {order.departure_location} → {order.destination_location}
                </h3>
                <div className="mt-2 space-y-1 text-sm text-gray-500">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>{order.departure_location} → {order.destination_location}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>出行时间: {new Date(order.travel_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>创建时间: {new Date(order.created_at).toLocaleDateString()}</span>
                  </div>
                  {order.people_count && (
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      <span>人数: {order.people_count}人</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                {getStatusBadge(order.status)}
                <button
                  onClick={() => toggleOrderExpand(order.id)}
                  className="mt-2 text-sm text-[#F52E6B] hover:text-[#FE6587] flex items-center justify-end"
                >
                  {expandedOrder === order.id ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      收起详情
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      查看详情
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Expanded details */}
            {expandedOrder === order.id && order.requirements && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center mb-2">
                  <FileText className="h-4 w-4 mr-1 text-[#F52E6B]" />
                  <h4 className="font-medium text-gray-900">需求详情</h4>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{order.requirements}</p>
                </div>
                
                {/* Status timeline */}
                <div className="mt-4">
                  <h4 className="font-medium text-gray-900 mb-2">状态时间线</h4>
                  <div className="relative pl-6 border-l-2 border-gray-200 space-y-4">
                    <div className="relative">
                      <div className="absolute -left-[25px] w-4 h-4 rounded-full bg-green-500"></div>
                      <p className="text-sm">
                        <span className="font-medium">提交需求</span>
                        <span className="text-gray-500 ml-2">{new Date(order.created_at).toLocaleString()}</span>
                      </p>
                    </div>
                    
                    {order.status !== 'pending' && (
                      <div className="relative">
                        <div className={`absolute -left-[25px] w-4 h-4 rounded-full ${
                          order.status === 'rejected' ? 'bg-red-500' : 'bg-blue-500'
                        }`}></div>
                        <p className="text-sm">
                          <span className="font-medium">
                            {order.status === 'approved' ? '已审核' : 
                             order.status === 'completed' ? '已完成' : '已拒绝'}
                          </span>
                          <span className="text-gray-500 ml-2">{new Date(order.updated_at).toLocaleString()}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}