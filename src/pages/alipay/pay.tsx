import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, CreditCard, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function AlipayPaymentSimulator() {
  const navigate = useNavigate();
  const location = useLocation();
  const [countdown, setCountdown] = useState(5);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Get query parameters
  const searchParams = new URLSearchParams(location.search);
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');
  const credits = searchParams.get('credits');

  useEffect(() => {
    // Start countdown when success is true
    if (success) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate('/alipay/return?out_trade_no=' + orderId + '&trade_no=sim_' + Date.now() + '&trade_status=TRADE_SUCCESS');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [success, orderId, navigate]);

  const handlePayment = async () => {
    setLoading(true);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Set success state
      setSuccess(true);
    } catch (error) {
      console.error('Error processing payment:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#00A0E9] flex flex-col">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="mr-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">支付宝支付</h1>
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          {!success ? (
            <>
              <div className="text-center mb-8">
                <CreditCard className="h-16 w-16 text-[#00A0E9] mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">确认支付</h2>
                <p className="text-gray-600">
                  {credits && `购买 ${credits} 积分`}
                </p>
                <div className="text-3xl font-bold text-[#00A0E9] mt-4">
                  ¥{amount || '0.00'}
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">订单号：</span>
                  {orderId?.substring(0, 8)}...
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">商品：</span>
                  {credits && `${credits} 积分`}
                </p>
              </div>
              
              <button
                onClick={handlePayment}
                disabled={loading}
                className="w-full bg-[#00A0E9] text-white py-3 rounded-lg font-medium hover:bg-[#0095D9] disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    处理中...
                  </>
                ) : (
                  '确认支付'
                )}
              </button>
              
              <p className="text-center text-sm text-gray-500 mt-4">
                这是一个支付宝支付模拟器，用于演示支付流程
              </p>
            </>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">支付成功</h2>
              <p className="text-gray-600 mb-2">您的积分已添加到账户</p>
              <p className="text-gray-500 mb-6">{countdown} 秒后自动返回</p>
              <button
                onClick={() => navigate('/alipay/return?out_trade_no=' + orderId + '&trade_no=sim_' + Date.now() + '&trade_status=TRADE_SUCCESS')}
                className="bg-[#00A0E9] text-white py-2 px-6 rounded-lg hover:bg-[#0095D9]"
              >
                立即返回
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}