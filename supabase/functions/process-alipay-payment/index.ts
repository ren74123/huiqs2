// ✅ supabase/functions/process-alipay-payment/index.ts
// 用于处理支付宝支付回调，更新 orders 表和 session_tokens 表

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ✅ 跨域支持头
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // ✅ Step 1: 解析参数
    const body = await req.json();
    const orderId = body.orderId;
    const alipayTradeNo = body.alipayTradeNo || "manual_process";
    const tradeStatus = body.tradeStatus || "TRADE_SUCCESS";
    const sessionId = body.sessionId; // 可选参数

    console.log("🧾 参数检查：", {
      orderId,
      alipayTradeNo,
      tradeStatus,
      sessionId
    });

    if (!orderId) {
      throw new Error("缺少必要参数: orderId");
    }

    // ✅ Step 2: 鉴权：使用 Bearer Token 恢复用户
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("缺少或格式错误的 Authorization 头");
    }

    const accessToken = authHeader.replace("Bearer ", "").trim();
    const userClient = createClient(SUPABASE_URL, accessToken);
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      throw new Error("Token 无效，无法获取用户信息");
    }

    // ✅ Step 3: 查询订单（orders 表）
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !orderData) {
      throw new Error("未找到订单记录");
    }

    if (orderData.user_id !== user.id) {
      throw new Error("无权限访问此订单");
    }

    // ✅ Step 4: 避免重复处理（幂等）
    if (orderData.payment_status === "paid") {
      return new Response(JSON.stringify({
        success: true,
        message: "订单已支付"
      }), {
        headers: corsHeaders,
        status: 200
      });
    }

    // ✅ Step 5: 更新订单状态为已支付
    const { error: updateOrderError } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        updated_at: new Date().toISOString(),
        order_number: orderData.order_number || alipayTradeNo // 若无则填入
      })
      .eq("id", orderId);

    if (updateOrderError) {
      throw new Error(`订单更新失败: ${updateOrderError.message}`);
    }

    // ✅ Step 6: 更新 session_tokens 表中的交易状态（如传入 sessionId）
    if (sessionId) {
      const { error: sessionUpdateError } = await supabase
        .from("session_tokens")
        .update({
          trade_status: "SUCCESS",
          out_trade_no: orderData.order_number || alipayTradeNo,
          trade_no: alipayTradeNo,
          inserted_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        })
        .eq("session_id", sessionId);

      if (sessionUpdateError) {
        console.warn("⚠️ session_tokens 更新失败:", sessionUpdateError.message);
      } else {
        console.log("✅ session_tokens 更新成功:", sessionId);
      }
    }

    // ✅ Step 7: 返回结果给前端
    const { data: updatedOrder } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    return new Response(JSON.stringify({
      success: true,
      message: "支付成功，订单状态已更新",
      data: {
        order: updatedOrder,
        sessionUpdated: !!sessionId
      }
    }), {
      headers: corsHeaders,
      status: 200
    });

  } catch (err: any) {
    console.error("[process-alipay-payment] ❌ 错误:", err);
    return new Response(JSON.stringify({
      success: false,
      error: err.message || "服务器内部错误"
    }), {
      headers: corsHeaders,
      status: 400
    });
  }
});
