import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { useAuthStore } from '@/store/auth';

export default function AlipayReturn() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const sid = searchParams.get('sid');
    const outTradeNo = searchParams.get('out_trade_no');

    console.log('[回调页面] 从 URL 获取的 sid:', sid);

    async function handleReturn() {
      try {
        if (!sid) throw new Error('缺少 sid 参数');

        // ✅ Step 1: 获取服务端保存的 access_token
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sid })
        });

        const tokenData = await res.json();

        if (!res.ok || !tokenData.access_token) {
          throw new Error(tokenData.error || '登录信息已失效');
        }

        // ✅ Step 2: 使用 access_token 创建临时 Supabase 实例，获取当前用户
        const supabaseWithToken = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          {
            global: {
              headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
              },
            },
          }
        );

        const { data: { user }, error: userError } = await supabaseWithToken.auth.getUser();
        if (userError || !user) throw new Error('用户信息获取失败');

        setUser({ id: user.id, email: user.email });
        console.log('✅ 用户恢复成功:', user.id, user.email);

        // ✅ Step 3: 校验订单状态
        if (!outTradeNo) throw new Error('缺少订单号');

        const verifyRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/query-order-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: outTradeNo })
        });

        const verifyResult = await verifyRes.json();
        if (!verifyRes.ok || verifyResult.status !== 'paid') {
          throw new Error(verifyResult.error || '订单未支付或状态异常');
        }

        // ✅ Step 4: 显示成功信息，倒计时跳转
        setSuccess(true);
        const timer = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              navigate('/user/credits');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

      } catch (err: any) {
        console.error('支付回调处理出错:', err);
        setError(err.message || '未知错误');
      } finally {
        setLoading(false);
      }
    }

    handleReturn();
  }, [location.search, navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-center p-8">
      {loading ? (
        <p className="text-gray-600">⏳ 正在验证支付信息，请稍候...</p>
      ) : error ? (
        <div className="text-red-600">
          <p>❌ 支付失败：</p>
          <p>{error}</p>
          <button onClick={() => navigate('/auth')} className="mt-4 underline text-blue-600">
            返回登录页
          </button>
        </div>
      ) : success ? (
        <div className="text-green-600">
          <p>✅ 支付成功！</p>
          <p>{countdown} 秒后跳转到积分页面...</p>
          <button onClick={() => navigate('/user/credits')} className="mt-4 underline text-blue-600">
            立即跳转
          </button>
        </div>
      ) : null}
    </div>
  );
}
