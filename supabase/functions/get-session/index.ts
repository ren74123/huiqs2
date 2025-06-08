// ✅ Supabase Edge Function: get-session.ts（仅依赖 access_token 版）

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return new Response(JSON.stringify({ success: false, error: "Content-Type must be application/json" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const body = await req.json();
    const session_id = body.sid || body.session_id;

    console.log("[get-session] 接收到 sid 参数:", session_id);

    if (!session_id || typeof session_id !== "string" || session_id.length < 8) {
      console.warn("[get-session] 无效的 sid 参数:", session_id);
      return new Response(JSON.stringify({ success: false, error: "Invalid or missing sid" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { data, error } = await supabase
      .from("session_tokens")
      .select("session_id, access_token")
      .eq("session_id", session_id)
      .order("inserted_at", { ascending: false })
      .limit(1)
      .single();

    console.log("[get-session] 查询结果：", JSON.stringify(data, null, 2));

    if (error || !data) {
      console.warn("[get-session] 查无此 session_id", session_id);
      return new Response(JSON.stringify({ success: false, error: "Session not found" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    if (!data.access_token || data.access_token.length < 40) {
      return new Response(JSON.stringify({ success: false, error: "Access token 缺失或无效" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      session_id: data.session_id,
      access_token: data.access_token,
    }), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (err) {
    console.error("[get-session] ❌ 服务器内部错误：", err);
    return new Response(JSON.stringify({ success: false, error: "Internal Server Error", detail: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
