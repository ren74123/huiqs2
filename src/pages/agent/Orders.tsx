import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Clock, Download, CreditCard, Filter, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';
import JSZip from 'jszip';
import { isValidUUID } from '../../utils/validation';
import { DatePicker } from '../../components/DatePicker';
import { getSignedFile } from '../../utils/file';

// 订单数据类型
interface Order {
  id: string;
  package_id: string;
  contact_name: string;
  contact_phone: string;
  id_card?: string;
  travel_date: string;
  status: 'pending' | 'contacted' | 'rejected';
  created_at: string;
  has_paid_info_fee: boolean;
  travel_packages: {
    id: string;
    title: string;
    price: number;
    destination: string;
    duration: number;
    image: string;
  };
}

export function AgentOrders() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [messages, setMessages] = useState<Record<string, string[]>>({});
  const [newMessages, setNewMessages] = useState<Record<string, string>>({});
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<Record<string, boolean>>({});
  
  // 筛选状态
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'contacted' | 'rejected'>('pending');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAgencyId();
      fetchOrders();
    }
  }, [user, statusFilter, dateRange]);

  async function fetchAgencyId() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('agency_id')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setAgencyId(data?.agency_id || null);
    } catch (error) {
      console.error('Error fetching agency ID:', error);
    }
  }

  async function fetchOrders() {
    try {
      setLoading(true);
      let query = supabase
        .from('orders')
        .select(`
          *,
          travel_packages (
            id,
            title,
            price,
            destination,
            duration,
            image
          )
        `)
        .eq('travel_packages.agent_id', user?.id)
        .order('created_at', { ascending: false });

      // Apply status filter if not 'all'
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply date range filter if provided
      if (dateRange.start && dateRange.end) {
        query = query
          .gte('travel_date', dateRange.start)
          .lte('travel_date', dateRange.end);
      }

      // Apply search filter if provided
      if (searchTerm) {
        query = query.or(`contact_name.ilike.%${searchTerm}%,contact_phone.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Filter out orders with invalid or missing IDs
      const validOrders = (data || []).filter(
        (o): o is Order => isValidUUID(o.id)
      );
      setOrders(validOrders);

      // 拉取每个订单的消息记录
      const orderMessages: Record<string, string[]> = {};
      for (const order of validOrders) {
        const { data: msgData } = await supabase
          .from('message_logs')
          .select('message')
          .eq('order_id', order.id)
          .order('created_at', { ascending: true });
        orderMessages[order.id] = msgData?.map(m => m.message) || [];
      }
      setMessages(orderMessages);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }

  // 标记已联系 / 拒绝订单
  const handleStatusChange = async (orderId: string, newStatus: 'contacted' | 'rejected') => {
    if (!isValidUUID(orderId)) return;
    
    if (newStatus === 'rejected') {
      setSelectedOrderId(orderId);
      setShowRejectModal(true);
      return;
    }
    
    setProcessingStatus(prev => ({ ...prev, [orderId]: true }));
    try {
      await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      // 重新拉取消息
      const { data: msgData } = await supabase
        .from('message_logs')
        .select('message')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });
      setMessages(prev => ({ ...prev, [orderId]: msgData?.map(m => m.message) || [] }));
    } catch (err) {
      console.error('Error updating status:', err);
      alert('操作失败，请重试');
    } finally {
      setProcessingStatus(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // 处理拒绝确认
  const handleRejectConfirm = async () => {
    if (!selectedOrderId || !isValidUUID(selectedOrderId)) {
      console.error('Invalid order ID');
      return;
    }

    if (rejectReason.length < 2 || rejectReason.length > 100) {
      alert('拒绝理由需要2-100字');
      return;
    }

    setProcessingStatus(prev => ({ ...prev, [selectedOrderId]: true }));
    try {
      // 更新订单状态
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOrderId);

      if (updateError) throw updateError;

      // 添加拒绝消息
      const { error: messageError } = await supabase
        .from('message_logs')
        .insert({
          order_id: selectedOrderId,
          from_role: 'agent',
          message: `订单已被拒绝，原因：${rejectReason}`,
          read: false
        });

      if (messageError) throw messageError;

      // 更新本地状态
      setOrders(orders.map(order => 
        order.id === selectedOrderId ? { ...order, status: 'rejected' } : order
      ));

      // 拉取更新后的消息
      const { data: messageData } = await supabase
        .from('message_logs')
        .select('message')
        .eq('order_id', selectedOrderId)
        .order('created_at', { ascending: true });
        
      if (messageData) {
        setMessages(prev => ({
          ...prev,
          [selectedOrderId]: messageData.map(m => m.message)
        }));
      }

      // 重置模态框状态
      setShowRejectModal(false);
      setSelectedOrderId(null);
      setRejectReason('');
    } catch (error) {
      console.error('Error rejecting order:', error);
      alert('操作失败，请重试');
    } finally {
      setProcessingStatus(prev => ({ ...prev, [selectedOrderId]: false }));
    }
  };

  // 发送消息
  const handleSendMessage = async (orderId: string) => {
    const msg = newMessages[orderId]?.trim();
    if (!msg) return;
    try {
      await supabase.from('message_logs').insert({
        order_id: orderId,
        from_role: 'agent',
        message: msg,
        read: false,
      });
      setMessages(prev => ({
        ...prev,
        [orderId]: [...(prev[orderId] || []), msg]
      }));
      setNewMessages(prev => ({ ...prev, [orderId]: '' }));
    } catch (err) {
      console.error('Error sending message:', err);
      alert('发送失败，请重试');
    }
  };

  // 导出订单信息 & 身份证图片
  const handleExport = async (order: Order) => {
    if (!isValidUUID(order.id)) return;
    try {
      const text = `订单信息：\n联系人：${order.contact_name}\n电话：${order.contact_phone}\n出发日期：${new Date(order.travel_date).toLocaleDateString()}\n`;
      const zip = new JSZip();
      zip.file('order-info.txt', text);

      // 如果有身份证路径，则获取签名URL并下载
      if (order.id_card) {
        const signedUrl = await getSignedFile('id-cards', order.id_card);
        if (signedUrl) {
          try {
            const resp = await fetch(signedUrl);
            if (resp.ok) {
              const blob = await resp.blob();
              const ext = order.id_card.slice(order.id_card.lastIndexOf('.')) || '.jpg';
              zip.file(`id-card${ext}`, blob);
            } else {
              console.warn('身份证图片拉取失败', resp.statusText);
              zip.file('id-card-note.txt', '身份证照片下载失败');
            }
          } catch (fetchError) {
            console.error('获取身份证图片失败:', fetchError);
            zip.file('id-card-note.txt', '身份证照片下载失败');
          }
        } else {
          console.warn('身份证签名 URL 生成失败');
          zip.file('id-card-note.txt', '身份证照片无法访问');
        }
      } else {
        console.warn('订单无身份证字段');
        zip.file('id-card-note.txt', '身份证照片缺失');
      }

      // 生成并下载
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order-${order.id.substring(0,8)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('导出失败:', err);
      alert('导出失败，请重试');
    }
  };

  const handlePayInfoFee = (orderId: string) => {
    if (!isValidUUID(orderId)) {
      console.error('Invalid order ID');
      return;
    }
    navigate(`/profile?order_id=${orderId}&tab=credits`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'contacted':
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">已联系</span>;
      case 'rejected':
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">已拒绝</span>;
      default:
        return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">待联系</span>;
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin h-8 w-8 border-2 border-[#F52E6B] border-t-transparent rounded-full"></div></div>;
  }

  if (!orders.length) {
    return <div className="text-center py-12 text-gray-500">暂无订单</div>;
  }

  const filteredOrders = orders;

  return (
    <div className="space-y-4">
      {/* 筛选条件 */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索联系人、手机号..."
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
                  {['all', 'pending', 'contacted', 'rejected'].map((status) => (
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
                       status === 'pending' ? '待联系' :
                       status === 'contacted' ? '已联系' : '已拒绝'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {filteredOrders.map(order => (
        <div key={order.id} className="border rounded-lg p-4">
          <div className="flex justify-between">
            <div>
              <h3 className="font-medium">{order.travel_packages.title}</h3>
              <div className="text-sm text-gray-500 mt-1 flex space-x-2">
                <MapPin className="h-4 w-4" />
                <span>{order.travel_packages.destination}</span>
              </div>
              <div className="text-sm text-gray-500 flex space-x-2">
                <Clock className="h-4 w-4" />
                <span>{order.travel_packages.duration} 天</span>
              </div>
              <div className="text-sm text-gray-500 flex space-x-2">
                <Calendar className="h-4 w-4" />
                <span>{new Date(order.travel_date).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg text-[#F52E6B] font-semibold">¥{order.travel_packages.price}</div>
              <div className="mt-2">
                {getStatusBadge(order.status)}
              </div>
              <button
                onClick={() => handleExport(order)}
                className="mt-2 flex items-center text-blue-600 hover:text-blue-800 text-sm"
              >
                <Download className="h-4 w-4 mr-1" /> 导出信息
              </button>
            </div>
          </div>

          <div className="mt-4 border-t pt-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-gray-900">联系信息</h4>
            </div>
            <div className="space-y-1 text-sm text-gray-600">
              <p>联系人：{order.contact_name}</p>
              <p>电话：{order.contact_phone}</p>
              <p>下单时间：{new Date(order.created_at).toLocaleString()}</p>
            </div>
          </div>

          {/* Messages */}
          {messages[order.id] && messages[order.id].length > 0 && (
            <div className="mt-4 border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-2">沟通记录</h4>
              <div className="bg-gray-50 p-3 rounded-lg max-h-40 overflow-y-auto">
                {messages[order.id].map((message, index) => (
                  <div key={index} className="text-sm text-gray-600 mb-1">
                    {message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="mt-4 flex space-x-2">
            <input
              type="text"
              value={newMessages[order.id] || ''}
              onChange={(e) => setNewMessages({
                ...newMessages,
                [order.id]: e.target.value
              })}
              placeholder="输入消息..."
              className="flex-1 rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(order.id);
                }
              }}
            />
            <button
              onClick={() => handleSendMessage(order.id)}
              disabled={!newMessages[order.id]?.trim()}
              className="bg-[#F52E6B] text-white px-4 py-2 rounded-lg hover:bg-[#FE6587] transition-colors disabled:opacity-50"
            >
              发送
            </button>
          </div>

          {/* Actions */}
          <div className="mt-4 flex justify-end space-x-2">
            {order.status === 'pending' && (
              <>
                <button
                  onClick={() => handleStatusChange(order.id, 'contacted')}
                  disabled={processingStatus[order.id]}
                  className="px-3 py-1 bg-green-100 text-green-600 rounded hover:bg-green-200 disabled:opacity-50 flex items-center"
                >
                  {processingStatus[order.id] ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-green-600 border-t-transparent mr-1"></div>
                      处理中...
                    </>
                  ) : (
                    '标记已联系'
                  )}
                </button>
                <button
                  onClick={() => handleStatusChange(order.id, 'rejected')}
                  disabled={processingStatus[order.id]}
                  className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 disabled:opacity-50 flex items-center"
                >
                  {processingStatus[order.id] ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-red-600 border-t-transparent mr-1"></div>
                      处理中...
                    </>
                  ) : (
                    '拒绝订单'
                  )}
                </button>
              </>
            )}
            {order.status === 'contacted' && (
              <>
                <button
                  disabled={true}
                  className="px-3 py-1 bg-gray-100 text-gray-400 rounded cursor-not-allowed"
                >
                  标记待联系
                </button>
                <button
                  onClick={() => handlePayInfoFee(order.id)}
                  className={`px-3 py-1 rounded flex items-center ${
                    order.has_paid_info_fee 
                      ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                      : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                  }`}
                >
                  <CreditCard className="h-4 w-4 mr-1" />
                  {order.has_paid_info_fee ? '再次支付信息费' : '待支付信息费'}
                </button>
              </>
            )}
          </div>
        </div>
      ))}

      {/* Reject Order Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">拒绝订单</h2>
            <p className="text-gray-600 mb-4">请输入拒绝理由（2-100字）：</p>
            
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
              rows={4}
              placeholder="请输入拒绝理由..."
            />
            
            <div className="text-right text-sm text-gray-500 mb-4">
              {rejectReason.length}/100
            </div>
            
            <div className="flex justify-end space-x-4">
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
                disabled={rejectReason.length < 2 || rejectReason.length > 100 || (selectedOrderId && processingStatus[selectedOrderId])}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center"
              >
                {selectedOrderId && processingStatus[selectedOrderId] ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    处理中...
                  </>
                ) : (
                  '确认拒绝'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}