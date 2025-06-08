import React, { useState, useEffect } from 'react';
import { Coins, AlertCircle, CheckCircle, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';
import { WechatPayModal } from '../../components/WechatPayModal';
import { isValidUUID } from '../../utils/validation';

interface Order {
  id: string;
  package_id: string;
  contact_name: string;
  contact_phone: string;
  travel_date: string;
  status: string;
  has_paid_info_fee: boolean;
  order_number: string;
  travel_packages: {
    id: string;
    title: string;
    price: number;
    destination: string;
  };
}

interface InfoFeePaymentFormProps {
  orderId: string | null;
  onSuccess?: () => void;
  className?: string;
}

export function InfoFeePaymentForm({ orderId, onSuccess, className = '' }: InfoFeePaymentFormProps) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [showPayModal, setShowPayModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);

  useEffect(() => {
    if (user && orderId && isValidUUID(orderId)) {
      fetchOrderDetails();
      fetchPaymentHistory();
    } else {
      setLoading(false);
    }
  }, [user, orderId]);

  async function fetchOrderDetails() {
    try {
      if (!orderId || !isValidUUID(orderId)) {
        throw new Error('Invalid order ID');
      }
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          travel_packages (
            id,
            title,
            price,
            destination
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      
      // Verify this order belongs to the current agent
      const { data: packageData, error: packageError } = await supabase
        .from('travel_packages')
        .select('agent_id')
        .eq('id', data.package_id)
        .single();
        
      if (packageError) throw packageError;
      
      if (packageData.agent_id !== user?.id) {
        throw new Error('您无权访问此订单');
      }
      
      setOrder(data);
      
      // Set default amount based on package price
      if (data.travel_packages?.price) {
        // Default to 5% of package price
        const defaultAmount = Math.round(data.travel_packages.price * 0.05 * 100) / 100;
        setAmount(defaultAmount.toString());
      }
    } catch (error: any) {
      console.error('Error fetching order details:', error);
      setError(error.message || '获取订单详情失败');
    } finally {
      setLoading(false);
    }
  }

  async function fetchPaymentHistory() {
    try {
      if (!orderId || !isValidUUID(orderId)) return;
      
      const { data, error } = await supabase
        .from('info_fee_logs')
        .select('*')
        .eq('order_id', orderId)
        .eq('agent_id', user?.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setPaymentHistory(data || []);
    } catch (error) {
      console.error('Error fetching payment history:', error);
    }
  }

  const handlePayment = () => {
    // Validate amount
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('请输入有效的金额');
      return;
    }
    
    if (numAmount < 1) {
      setError('最小支付金额为1元');
      return;
    }
    
    if (numAmount > 10000) {
      setError('最大支付金额为10000元');
      return;
    }
    
    setError(null);
    setShowPayModal(true);
  };

  const handlePaymentSuccess = async () => {
    if (!order || !user) return;
    
    setSubmitting(true);
    try {
      // Record the payment
      const { error: logError } = await supabase
        .from('info_fee_logs')
        .insert({
          order_id: order.id,
          agent_id: user.id,
          amount: parseFloat(amount),
          remark: '信息费'
        });
        
      if (logError) throw logError;
      
      // Update order status
      const { error: orderError } = await supabase
        .from('orders')
        .update({ has_paid_info_fee: true })
        .eq('id', order.id);
        
      if (orderError) throw orderError;
      
      // Show success message
      setSuccess('信息费支付成功！');
      
      // Refresh payment history
      fetchPaymentHistory();
      
      // Close modal
      setShowPayModal(false);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error recording payment:', error);
      setError(error.message || '支付记录失败');
      setShowPayModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex justify-center items-center py-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#F52E6B] border-t-transparent"></div>
      </div>
    );
  }

  if (!orderId || !isValidUUID(orderId)) {
    return (
      <div className={`bg-yellow-50 p-4 rounded-lg ${className}`}>
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
          <p className="text-yellow-700">请从订单管理页面选择需要支付信息费的订单</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
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

      {order ? (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Order Info */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4">订单信息</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">订单编号</p>
                <p className="font-medium">{order.order_number || '未生成'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">联系人</p>
                <p className="font-medium">{order.contact_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">联系电话</p>
                <p className="font-medium">{order.contact_phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">出发日期</p>
                <p className="font-medium">{new Date(order.travel_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">套餐价格</p>
                <p className="font-medium text-[#F52E6B]">¥{order.travel_packages?.price}</p>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="p-6">
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <div className="flex items-start">
                <Coins className="h-5 w-5 text-blue-500 mt-0.5 mr-2" />
                <div>
                  <h3 className="font-medium text-blue-700">信息费说明</h3>
                  <p className="mt-1 text-sm text-blue-600">
                    根据平台规定，旅行社需要为已联系的订单支付信息服务费。
                    建议金额为订单金额的5%，您也可以根据实际情况自行调整。
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  信息费金额（元）*
                </label>
                <div className="relative">
                  <Coins className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-10 w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                    placeholder="请输入金额"
                    min="1"
                    max="10000"
                    step="0.01"
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  建议金额：¥{(order.travel_packages?.price * 0.05).toFixed(2)}（套餐价格的5%）
                </p>
              </div>

              <button
                onClick={handlePayment}
                disabled={submitting}
                className="w-full bg-[#F52E6B] text-white py-3 rounded-lg font-medium hover:bg-[#FE6587] disabled:opacity-50 flex items-center justify-center"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    处理中...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5 mr-2" />
                    支付信息费
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Payment History */}
          {paymentHistory.length > 0 && (
            <div className="p-6 border-t border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 mb-4">支付记录</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        支付时间
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        金额
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        备注
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paymentHistory.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(payment.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#F52E6B]">
                          ¥{payment.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.remark}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">订单不存在</h2>
          <p className="text-gray-600 mb-4">无法找到指定的订单信息</p>
        </div>
      )}

      {/* Payment Modal */}
      {showPayModal && (
        <WechatPayModal
          isOpen={showPayModal}
          onClose={() => setShowPayModal(false)}
          amount={parseFloat(amount)}
          productName={`订单信息费 - ${order?.order_number || ''}`}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}