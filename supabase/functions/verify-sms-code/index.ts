import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phone, token } = await req.json();

    if (!phone || !token) {
      throw new Error('Phone number and token are required');
    }

    const formattedPhone = `+86${phone.replace(/\D/g, '')}`;

    // ✅ Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ✅ Retrieve the stored verification code
    const { data, error: dbError } = await supabaseClient
      .from('sms_verification_codes')
      .select('*')
      .eq('phone', formattedPhone)
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to retrieve verification code');
    }

    if (!data) {
      throw new Error('Verification code not found');
    }

    // ✅ Check if the token matches the stored code
    if (token !== data.code) {
      throw new Error('Invalid verification code');
    }

    // ✅ Sign in the user with OTP
    const { data: authData, error: authError } = await supabaseClient.auth.signInWithOtp({
      phone: formattedPhone,
      token: token,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      },
    });

    if (authError) {
      console.error('Authentication error:', authError);
      throw new Error('Failed to authenticate user');
    }

    return new Response(JSON.stringify({ success: true, data: authData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error verifying SMS code:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: corsHeaders,
      status: 400,
    });
  }
});
