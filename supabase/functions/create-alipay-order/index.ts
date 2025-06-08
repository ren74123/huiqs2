import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import forge from "npm:node-forge@1.3.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALIPAY_CONFIG = {
  APP_ID: Deno.env.get("ALIPAY_APP_ID")!,
  GATEWAY: Deno.env.get("ALIPAY_GATEWAY") || "https://openapi.alipay.com/gateway.do",
  NOTIFY_URL: Deno.env.get("ALIPAY_NOTIFY_URL")!,
  RETURN_URL: Deno.env.get("ALIPAY_RETURN_URL")!,
  PRIVATE_KEY: (() => {
    const b64 = Deno.env.get("ALIPAY_PRIVATE_KEY_B64");
    if (!b64) throw new Error("ALIPAY_PRIVATE_KEY_B64 not set");
    const decoded = forge.util.decode64(b64).replace(/\\n/g, "\n").trim();
    if (!decoded.includes("PRIVATE KEY")) throw new Error("Invalid private key format");
    return decoded;
  })(),
};

function getTimestamp(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ` +
    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
}

function generateSignature(params: Record<string, string>): string {
  const sortedKeys = Object.keys(params).sort();
  const signStr = sortedKeys
    .filter((key) => key !== 'sign' && params[key] !== undefined && params[key] !== '')
    .map(key => `${key}=${params[key]}`)
    .join("&");

  const md = forge.md.sha256.create();
  md.update(signStr, "utf8");
  const privateKey = forge.pki.privateKeyFromPem(ALIPAY_CONFIG.PRIVATE_KEY);
  return forge.util.encode64(privateKey.sign(md));
}

function toQueryString(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map(key => `${key}=${encodeURIComponent(params[key])}`)
    .join("&");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // ✅ 检查请求体格式
    if (!req.headers.get("content-type")?.includes("application/json")) {
      return new Response(JSON.stringify({ success: false, error: "请求体必须为 JSON 格式" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // ✅ 解析请求体
    const body = await req.json();
    const { outTradeNo, amount, subject, returnUrl, sessionId } = body;

    if (!outTradeNo || !amount || !subject || !sessionId) {
      return new Response(JSON.stringify({ success: false, error: "缺少必要参数" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // ✅ 构造支付宝 biz_content
    const bizContent = JSON.stringify({
      out_trade_no: outTradeNo,
      product_code: "FAST_INSTANT_TRADE_PAY",
      total_amount: parseFloat(amount).toFixed(2),
      subject,
      body: subject,
      timeout_express: "15m"
    });

    // ✅ 构造支付宝参数
    const alipayParams: Record<string, string> = {
      app_id: ALIPAY_CONFIG.APP_ID,
      method: "alipay.trade.page.pay",
      format: "JSON",
      charset: "utf-8",
      sign_type: "RSA2",
      timestamp: getTimestamp(),
      version: "1.0",
      notify_url: ALIPAY_CONFIG.NOTIFY_URL,
      return_url: `${returnUrl || ALIPAY_CONFIG.RETURN_URL}?sid=${sessionId}&out_trade_no=${outTradeNo}`,
      biz_content: bizContent
    };

    // ✅ 生成签名并拼接跳转链接
    const sign = generateSignature(alipayParams);
    const finalUrl = `${ALIPAY_CONFIG.GATEWAY}?${toQueryString({ ...alipayParams, sign })}`;

    // ✅ 返回跳转地址
    return new Response(JSON.stringify({ success: true, formUrl: finalUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e) {
    console.error("[create-alipay-order] 错误:", e);

    return new Response(JSON.stringify({
      success: false,
      error: e.message || "服务器内部错误",
      stack: e.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
