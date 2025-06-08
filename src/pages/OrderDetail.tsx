import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, User, Phone, Calendar, Clock, MapPin, CreditCard, Image as ImageIcon, X, MessageSquare, Send, Download, FileCheck, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';
import { PageHeader } from '../../components/admin/PageHeader';
import * as JSZip from 'jszip';
import { isValidUUID } from '../../utils/validation';
import { getSignedFile } from '@/utils/file';

interface Order {
  id: string;
  user_id: string;
  package_id: string;
  contact_name: string;
  contact_phone: string;
  id_card: string;
  travel_date: string;
  status: 'pending' | 'contacted' | 'rejected';
  contract_status?: 'pending' | 'confirmed' | 'rejected';
  created_at: string;
  order_number: string;
  travel_packages: {
    id: string;
    title: string;
    price: number;
    destination: string;
    duration: number;
    image: string;
  };
}

interface Message {
  id: string;
  order_id: string;
  from_role: 'user' | 'agent';
  message: string;
  created_at: string;
  read: boolean;
}

export function OrderDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showContractConfirmModal, setShowContractConfirmModal] = useState(false);
  const [showContractRejectModal, setShowContractRejectModal] = useState(false);
  const [contractRejectReason, setContractRejectReason] = useState('');
  const [processingContract, setProcessingContract] = useState(false);
  const [processingStatus, setProcessingStatus] = useState(false);
  const [idCardUrl, setIdCardUrl] = useState<string>('');
  const [licenseUrl, setLicenseUrl] = useState<string>('');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!id || !isValidUUID(id)) {
      navigate('/admin/orders');
      return;
    }
    checkAdminAccess();
    fetchOrderDetails();
    fetchMessages();
  }, [user, id, navigate]);

  async function fetchIdCardSignedUrl(idCardPath: string) {
    const url = await getSignedFile('id-cards', idCardPath);
    setIdCardUrl(url);
  }

  async function fetchLicenseSignedUrl(licensePath: string) {
    const url = await getSignedFile('enterprise_docs', licensePath);
    setLicenseUrl(url);
  }
  
  async function checkAdminAccess() {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_role')
      .eq('id', user?.id)
      .single();

    if (profile?.user_role !== 'admin') {
      navigate('/');
    }
  }

  async function fetchOrderDetails() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          travel_packages (
            id, title, price, destination, duration, image
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      setOrder(data);

      if (data?.id_card) {
        const signedUrl = await getSignedFile('id-cards', data.id_card);
        setIdCardUrl(signedUrl);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMessages() {
    try {
      if (!isValidUUID(id)) {
        throw new Error('Invalid order ID');
      }
      
      const { data, error } = await supabase
        .from('message_logs')
        .select(`
          id,
          order_id,
          from_role,
          message,
          created_at,
          read
        `)
        .eq('order_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      
      // Mark messages as read
      if (data && data.length > 0) {
        const unreadMessages = data.filter(msg => !msg.read && isValidUUID(msg.id)).map(msg => msg.id);
        if (unreadMessages.length > 0) {
          await supabase
            .from('message_logs')
            .update({ read: true })
            .in('id', unreadMessages);
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }

  async function handleStatusChange(newStatus: 'pending' | 'contacted' | 'rejected') {
    if (order?.status === newStatus) {
      return;
    }
    
    if (newStatus === 'rejected') {
      setShowRejectModal(true);
      return;
    }

    setProcessingStatus(true);
    try {
      if (!isValidUUID(id)) {
        throw new Error('Invalid order ID');
      }
      
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      const { data: updatedOrder, error: selectError } = await supabase
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
        .eq('id', id)
        .single();

      if (selectError) throw selectError;

      setOrder(updatedOrder);
      fetchMessages();

    } catch (error) {
      console.error('Error updating order status:', error);
      alert('操作失败，请重试');
    } finally {
      setProcessingStatus(false);
    }
  }

  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) {
      alert('请输入拒绝理由');
      return;
    }

    setProcessingStatus(true);
    try {
      if (!isValidUUID(id)) {
        throw new Error('Invalid order ID');
      }
      
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      const { error: messageError } = await supabase
        .from('message_logs')
        .insert({
          order_id: id,
          from_role: 'agent',
          message: `订单已被拒绝，原因：${rejectReason}`,
          read: false
        });

      if (messageError) throw messageError;

      fetchOrderDetails();
      fetchMessages();
      setShowRejectModal(false);
      setRejectReason('');
    } catch (error) {
      console.error('Error rejecting order:', error);
      alert('操作失败，请重试');
    } finally {
      setProcessingStatus(false);
    }
  };

  const handleContractConfirm = async () => {
    if (!order) return;
    
    setProcessingContract(true);
    
    try {
      if (!isValidUUID(id)) {
        throw new Error('Invalid order ID');
      }
      
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          contract_status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      const { error: messageError } = await supabase
        .from('message_logs')
        .insert({
          order_id: id,
          from_role: 'agent',
          message: `管理员已确认您的线下签约，已奖励200积分`,
          read: false
        });

      if (messageError) throw messageError;

      const { error: creditError } = await supabase.rpc('add_credits', {
        p_user_id: order.user_id,
        p_amount: 200,
        p_remark: '线下签约确认奖励'
      });

      if (creditError) throw creditError;

      fetchOrderDetails();
      fetchMessages();
      setShowContractConfirmModal(false);
    } catch (error) {
      console.error('Error confirming contract:', error);
      alert('操作失败，请重试');
    } finally {
      setProcessingContract(false);
    }
  };

  const handleContractReject = async () => {
    if (!order || !contractRejectReason.trim()) {
      alert('请输入拒绝理由');
      return;
    }
    
    setProcessingContract(true);
    
    try {
      if (!isValidUUID(id)) {
        throw new Error('Invalid order ID');
      }
      
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          contract_status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      const { error: messageError } = await supabase
        .from('message_logs')
        .insert({
          order_id: id,
          from_role: 'agent',
          message: `管理员已拒绝您的线下签约确认，原因：${contractRejectReason}`,
          read: false
        });

      if (messageError) throw messageError;

      fetchOrderDetails();
      fetchMessages();
      setShowContractRejectModal(false);
      setContractRejectReason('');
    } catch (error) {
      console.error('Error rejecting contract:', error);
      alert('操作失败，请重试');
    } finally {
      setProcessingContract(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !isValidUUID(id)) return;

    try {
      const { error } = await supabase
        .from('message_logs')
        .insert({
          order_id: id,
          from_role: 'agent',
          message: newMessage,
          read: false
        });

      if (error) throw error;

      setNewMessage('');
      fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('发送失败，请重试');
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleExport = async () => {
    if (!order) return;

    try {
      const textContent = `订单信息：
订单编号：${order.order_number || order.id}
联系人：${order.contact_name}
联系电话：${order.contact_phone}
出发日期：${new Date(order.travel_date).toLocaleDateString()}
`;

      const textBlob = new Blob([textContent], { type: 'text/plain' });
      const textFile = new File([textBlob], 'order-info.txt', { type: 'text/plain' });

      const zip = new JSZip();
      zip.file('order-info.txt', textFile);

      const { data: urlData, error: urlErr } = await supabase.storage
        .from('id-cards')
        .createSignedUrl(order.id_card!, 60 * 5);

      if (!urlErr && urlData) {
        const resp = await fetch(urlData.signedUrl, { mode: 'cors', credentials: 'omit' });

        if (resp.ok) {
          const blob = await resp.blob();
          const ext = order.id_card!.slice(order.id_card!.lastIndexOf('.'));
          zip.file(`id-card${ext}`, blob);
        } else {
          console.warn('身份证 fetch 失败', resp.status);
          zip.file('id-card-note.txt', '身份证下载失败');
        }
      } else {
        console.warn('签名 URL 获取失败', urlErr);
        zip.file('id-card-note.txt', '身份证无法访问');
      }

      const zipContent = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(zipContent);
      const link = document.createElement('a');
      link.href = zipUrl;
      link.download = `order-${order.order_number || order.id.slice(0, 8)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(zipUrl);
    } catch (error) {
      console.error('Error exporting order:', error);
      alert('导出失败，请重试');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F52E6B]"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">订单不存在</h2>
          <button
            onClick={() => navigate('/admin/orders')}
            className="text-[#F52E6B] hover:text-[#FE6587]"
          >
            返回订单列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <PageHeader 
        title="订单详情"
        subtitle={`订单编号: ${order.order_number || `#${order.id.slice(0, 8)}`}`}
        actions={
          <div className="flex items-center space-x-4">
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 flex items-center space-x-2"
            >
              <Download className="h-5 w-5" />
              <span>导出信息</span>
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Package className="h-5 w-5 text-gray-400 mr-2" />
              套餐信息
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-gray-900">
                    {order.travel_packages.title}
                  </h3>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <MapPin className="h-4 w-4 mr-1" />
                    {order.travel_packages.destination}
                    <span className="mx-2">•</span>
                    <Clock className="h-4 w-4 mr-1" />
                    {order.travel_packages.duration}天
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-[#F52E6B]">
                    ¥{order.travel_packages.price}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 text-gray-400 mr-2" />
              联系信息
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">
                  订单编号
                </label>
                <p className="mt-1">{order.order_number || `#${order.id.slice(0, 8)}`}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">
                  联系人
                </label>
                <p className="mt-1">{order.contact_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">
                  联系电话
                </label>
                <p className="mt-1">{order.contact_phone}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">
                  出发日期
                </label>
                <p className="mt-1">
                  {new Date(order.travel_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">
                  下单时间
                </label>
                <p className="mt-1">
                  {new Date(order.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <CreditCard className="h-5 w-5 text-gray-400 mr-2" />
              身份证照片
            </h2>
            {!imageError ? (
              <div 
                className="relative cursor-pointer"
                onClick={() => setShowImageModal(true)}
              >
                <img
                  src={idCardUrl}
                  alt="身份证"
                  className="w-full h-48 object-cover rounded-lg"
                  onError={handleImageError}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-30 transition-opacity">
                  <ImageIcon className="h-8 w-8 text-white opacity-0 hover:opacity-100" />
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <div className="w-full h-48 flex items-center justify-center border rounded-lg text-gray-400">
                  身份证加载失败
                </div>
              </div>
            )}
          </div>

          {order.status === 'contacted' && order.contract_status === 'pending' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <FileCheck className="h-5 w-5 text-[#F52E6B] mr-2" />
                线下签约确认
              </h2>
              
              <div className="bg-yellow-50 p-4 rounded-lg mb-6">
                <p className="text-yellow-800 font-medium">用户已提交线下签约确认申请</p>
                <p className="text-sm text-yellow-700 mt-2">
                  提示：请与旅行社进行核实，如属实请点击【确认】
                </p>
              </div>
              
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowContractConfirmModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  确认已签约
                </button>
                <button
                  onClick={() => setShowContractRejectModal(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
                >
                  <XCircle className="h-5 w-5 mr-2" />
                  拒绝申请
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 h-[calc(100vh-12rem)] flex flex-col">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <MessageSquare className="h-5 w-5 text-gray-400 mr-2" />
            沟通记录
          </h2>

          <div className="mb-4 flex flex-wrap gap-2">
            {order.status === 'pending' && (
              <button
                onClick={() => handleStatusChange('contacted')}
                disabled={processingStatus}
                className="px-3 py-1 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 disabled:opacity-50 flex items-center"
              >
                {processingStatus ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-green-600 border-t-transparent mr-1"></div>
                    处理中...
                  </>
                ) : (
                  '标记已联系'
                )}
              </button>
            )}
            {order.status === 'pending' && (
              <button
                onClick={() => handleStatusChange('rejected')}
                disabled={processingStatus}
                className="px-3 py-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 disabled:opacity-50 flex items-center"
              >
                {processingStatus ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-red-600 border-t-transparent mr-1"></div>
                    处理中...
                  </>
                ) : (
                  '拒绝订单'
                )}
              </button>
            )}
            {order.status === 'contacted' && (
              <div className="px-3 py-1 bg-green-100 text-green-600 rounded-lg opacity-70 cursor-not-allowed">
                已标记为已联系
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.from_role === 'agent' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div className={`max-w-[80%] ${
                  message.from_role === 'agent'
                    ? 'bg-[#F52E6B] text-white'
                    : 'bg-gray-100 text-gray-800'
                } rounded-lg px-4 py-2`}>
                  <div className="text-sm mb-1">
                    {message.from_role === 'agent' ? '管理员' : '用户'}
                  </div>
                  <p className="text-sm">{message.message}</p>
                  <div className={`text-xs mt-1 ${
                    message.from_role === 'agent'
                      ? 'text-pink-200'
                      : 'text-gray-500'
                  }`}>
                    {new Date(message.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="输入消息..."
                className="flex-1 rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="bg-[#F52E6B] text-white p-2 rounded-lg hover:bg-[#FE6587] transition-colors disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showImageModal && !imageError && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-4xl mx-4">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={idCardUrl}
              alt="身份证"
              className="rounded-lg max-h-[90vh] w-auto"
              onClick={(e) => e.stopPropagation()}
              onError={handleImageError}
            />
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">拒绝订单</h2>
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
                onClick={() => setShowRejectModal(false)}
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

      {showContractConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">确认线下签约</h2>
            
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <p className="text-blue-800 font-medium">确认操作</p>
              <p className="text-sm text-blue-700 mt-2">
                确认后，系统将自动为用户奖励200积分<br />
                请确保已与旅行社核实用户确实已完成线下签约
              </p>
            </div>
            
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowContractConfirmModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleContractConfirm}
                disabled={processingContract}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
              >
                {processingContract ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    处理中...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    确认签约
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showContractRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">拒绝签约确认</h2>
            <p className="text-gray-600 mb-4">请输入拒绝理由：</p>
            
            <textarea
              value={contractRejectReason}
              onChange={(e) => setContractRejectReason(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
              rows={4}
              placeholder="请输入拒绝理由..."
            />
            
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowContractRejectModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleContractReject}
                disabled={!contractRejectReason.trim() || processingContract}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center"
              >
                {processingContract ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    处理中...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    拒绝申请
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Package(props: any) {
  return <div {...props} />;
}