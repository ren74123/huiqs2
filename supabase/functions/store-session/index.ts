import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// JWT 基本校验
function isValidJwt(token: string): boolean {
  return typeof token === "string" && token.startsWith("ey") && token.split(".").length === 3;
}

// Supabase 初始化
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SESSION_EXPIRY_DAYS = 7;

serve(async (req) => {
  const origin = req.headers.get("origin") || "*";
  const corsHeaders = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse(405, "仅允许 POST 请求", corsHeaders);
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return errorResponse(400, "请求格式错误，必须为 application/json", corsHeaders);
    }

    const { session_id, access_token, refresh_token, out_trade_no, trade_status } = await req.json();

    console.log("[store-session] 收到参数:", {
      session_id: session_id?.substring(0, 8) + "...",
      out_trade_no,
      trade_status,
      access_token_length: access_token?.length || 0,
      refresh_token_length: refresh_token?.length || 0,
    });

    // 参数校验
    if (!session_id || !access_token || !refresh_token) {
      return errorResponse(400, "缺少必要参数: session_id, access_token, refresh_token", corsHeaders);
    }

    if (!isValidJwt(access_token)) {
      return errorResponse(400, "access_token 非法（必须为有效 JWT）", corsHeaders);
    }

    if (typeof refresh_token !== "string" || refresh_token.length < 10) {
      return errorResponse(400, "refresh_token 非法或过短", corsHeaders);
    }

    // ✅ 幂等性：查询是否已存在
    const { data: existing, error: existingError } = await supabase
      .from("session_tokens")
      .select("session_id")
      .eq("session_id", session_id)
      .maybeSingle();

    if (existing) {
      console.log("[store-session] session_id 已存在，跳过写入:", session_id);
      return new Response(JSON.stringify({ success: true, message: "session 已存在" }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    const sessionData = {
      session_id,
      access_token,
      refresh_token,
      out_trade_no: out_trade_no || null,
      trade_status: trade_status || "INIT",
      inserted_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + SESSION_EXPIRY_DAYS * 86400000).toISOString(),
    };

    const { error: insertError } = await supabase.from("session_tokens").insert(sessionData);

    if (insertError) {
      return errorResponse(500, "写入失败", corsHeaders, insertError.message);
    }

    console.log("[store-session] ✅ 插入成功:", session_id.substring(0, 8) + "...");
    return new Response(JSON.stringify({
      success: true,
      session_id,
      expires_at: sessionData.expires_at,
    }), { status: 200, headers: corsHeaders });

  } catch (err) {
    return errorResponse(500, "服务器内部错误", corsHeaders, err.message);
  }
});

// 错误响应封装
function errorResponse(
  status: number,
  message: string,
  headers: Record<string, string>,
  details?: any
) {
  console.error(`[store-session] 错误 ${status}: ${message}`, details);
  return new Response(JSON.stringify({ success: false, error: message, details }), {
    status,
    headers,
  });
}
