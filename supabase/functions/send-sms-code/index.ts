import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();

    if (!phone) {
      throw new Error('Phone number is required');
    }

    const formattedPhone = `+86${phone.replace(/\D/g, '')}`;

    // ✅ Tencent Cloud SMS API configuration from environment variables
    const tencentConfig = {
      SDKAppID: Deno.env.get('TENCENT_SMS_SDK_APP_ID')!,
      SecretId: Deno.env.get('TENCENT_SMS_SECRET_ID')!,
      SecretKey: Deno.env.get('TENCENT_SMS_SECRET_KEY')!,
      TemplateId: Deno.env.get('TENCENT_SMS_TEMPLATE_ID')!,
      SignName: Deno.env.get('TENCENT_SMS_SIGN_NAME')!,
    };

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Use Tencent Cloud's official API via POST request
    const smsResponse = await fetch('https://sms.tencentcloudapi.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-TC-Action': 'SendSms',
        'X-TC-Version': '2021-01-11',
        'X-TC-Region': 'ap-guangzhou',
        'X-TC-Timestamp': Math.floor(Date.now() / 1000).toString(),
        'Authorization': '', // ⚠️ 推荐用 SDK 自动生成
      },
      body: JSON.stringify({
        SmsSdkAppId: tencentConfig.SDKAppID,
        SignName: tencentConfig.SignName,
        TemplateId: tencentConfig.TemplateId,
        PhoneNumberSet: [formattedPhone],
        TemplateParamSet: [verificationCode],
      }),
    });

    const smsData = await smsResponse.json();

    if (smsData.Response?.Error) {
      throw new Error(smsData.Response.Error.Message || 'SMS sending failed');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error: dbError } = await supabase
      .from('sms_verification_codes')
      .upsert({
        phone: formattedPhone,
        code: verificationCode,
        created_at: new Date().toISOString(),
      }, { onConflict: 'phone' });

    if (dbError) {
      throw new Error('Database error: ' + dbError.message);
    }

    return new Response(JSON.stringify({ success: true, message: 'SMS sent successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      headers: corsHeaders,
      status: 400,
    });
  }
});