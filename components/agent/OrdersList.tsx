import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Clock, Download, CreditCard } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import JSZip from 'jszip';
import { isValidUUID } from '@/utils/validation';

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

export function OrdersList() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [messages, setMessages] = useState<Record<string, string[]>>({});
  const [newMessages, setNewMessages] = useState<Record<string, string>>({});
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingStatus, setProcessingStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  // 拉取订单列表
  async function fetchOrders() {
    try {
      const { data, error } = await supabase
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

      if (error) throw error;
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

      // 如果有身份证路径，则生成签名 URL 并 fetch
const { data: urlData, error: urlErr } = await supabase.storage
  .from('id-cards')
  .createSignedUrl(order.id_card, 60 * 5); // 有效 5 分钟

if (urlErr || !urlData) {
  console.warn('签名 URL 获取失败', urlErr);
  zip.file('id-card-note.txt', '身份证照片无法访问');
} else {
  // 2️⃣ 用 fetch() 拉取真正的图片二进制
  const resp = await fetch(urlData.signedUrl);
  if (resp.ok) {
    const blob = await resp.blob();
    zip.file('id-card.jpg', blob);
  } else {
    console.warn('fetch 签名 URL 失败', resp.statusText);
    zip.file('id-card-note.txt', '身份证照片下载失败');
  }
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

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin h-8 w-8 border-2 border-[#F52E6B] border-t-transparent rounded-full"></div></div>;
  }

  if (!orders.length) {
    return <div className="text-center py-12 text-gray-500">暂无订单</div>;
  }

  return (
    <div className="space-y-4">
      {orders.map(order => (
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
              <button
                onClick={() => handleExport(order)}
                className="mt-2 flex items-center text-blue-600 hover:text-blue-800 text-sm"
              >
                <Download className="h-4 w-4 mr-1" /> 导出信息
              </button>
            </div>
          </div>
          {/* ... 消息列表、操作按钮 Gist same as before ... */}
        </div>
      ))}
    </div>
  );
}
