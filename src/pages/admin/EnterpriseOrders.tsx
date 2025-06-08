import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Calendar, MapPin, Users, Building2, CheckCircle, XCircle, MessageSquare, Eye, EyeOff, AlertCircle, Phone, Clock, Trash2, CreditCard, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';
import { PageHeader } from '../../components/admin/PageHeader';
import { DatePicker } from '../../components/DatePicker';
import { isValidUUID } from '../../utils/validation';
import { getSignedFile } from '../../utils/file';

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
  has_paid_info_fee?: boolean;
  created_at: string;
  updated_at: string;
  user: {
    full_name: string;
    phone: string;
  };
}

interface EnterpriseApplication {
  id: string;
  order_id: string;
  agent_id: string;
  license_image: string;
  qualification_image: string;
  note: string | null;
  status: 'pending' | 'approved' | 'rejected';
  review_reason: string | null;
  created_at: string;
  updated_at: string;
  agent: {
    full_name: string;
    agency_id?: string;
  };
}

export function EnterpriseOrders() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<EnterpriseOrder[]>([]);
  const [applications, setApplications] = useState<Record<string, EnterpriseApplication[]>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'completed' | 'rejected'>('pending');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingStatus, setProcessingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [applicationRejectReason, setApplicationRejectReason] = useState('');
  const [showApplicationRejectModal, setShowApplicationRejectModal] = useState(false);
  const [imageGallery, setImageGallery] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [infoFeeLogs, setInfoFeeLogs] = useState<Record<string, any[]>>({});

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAdminAccess();
    fetchOrders();
  }, [user, navigate, statusFilter, dateRange]);

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

  async function fetchOrders() {
    try {
      setError(null);
      let query = supabase
        .from('enterprise_orders')
        .select(`
          *,
          user:profiles!enterprise_orders_user_id_fkey (
            full_name,
            phone
          )
        `)
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

      // Fetch applications for each order
      if (data && data.length > 0) {
        const orderApplications: Record<string, EnterpriseApplication[]> = {};
        const orderInfoFeeLogs: Record<string, any[]> = {};
        
        for (const order of data) {
          if (!isValidUUID(order.id)) continue;

          // Fetch applications
          const { data: applicationsData, error: applicationsError } = await supabase
            .from('enterprise_order_applications')
            .select(`
              *,
              agent:profiles!enterprise_order_applications_agent_id_fkey (
                full_name,
                agency_id
              )
            `)
            .eq('order_id', order.id)
            .order('created_at', { ascending: false });
            
          if (!applicationsError && applicationsData) {
            orderApplications[order.id] = applicationsData;
          }
          
          // Fetch info fee logs
          const { data: infoFeeData, error: infoFeeError } = await supabase
            .from('info_fee_logs')
            .select('*')
            .eq('order_id', order.id)
            .eq('remark', '企业团建信息费')
            .order('created_at', { ascending: false });
            
          if (!infoFeeError && infoFeeData) {
            orderInfoFeeLogs[order.id] = infoFeeData;
          }
        }
        
        setApplications(orderApplications);
        setInfoFeeLogs(orderInfoFeeLogs);
      }
    } catch (error) {
      console.error('Error fetching enterprise orders:', error);
      setError('获取企业订单失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteOrder() {
    if (!selectedOrderId || !isValidUUID(selectedOrderId)) return;

    setProcessingStatus(true);
    try {
      // First delete all applications for this order
      const { error: applicationsError } = await supabase
        .from('enterprise_order_applications')
        .delete()
        .eq('order_id', selectedOrderId);

      if (applicationsError) throw applicationsError;

      // Then delete the order itself
      const { error: orderError } = await supabase
        .from('enterprise_orders')
        .delete()
        .eq('id', selectedOrderId);

      if (orderError) throw orderError;

      // Update local state
      setOrders(orders.filter(order => order.id !== selectedOrderId));
      
      // Remove applications for this order
      const updatedApplications = { ...applications };
      delete updatedApplications[selectedOrderId];
      setApplications(updatedApplications);

      // Close modal
      setShowDeleteModal(false);
      setSelectedOrderId(null);
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('删除失败，请重试');
    } finally {
      setProcessingStatus(false);
    }
  }

  async function handleStatusChange(orderId: string, newStatus: 'pending' | 'approved' | 'completed' | 'rejected') {
    if (!isValidUUID(orderId)) {
      console.error('Invalid order ID');
      return;
    }
    
    if (newStatus === 'rejected') {
      setSelectedOrderId(orderId);
      setShowRejectModal(true);
      return;
    }

    setProcessingStatus(true);
    try {
      const { error } = await supabase
        .from('enterprise_orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      // Update local state
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));

      // Send notification to user
      const order = orders.find(o => o.id === orderId);
      if (order && isValidUUID(order.user_id)) {
        await supabase
          .from('messages')
          .insert({
            sender_id: user?.id,
            receiver_id: order.user_id,
            content: `您的企业团建定制需求状态已更新为${
              newStatus === 'completed' ? '已完成' : 
              newStatus === 'approved' ? '已审核' : 
              newStatus === 'rejected' ? '已拒绝' : '待审核'
            }`,
            type: 'system'
          });
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('操作失败，请重试');
    } finally {
      setProcessingStatus(false);
    }
  }

  const handleRejectConfirm = async () => {
    if (!selectedOrderId || !isValidUUID(selectedOrderId) || !rejectReason.trim()) {
      alert('请输入拒绝理由');
      return;
    }

    setProcessingStatus(true);
    try {
      // Update order status
      const { error } = await supabase
        .from('enterprise_orders')
        .update({ 
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOrderId);

      if (error) throw error;

      // Update local state
      setOrders(orders.map(order => 
        order.id === selectedOrderId ? { ...order, status: 'rejected' } : order
      ));

      // Send notification to user
      const order = orders.find(o => o.id === selectedOrderId);
      if (order && isValidUUID(order.user_id)) {
        await supabase
          .from('messages')
          .insert({
            sender_id: user?.id,
            receiver_id: order.user_id,
            content: `很抱歉，您的企业团建定制需求已被拒绝。\n\n原因：${rejectReason}`,
            type: 'system'
          });
      }

      // Close modal
      setShowRejectModal(false);
      setSelectedOrderId(null);
      setRejectReason('');
      
      // Refresh the list after a short delay
      setTimeout(() => {
        fetchOrders();
      }, 1000);
    } catch (error) {
      console.error('Error rejecting order:', error);
      alert('操作失败，请重试');
    } finally {
      setProcessingStatus(false);
    }
  }

  const handleApplicationApprove = async (applicationId: string, orderId: string) => {
    if (!isValidUUID(applicationId) || !isValidUUID(orderId)) {
      console.error('Invalid application or order ID');
      return;
    }
    
    try {
      // Update application status
      const { error: updateError } = await supabase
        .from('enterprise_order_applications')
        .update({ 
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      // Reject all other applications for this order
      const { error: rejectError } = await supabase
        .from('enterprise_order_applications')
        .update({ 
          status: 'rejected',
          review_reason: '已选择其他旅行社',
          updated_at: new Date().toISOString()
        })
        .eq('order_id', orderId)
        .neq('id', applicationId);

      if (rejectError) throw rejectError;

      // Update order status to approved
      const { error: orderError } = await supabase
        .from('enterprise_orders')
        .update({ 
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Update local state
      setApplications(prev => {
        const updated = { ...prev };
        if (updated[orderId]) {
          updated[orderId] = updated[orderId].map(app => 
            app.id === applicationId 
              ? { ...app, status: 'approved' } 
              : { ...app, status: 'rejected', review_reason: '已选择其他旅行社' }
          );
        }
        return updated;
      });

      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: 'approved' } : order
      ));

      // Send notification to approved agent
      const application = applications[orderId]?.find(a => a.id === applicationId);
      if (application && isValidUUID(application.agent_id)) {
        await supabase
          .from('messages')
          .insert({
            sender_id: user?.id,
            receiver_id: application.agent_id,
            content: `恭喜，您的企业团建接单申请已通过审核。请尽快与客户联系。`,
            type: 'system'
          });
      }

      // Send notifications to rejected agents
      const rejectedApplications = applications[orderId]?.filter(a => a.id !== applicationId) || [];
      for (const app of rejectedApplications) {
        if (isValidUUID(app.agent_id)) {
          await supabase
            .from('messages')
            .insert({
              sender_id: user?.id,
              receiver_id: app.agent_id,
              content: `很抱歉，您的企业团建接单申请未通过审核。\n\n原因：已选择其他旅行社`,
              type: 'system'
            });
        }
      }

      // Send notification to user
      const order = orders.find(o => o.id === orderId);
      if (order && isValidUUID(order.user_id)) {
        await supabase
          .from('messages')
          .insert({
            sender_id: user?.id,
            receiver_id: order.user_id,
            content: `您的企业团建定制需求已分配给旅行社，他们将尽快与您联系。`,
            type: 'system'
          });
      }

      // Refresh data
      fetchOrders();
    } catch (error) {
      console.error('Error approving application:', error);
      alert('操作失败，请重试');
    }
  }

  const handleApplicationReject = async () => {
    if (!selectedApplicationId || !isValidUUID(selectedApplicationId) || !applicationRejectReason.trim()) {
      alert('请输入拒绝理由');
      return;
    }

    try {
      // Update application status
      const { error } = await supabase
        .from('enterprise_order_applications')
        .update({ 
          status: 'rejected',
          review_reason: applicationRejectReason,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedApplicationId);

      if (error) throw error;

      // Update local state
      setApplications(prev => {
        const updated = { ...prev };
        for (const orderId in updated) {
          updated[orderId] = updated[orderId].map(app => 
            app.id === selectedApplicationId ? { ...app, status: 'rejected', review_reason: applicationRejectReason } : app
          );
        }
        return updated;
      });

      // Send notification to agent
      const application = Object.values(applications)
        .flat()
        .find(a => a.id === selectedApplicationId);
        
      if (application && isValidUUID(application.agent_id)) {
        await supabase
          .from('messages')
          .insert({
            sender_id: user?.id,
            receiver_id: application.agent_id,
            content: `很抱歉，您的企业团建接单申请已被拒绝。\n\n原因：${applicationRejectReason}`,
            type: 'system'
          });
      }

      // Close modal and reset state
      setShowApplicationRejectModal(false);
      setSelectedApplicationId(null);
      setApplicationRejectReason('');

      // Refresh data
      fetchOrders();
    } catch (error) {
      console.error('Error rejecting application:', error);
      alert('操作失败，请重试');
    }
  }

  async function handleViewImages(imageUrls: string) {
    const images = imageUrls.split(',').filter(Boolean);
    const signedUrls: string[] = [];

    for (const img of images) {
      if (img.startsWith('http')) {
        // 已经是完整URL了，直接用
        signedUrls.push(img);
      } else {
        // 是存储路径，解析出 bucket 和 文件路径
        const parts = img.split('/');
        const bucket = parts[0]; // 比如 enterprise_docs
        const filePath = parts.slice(1).join('/'); // 后面的路径

        const signedUrl = await getSignedFile(bucket, filePath);
        if (signedUrl) {
          signedUrls.push(signedUrl);
        } else {
          console.error('签名失败:', img);
        }
      }
    }

    if (signedUrls.length === 0) {
      console.error('没有可用的图片地址');
      return;
    }

    console.log('生成的最终图片URL:', signedUrls);

    setImageGallery(signedUrls);
    setCurrentImageIndex(0);
    setSelectedImage(signedUrls[0]);
    setShowImageModal(true);
  }

  const navigateImage = (direction: 'prev' | 'next') => {
    if (imageGallery.length <= 1) return;
    
    let newIndex;
    if (direction === 'prev') {
      newIndex = currentImageIndex === 0 ? imageGallery.length - 1 : currentImageIndex - 1;
    } else {
      newIndex = currentImageIndex === imageGallery.length - 1 ? 0 : currentImageIndex + 1;
    }
    
    setCurrentImageIndex(newIndex);
    setSelectedImage(imageGallery[newIndex]);
  };

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
  }

  const getApplicationStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">已通过</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">已拒绝</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">待审核</span>;
    }
  }

  const filteredOrders = orders.filter(order => 
    order.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.departure_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.destination_location.toLowerCase().includes(searchTerm.toLowerCase())
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
      <PageHeader 
        title="企业团建定制管理"
        subtitle="管理企业团建定制需求和旅行社接单申请"
      />

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
                  placeholder="搜索联系人、出发地或目的地..."
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
                  {['all', 'pending', 'approved', 'completed', 'rejected'].map((status) => (
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
                       status === 'approved' ? '已审核' :
                       status === 'completed' ? '已完成' : '已拒绝'}
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
            filteredOrders.map((order) => (
              <div key={order.id} className="p-6">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      <h3 className="text-lg font-medium text-gray-900 mr-3">
                        {order.departure_location} → {order.destination_location}
                      </h3>
                      {getStatusBadge(order.status)}
                      {order.has_paid_info_fee && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          已支付信息费
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                        <span>联系人：{order.contact_name}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                        <span>出行时间：{new Date(order.travel_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                        <span>联系电话：{order.contact_phone}</span>
                      </div>
                      {order.people_count && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Users className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                          <span>人数：{order.people_count}人</span>
                        </div>
                      )}
                    </div>
                    
                    {order.requirements && (
                      <div className="mt-2 mb-4">
                        <p className="font-medium text-sm text-gray-700">需求说明：</p>
                        <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">{order.requirements}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end space-y-3">
                    <span className="text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleString()}
                    </span>
                    
                    <div className="flex flex-wrap gap-2 justify-end">
                      <button
                        onClick={() => {
                          if (isValidUUID(order.id)) {
                            setSelectedOrderId(order.id);
                            setShowDeleteModal(true);
                          }
                        }}
                        className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 flex items-center"
                      >
                        <Trash2 className="h-4 w-4 mr-1.5" />
                        删除
                      </button>
                      
                      <button
                        onClick={() => {
                          if (isValidUUID(order.id)) {
                            setExpandedOrder(expandedOrder === order.id ? null : order.id);
                          }
                        }}
                        className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 flex items-center"
                      >
                        {expandedOrder === order.id ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-1.5" />
                            收起
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-1.5" />
                            {applications[order.id]?.length ? `查看申请(${applications[order.id].length})` : '查看详情'}
                          </>
                        )}
                      </button>
                      
                      {order.status === 'pending' && (
                        <button
                          
                          onClick={() => {
                            if (isValidUUID(order.id)) {
                              handleStatusChange(order.id, 'rejected');
                            }
                          }}
                          className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 flex items-center"
                        >
                          <XCircle className="h-4 w-4 mr-1.5" />
                          拒绝
                        </button>
                      )}
                      
                      {order.status === 'approved' && (
                        <button
                          onClick={() => {
                            if (isValidUUID(order.id)) {
                              handleStatusChange(order.id, 'completed');
                            }
                          }}
                          className="px-3 py-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 flex items-center"
                        >
                          <CheckCircle className="h-4 w-4 mr-1.5" />
                          标记完成
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Applications Section */}
                {expandedOrder === order.id && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <h4 className="text-md font-medium text-gray-900 mb-4">旅行社接单申请</h4>
                    
                    {applications[order.id]?.length ? (
                      <div className="space-y-4">
                        {applications[order.id].map((application) => (
                          <div key={application.id} className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                              <div>
                                <div className="flex items-center mb-2">
                                  <h5 className="font-medium text-gray-900 mr-2">
                                    {application.agent.full_name}
                                    {application.agent.agency_id && ` (ID: ${application.agent.agency_id})`}
                                  </h5>
                                  {getApplicationStatusBadge(application.status)}
                                </div>
                                <div className="text-sm text-gray-600">
                                  <p>申请时间：{new Date(application.created_at).toLocaleString()}</p>
                                </div>
                                
                                {application.note && (
                                  <div className="mt-2 text-sm">
                                    <p className="font-medium text-gray-700">申请备注：</p>
                                    <p className="text-gray-600 bg-white p-2 rounded mt-1">{application.note}</p>
                                  </div>
                                )}
                                
                                {application.review_reason && (
                                  <div className="mt-2 text-sm">
                                    <p className="font-medium text-gray-700">审核意见：</p>
                                    <p className="text-gray-600 bg-white p-2 rounded mt-1">{application.review_reason}</p>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => handleViewImages(application.license_image)}
                                  className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                                >
                                  查看营业执照
                                </button>
                                <button
                                  onClick={() => handleViewImages(application.qualification_image)}
                                  className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                                >
                                  查看资质证明
                                </button>
                                
                                {application.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => {
                                        if (isValidUUID(application.id) && isValidUUID(order.id)) {
                                          handleApplicationApprove(application.id, order.id);
                                        }
                                      }}
                                      className="px-3 py-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 flex items-center"
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1.5" />
                                      通过
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (isValidUUID(application.id)) {
                                          setSelectedApplicationId(application.id);
                                          setApplicationRejectReason('');
                                          setShowApplicationRejectModal(true);
                                        }
                                      }}
                                      className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 flex items-center"
                                    >
                                      <XCircle className="h-4 w-4 mr-1.5" />
                                      拒绝
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-gray-50 rounded-lg">
                        <p className="text-gray-500">暂无旅行社接单申请</p>
                      </div>
                    )}
                    
                    {/* Info Fee Logs Section */}
                    {infoFeeLogs[order.id]?.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-md font-medium text-gray-900 mb-4">信息费支付记录</h4>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">支付时间</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">旅行社</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">金额</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">备注</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {infoFeeLogs[order.id].map((log) => (
                                <tr key={log.id}>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(log.created_at).toLocaleString()}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                    {log.agent_id}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-[#F52E6B]">
                                    ¥{log.amount.toFixed(2)}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                    {log.remark}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Order Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">删除订单</h2>
            <p className="text-gray-600 mb-6">
              确认删除此企业团建定制需求？此操作将删除所有相关的接单申请，且不可恢复。
            </p>
            
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedOrderId(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleDeleteOrder}
                disabled={processingStatus}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center"
              >
                {processingStatus ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    处理中...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    确认删除
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">拒绝需求</h2>
            <p className="text-gray-600 mb-4">请输入拒绝理由：</p>
            
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
              rows={4}
              placeholder="请输入拒绝理由..."
            />
            
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedOrderId(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={!rejectReason.trim() || processingStatus}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center"
              >
                {processingStatus ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    处理中...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    确认拒绝
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Application Reject Modal */}
      {showApplicationRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">拒绝接单申请</h2>
            <p className="text-gray-600 mb-4">请输入拒绝理由：</p>
            
            <textarea
              value={applicationRejectReason}
              onChange={(e) => setApplicationRejectReason(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
              rows={4}
              placeholder="请输入拒绝理由..."
            />
            
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => {
                  setShowApplicationRejectModal(false);
                  setSelectedApplicationId(null);
                  setApplicationRejectReason('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleApplicationReject}
                disabled={!applicationRejectReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center"
              >
                <XCircle className="h-4 w-4 mr-2" />
                确认拒绝
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-4xl mx-4">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
            
            {imageGallery.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateImage('prev');
                  }}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
                >
                  <X className="h-6 w-6 transform rotate-45" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateImage('next');
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
                >
                  <X className="h-6 w-6 transform rotate-[225deg]" />
                </button>
              </>
            )}
            
            <img
              src={selectedImage}
              alt="证件图片"
              className="rounded-lg max-h-[90vh] w-auto"
              onClick={(e) => e.stopPropagation()}
            />
            
            {imageGallery.length > 1 && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                <div className="bg-black bg-opacity-50 px-4 py-2 rounded-full text-white text-sm">
                  {currentImageIndex + 1} / {imageGallery.length}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}