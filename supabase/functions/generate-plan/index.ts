import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const COZE_API_KEY = Deno.env.get('COZE_API_KEY') || '';
const COZE_WORKFLOW_ID = '7491659032533729292';

serve(async (req) => {
  const headers = {
    ...corsHeaders,
    "Content-Type": "application/json"
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  const start = Date.now();

  try {
    if (!COZE_API_KEY) {
      throw new Error("Missing COZE_API_KEY environment variable");
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Invalid authorization token');
    }

    const requestBody = await req.json();
    const { from, to, date, days, preferences } = requestBody;

    if (!from || !to || !date || !days || !preferences || !Array.isArray(preferences)) {
      throw new Error("缺少必需的请求参数");
    }

    // Step 1: 发起 workflow 执行
    const cozeRunRes = await fetch("https://api.coze.cn/v1/workflow/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${COZE_API_KEY}`
      },
      body: JSON.stringify({
        workflow_id: COZE_WORKFLOW_ID,
        parameters: { from, to, date, days, preferences }
      })
    });

    if (!cozeRunRes.ok) {
      const errorText = await cozeRunRes.text();
      throw new Error(`Coze API run failed: ${cozeRunRes.status} - ${errorText}`);
    }

    const runJson = await cozeRunRes.json();
    console.log("🚀 Coze run response:", JSON.stringify(runJson));

    const rawData = runJson.data;
    let planText = '';
    let executeId: string | null = null;

    // 判断是同步返回结果 or 异步 execute_id
    if (typeof rawData === 'string') {
      const parsed = JSON.parse(rawData);
      if (parsed.output && typeof parsed.output === 'string') {
        planText = parsed.output;
      }
    } else if (typeof rawData === 'object' && rawData.execute_id) {
      executeId = rawData.execute_id;
    }

    // 如果是同步返回，直接返回 planText
    if (planText) {
      console.log("✅ 同步获取 planText 成功:", planText.substring(0, 100));
      return new Response(JSON.stringify({ planText }), { headers });
    }

    // 否则进入轮询模式
    if (!executeId) {
      throw new Error("无法从 Coze 响应中获取 execute_id，也未直接返回 output");
    }

    console.log("⏳ Coze execute_id =", executeId);

    // Step 2: 轮询获取执行状态
    let retries = 0;
    const maxRetries = 70;
    const retryDelay = 1000; // 1s

    while (retries < maxRetries) {
      await new Promise(res => setTimeout(res, retryDelay));
      retries++;

      const statusRes = await fetch(`https://api.coze.cn/v1/workflow/status?execute_id=${executeId}`, {
        headers: { "Authorization": `Bearer ${COZE_API_KEY}` }
      });

      if (!statusRes.ok) continue;

      const statusJson = await statusRes.json();
      console.log(`🔁 第 ${retries} 次轮询：`, JSON.stringify(statusJson));

      if (statusJson.code !== 0) continue;

      const status = statusJson.data?.status;

      if (status === 'success') {
        planText = statusJson.data?.outputs?.planText;
        if (!planText) {
          throw new Error("成功状态但未返回计划内容");
        }
        break;
      }

      if (status === 'failed') {
        throw new Error("Coze workflow 执行失败");
      }
    }

    if (!planText) {
      throw new Error(`计划生成超时（尝试 ${maxRetries} 次）`);
    }

    console.log("✅ 异步获取 planText 成功:", planText.substring(0, 100));

    return new Response(JSON.stringify({ planText }), { headers });

  } catch (error) {
    console.error("❌ 生成失败:", error);
    const errorMessage = error instanceof Error ? error.message : "生成计划失败";
    return new Response(JSON.stringify({
      error: errorMessage,
      planText: `生成行程时出现错误: ${errorMessage}`
    }), {
      headers,
      status: 400
    });
  }
});
