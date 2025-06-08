import { supabase } from '../lib/supabase';

interface AlipayOrderResponse {
  success: boolean;
  formUrl: string;
  error?: string;
  orderId?: string;
}

interface GenerateAlipayParams {
  outTradeNo: string;
  amount: number;
  productName: string;
  sid: string; // 👈 来自前端唯一生成的 sid
  access_token: string;
  refresh_token: string;
  user_id: string;
  returnUrl?: string;
}

/**
 * 生成支付宝支付跳转参数（构造跳转链接 + 创建订单，不生成 UUID）
 * @param {GenerateAlipayParams} params - 支付参数
 * @returns {Promise<{ formUrl: string, outTradeNo: string, sessionId: string }>}
 */
export async function generateAlipayPostData({
  outTradeNo,
  amount,
  productName,
  sid,
  access_token,
  refresh_token,
  user_id,
  returnUrl,
}: GenerateAlipayParams): Promise<{ formUrl: string; outTradeNo: string; sessionId: string }> {
  if (!amount || typeof amount !== 'number' || amount <= 0) throw new Error('支付金额必须大于0');
  if (!productName || typeof productName !== 'string') throw new Error('商品名称缺失');
  if (!sid || !access_token || !refresh_token || !user_id) throw new Error('支付参数缺失');

  try {
    const supabaseBaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseBaseUrl) throw new Error('缺少 Supabase 基础 URL 配置');

    // ✅ 拼接回调地址
    const finalReturnUrl = `${returnUrl || `${window.location.origin}/alipay/return`}`;

    // ✅ Step 1: 创建支付宝订单（服务端 create-alipay-order 会完成参数拼接）
    const createResp = await fetch(`${supabaseBaseUrl}/functions/v1/create-alipay-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${access_token}`,
      },
      body: JSON.stringify({
        outTradeNo,
        amount: amount.toFixed(2),
        subject: productName,
        sessionId: sid, // 👈 用前端传入的唯一 sid
        returnUrl: finalReturnUrl,
      }),
    });

    if (!createResp.ok) {
      const errorText = await createResp.text();
      console.error('[支付宝] 订单创建失败 HTTP:', createResp.status, errorText);
      throw new Error(`支付服务暂时不可用 (${createResp.status})`);
    }

    const result: AlipayOrderResponse = await createResp.json();
    console.log('[支付宝] 接收到响应:', result);

    if (!result.success || !result.formUrl) {
      throw new Error(result.error || '创建支付宝订单失败');
    }

    return {
      formUrl: result.formUrl,
      outTradeNo,
      sessionId: sid,
    };
  } catch (error) {
    console.error('[支付宝] 订单创建异常:', error);
    const userMessage =
      error instanceof Error
        ? error.message.includes('暂时不可用')
          ? error.message
          : '支付系统繁忙，请稍后再试'
        : '支付过程中发生未知错误';

    throw new Error(userMessage);
  }
}
