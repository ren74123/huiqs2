// @ts-ignore
import { serve } from "https://deno.land/std/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js";

// 使用全局对象和类型保护
const getEnv = (key: string): string => {
  // @ts-ignore
  const value = typeof Deno !== 'undefined' && Deno.env ? Deno.env.get(key) : null;
  if (value) return value;

  console.warn(`环境变量 ${key} 未找到`);
  throw new Error(`缺少必要的环境配置：${key}`);
};

const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseServiceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  // 获取 URL 参数
  const url = new URL(req.url);
  const orderId = url.searchParams.get('out_trade_no');
  const tradeNo = url.searchParams.get('trade_no');
  const tradeStatus = url.searchParams.get('trade_status');
  const sid = url.searchParams.get('sid');

  // 验证必要参数
  if (!orderId || !tradeNo || !tradeStatus) {
    console.error('缺少必要的支付参数');
    return new Response(JSON.stringify({ 
      error: '支付参数不完整',
      code: 'INVALID_PARAMS' 
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    // 更新 session_tokens 表
    const { error: updateError } = await supabase
      .from('session_tokens')
      .update({ 
        trade_status: tradeStatus,
        out_trade_no: orderId,
        trade_no: tradeNo,
        updated_at: new Date().toISOString()
      })
      .eq('session_id', sid);

    if (updateError) {
      console.error('更新 session_tokens 失败:', updateError);
    }

    // HTML 模板，根据支付状态展示不同信息
    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>支付结果</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          background-color: #f5f5f5;
        }
        .container {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          padding: 2rem;
          text-align: center;
          max-width: 90%;
          width: 400px;
        }
        .success-icon {
          color: #52c41a;
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        .error-icon {
          color: #f5222d;
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        .title {
          font-size: 1.5rem;
          margin-bottom: 1rem;
          color: #333;
        }
        .message {
          color: #666;
          margin-bottom: 2rem;
        }
        .button {
          background-color: #F52E6B;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
          transition: background-color 0.3s;
        }
        .button:hover {
          background-color: #FE6587;
        }
      </style>
    </head>
    <body>
      <div class="container">
        ${tradeStatus === 'TRADE_SUCCESS' 
          ? `
            <div class="success-icon">✓</div>
            <h1 class="title">支付成功</h1>
            <p class="message">您的积分已添加到账户</p>
            <p class="message">订单号: ${orderId}</p>
          ` 
          : `
            <div class="error-icon">✗</div>
            <h1 class="title">支付失败</h1>
            <p class="message">请重新尝试支付</p>
            <p class="message">订单号: ${orderId}</p>
          `}
        <button class="button" onclick="window.location.href='/'">返回首页</button>
      </div>
      <script>
        // Redirect to the profile page after 3 seconds
        setTimeout(() => {
          window.location.href = '/profile?tab=credits';
        }, 3000);
      </script>
    </body>
    </html>
    `;

    return new Response(htmlTemplate, {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "text/html" 
      },
      status: 200
    });

  } catch (error) {
    console.error('支付回调处理错误:', error);
    return new Response(JSON.stringify({ 
      error: '支付回调处理失败',
      code: 'CALLBACK_PROCESS_ERROR',
      details: error instanceof Error ? error.message : '未知错误'
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
