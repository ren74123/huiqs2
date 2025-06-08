import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Calendar, MapPin, Users, Building2, AlertCircle, Phone, Clock, CheckCircle, FileText, X, Eye, EyeOff, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';
import { DatePicker } from '../../components/DatePicker';
import { EnterpriseApplicationForm } from './EnterpriseApplicationForm';
import { isValidUUID } from '../../utils/validation';

interface EnterpriseOrder {
  id: string;
  contact_name: string;
  contact_phone: string;
  departure_location: string;
  destination_location: string;
  travel_date: string;
  people_count: number | null;
  requirements: string | null;
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  has_paid_info_fee?: boolean;
  created_at: string;
}

export function EnterpriseOrders() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<EnterpriseOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'completed' | 'rejected'>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [myApplications, setMyApplications] = useState<Record<string, { status: string, reason?: string }>>({});
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchOrders();
    fetchMyApplications();
  }, [user, navigate, statusFilter, dateRange]);

  async function fetchOrders() {
    try {
      setError(null);
      let query = supabase
        .from('enterprise_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (dateRange.start && dateRange.end) {
        query = query
          .gte('travel_date', dateRange.start)
          .lte('travel_date', dateRange.end);
      }

      const { data, error: ordersError } = await query;

      if (ordersError) throw ordersError;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching enterprise orders:', error);
      setError('获取企业订单失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  async function fetchMyApplications() {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('enterprise_order_applications')
        .select('order_id, status, review_reason')
        .eq('agent_id', user.id);
        
      if (error) throw error;
      
      if (data) {
        const applications: Record<string, { status: string, reason?: string }> = {};
        data.forEach(app => {
          applications[app.order_id] = { 
            status: app.status,
            reason: app.review_reason || undefined
          };
        });
        setMyApplications(applications);
      }
    } catch (error) {
      console.error('Error fetching my applications:', error);
    }
  }

  const handleApplicationSuccess = () => {
    setShowApplicationModal(false);
    setSelectedOrderId(null);
    fetchMyApplications();
  };

  const handlePayInfoFee = (orderId: string) => {
    if (!isValidUUID(orderId)) {
      console.error('Invalid order ID');
      return;
    }
    navigate(`/profile?enterpriseOrderId=${orderId}&tab=credits&activeSettingsTab=enterprise-fee-payment`);
  };

  const getApplicationStatus = (orderId: string) => {
    const application = myApplications[orderId];
    if (!application) return null;
    
    switch (application.status) {
      case 'approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">已通过</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">已拒绝</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">审核中</span>;
    }
  };

  const getOrderStatusBadge = (status: string) => {
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

  const filteredOrders = orders.filter(order => 
    (order.departure_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.destination_location.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F52E6B]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">企业团建接单</h1>
        <div className="text-sm text-gray-600">
          查看企业团建需求并申请接单
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索出发地、目的地..."
                  className="pl-10 w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                />
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="ml-4 flex items-center px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              <Filter className="h-5 w-5 mr-2" />
              筛选
            </button>
          </div>

          <div className={`mt-4 space-y-4 ${showFilters ? 'block' : 'hidden'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  出行时间范围
                </label>
                <div className="flex space-x-2">
                  <DatePicker
                    value={dateRange.start}
                    onChange={(date) => setDateRange({ ...dateRange, start: date })}
                    placeholder="开始日期"
                  />
                  <DatePicker
                    value={dateRange.end}
                    onChange={(date) => setDateRange({ ...dateRange, end: date })}
                    placeholder="结束日期"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  订单状态
                </label>
                <div className="flex flex-wrap gap-2">
                  {['all', 'pending', 'approved', 'completed'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status as any)}
                      className={`px-4 py-2 rounded-lg ${
                        statusFilter === status
                          ? 'bg-[#F52E6B] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {status === 'all' ? '全部' :
                       status === 'pending' ? '待审核' :
                       status === 'approved' ? '已审核' : '已完成'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="divide-y divide-gray-200">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">暂无符合条件的企业团建定制需求</p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const hasApplied = myApplications[order.id] !== undefined;
              const isApproved = hasApplied && myApplications[order.id].status === 'approved';
              
              return (
                <div key={order.id} className="p-6">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center mb-3">
                        <h3 className="text-lg font-medium text-gray-900 mr-3">
                          {order.departure_location} → {order.destination_location}
                        </h3>
                        {getOrderStatusBadge(order.status)}
                        {hasApplied && getApplicationStatus(order.id)}
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                          <span>出行时间：{new Date(order.travel_date).toLocaleDateString()}</span>
                        </div>
                        {order.people_count && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Users className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                            <span>人数：{order.people_count}人</span>
                          </div>
                        )}
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                          <span>发布时间：{new Date(order.created_at).toLocaleDateString()}</span>
                        </div>
                        {/* Only show contact information if application is approved */}
                        {isApproved && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                            <span>联系人：{order.contact_name} ({order.contact_phone})</span>
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                        className="text-sm text-[#F52E6B] hover:text-[#FE6587] flex items-center"
                      >
                        {expandedOrder === order.id ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-1" />
                            收起详情
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-1" />
                            查看详情
                          </>
                        )}
                      </button>
                      
                      {expandedOrder === order.id && order.requirements && (
                        <div className="mt-3 mb-3">
                          <p className="font-medium text-sm text-gray-700">需求说明：</p>
                          <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">{order.requirements}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end space-y-3">
                      <div className="flex items-center">
                        {hasApplied ? (
                          <div className="flex flex-col items-end">
                            <div className="mb-1">
                              {getApplicationStatus(order.id)}
                            </div>
                            {myApplications[order.id].status === 'rejected' && myApplications[order.id].reason && (
                              <div className="text-xs text-red-600 max-w-xs text-right">
                                拒绝原因: {myApplications[order.id].reason}
                              </div>
                            )}
                          </div>
                        ) : (
                          order.status === 'pending' && (
                            <button
                              onClick={() => {
                                setSelectedOrderId(order.id);
                                setShowApplicationModal(true);
                              }}
                              className="px-3 py-1.5 bg-[#F52E6B] text-white rounded-lg hover:bg-[#FE6587] flex items-center"
                            >
                              <FileText className="h-4 w-4 mr-1.5" />
                              申请接单
                            </button>
                          )
                        )}
                      </div>
                      
                      {isApproved && (
                        <button
                          onClick={() => handlePayInfoFee(order.id)}
                          className={`px-3 py-1.5 rounded flex items-center ${
                            order.has_paid_info_fee 
                              ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                              : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                          }`}
                        >
                          <CreditCard className="h-4 w-4 mr-1.5" />
                          {order.has_paid_info_fee ? '再次支付信息费' : '待支付信息费'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Application Modal */}
      {showApplicationModal && selectedOrderId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <EnterpriseApplicationForm 
            orderId={selectedOrderId}
            onClose={() => {
              setShowApplicationModal(false);
              setSelectedOrderId(null);
            }}
            onSuccess={handleApplicationSuccess}
          />
        </div>
      )}
    </div>
  );
}