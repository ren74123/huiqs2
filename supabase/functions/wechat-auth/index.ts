import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
const COZE_API_KEY = Deno.env.get('COZE_API_KEY') || '';
const COZE_WORKFLOW_ID = '7491659032533729292';
serve(async (req)=>{
  const headers = {
    ...corsHeaders,
    "Content-Type": "application/json"
  };
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers
    });
  }
  const start = Date.now();
  try {
    if (!COZE_API_KEY) {
      throw new Error("Missing COZE_API_KEY environment variable");
    }
    const requestBody = await req.json();
    const { from, to, date, days, preferences } = requestBody;
    if (!from || !to || !date || !days || !preferences || !Array.isArray(preferences)) {
      throw new Error("缺少必需的请求参数");
    }
    const cozeResponse = await fetch("https://api.coze.cn/v1/workflow/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${COZE_API_KEY}`
      },
      body: JSON.stringify({
        workflow_id: COZE_WORKFLOW_ID,
        parameters: {
          from,
          to,
          date,
          days,
          preferences
        }
      })
    });
    if (!cozeResponse.ok) {
      throw new Error(`Coze API returned status ${cozeResponse.status}`);
    }
    const responseText = await cozeResponse.text();
    console.log("📦 Raw Coze API response:", responseText); // 可选，便于调试
    let cozeData;
    try {
      cozeData = JSON.parse(responseText);
    } catch (err) {
      throw new Error("响应不是合法 JSON，可能是工作流异常或系统错误：" + responseText);
    }
    if (!cozeData.data) {
      throw new Error("No data field in Coze API response");
    }
    let parsedData;
    try {
      parsedData = JSON.parse(cozeData.data);
    } catch (err) {
      console.error("Failed to parse Coze data:", cozeData.data);
      throw new Error("Invalid JSON in Coze data field");
    }
    const planText = parsedData.output || "AI未能生成有效的行程计划";
    console.log(`✅ Coze请求总耗时：${Date.now() - start}ms`);
    return new Response(JSON.stringify({
      planText
    }), {
      headers
    });
  } catch (error) {
    console.error("❌ Error generating plan:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "生成计划失败，请稍后重试",
      planText: "生成行程时出现错误，请重试"
    }), {
      headers,
      status: 400
    });
  }
});
