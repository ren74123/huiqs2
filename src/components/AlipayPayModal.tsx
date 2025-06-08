import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, CreditCard } from 'lucide-react';
import { generateAlipayPostData } from '@/utils/alipay';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

interface AlipayPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  productName: string;
  credits: number;
  onSuccess: () => void;
}

export function AlipayPayModal({
  isOpen,
  onClose,
  amount,
  productName,
  credits,
  onSuccess,
}: AlipayPayModalProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [orderId, setOrderId] = useState('');
  const [sid, setSid] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);

  useEffect(() => {
    let intervalId: number | null = null;
    if (orderId && !checkingPayment) {
      setCheckingPayment(true);
      intervalId = window.setInterval(() => {
        checkPaymentStatus();
        clearInterval(intervalId!);
        setCheckingPayment(false);
      }, 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [orderId, checkingPayment]);

  const checkPaymentStatus = async () => {
    try {
      const { data: refreshedData, error: refreshedError } = await supabase.auth.refreshSession();
      if (refreshedError || !refreshedData.session) throw new Error('无法刷新 Supabase 会话');
      setStatus('success');
      setTimeout(() => onSuccess(), 2000);
    } catch (error) {
      setError(error instanceof Error ? error.message : '支付失败，请重试');
      setStatus('error');
    }
  };

  const handleOpenAlipay = async () => {
    if (status === 'loading') return;
    try {
      setStatus('loading');
      setError(null);

      const newOrderId = uuidv4();
      const session_id = uuidv4();
      setOrderId(newOrderId);
      setSid(session_id);

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (!session?.access_token || !session?.refresh_token) {
        throw new Error('获取 Supabase 会话失败，无法生成订单');
      }

      const user = session.user;
      if (!user?.id) throw new Error('用户信息获取失败');

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // ✅ 插入订单记录
      const { error: insertError } = await supabase.from('credit_purchases').insert({
        id: newOrderId,
        user_id: user.id,
        credits,
        amount,
        description: productName,
        payment_status: 'pending',
      });
      if (insertError) throw insertError;

      // ✅ 存储 session 令牌
      const storeRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/store-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          session_id,
          user_id: user.id,
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          out_trade_no: newOrderId,
          trade_status: 'INIT',
          expires_at: expiresAt,
        }),
      });

      if (!storeRes.ok) {
        const errorData = await storeRes.json().catch(() => ({}));
        throw new Error(errorData?.error || '写入 session_tokens 表失败');
      }

      // ✅ 跳转到支付宝页面
      const { formUrl } = await generateAlipayPostData({
        outTradeNo: newOrderId,
        amount,
        productName,
        sid: session_id,
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        user_id: user.id,
      });

      const popup = window.open(formUrl, '_blank');
      if (!popup) throw new Error('浏览器阻止了支付窗口，请允许弹窗');
      setStatus('idle');
    } catch (error) {
      console.error('[handleOpenAlipay] 错误:', error);
      setError(error instanceof Error ? error.message : '跳转失败，请重试');
      setStatus('error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4 p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          disabled={status === 'loading'}
        >
          <X className="h-6 w-6" />
        </button>
        <h2 className="text-xl font-bold text-center mb-4">支付宝支付</h2>
        <div className="bg-gray-50 p-4 rounded mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">商品</span>
            <span className="font-medium">{productName}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-200">
            <span className="text-gray-700 font-medium">支付金额</span>
            <span className="text-xl font-bold text-[#F52E6B]">¥{amount.toFixed(2)}</span>
          </div>
        </div>

        {status === 'loading' ? (
          <div className="text-center py-8">
            <div className="animate-spin h-12 w-12 border-2 border-[#F52E6B] border-t-transparent rounded-full mx-auto" />
            <p className="mt-4 text-gray-600">正在生成支付链接...</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded mb-4 text-sm">
              点击下方按钮跳转到支付宝完成支付
            </div>
            <button
              onClick={handleOpenAlipay}
              disabled={status === 'loading'}
              className="w-full bg-[#1677FF] hover:bg-[#0E5FE3] text-white font-medium py-3 rounded-lg"
            >
              <CreditCard className="inline w-5 h-5 mr-2" />
              前往支付宝支付
            </button>
            {orderId && <p className="text-sm text-gray-500 mt-3">订单号: {orderId.slice(0, 8)}...</p>}
          </div>
        )}

        {status === 'success' && (
          <div className="text-center py-6">
            <div className="bg-green-100 p-4 rounded-full mb-4 inline-block">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">支付成功</h3>
            <p className="text-gray-600 mt-2">积分已到账</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-6">
            <div className="bg-red-100 p-4 rounded-full mb-4 inline-block">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">支付失败</h3>
            <p className="text-gray-600 mt-2">{error || '请重新尝试'}</p>
            <button
              onClick={handleOpenAlipay}
              className="mt-4 px-4 py-2 bg-[#F52E6B] text-white rounded-lg hover:bg-[#FE6587]"
              disabled={status === 'loading'}
            >
              重新支付
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
