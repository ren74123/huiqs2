import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import * as forge from 'npm:node-forge@1.3.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

// Alipay public key for signature verification
// In production, this should be stored securely and not hardcoded
const ALIPAY_PUBLIC_KEY = Deno.env.get('ALIPAY_PUBLIC_KEY');

/**
 * Verify Alipay notification signature
 * @param params Notification parameters
 * @returns Whether the signature is valid
 */
function verifyAlipaySignature(params: Record<string, any>): boolean {
  try {
    // 1. Extract the sign and sign_type
    const sign = params.sign;
    const signType = params.sign_type;
    
    if (!sign || signType !== 'RSA2') {
      console.error('Missing sign or incorrect sign_type');
      return false;
    }
    
    // 2. Create a copy of params without sign and sign_type
    const paramsToVerify = { ...params };
    delete paramsToVerify.sign;
    delete paramsToVerify.sign_type;
    
    // 3. Sort parameters alphabetically
    const sortedKeys = Object.keys(paramsToVerify).sort();
    
    // 4. Create a string to verify
    const stringToVerify = sortedKeys
      .filter(key => paramsToVerify[key] !== undefined && paramsToVerify[key] !== null)
      .map(key => `${key}=${paramsToVerify[key]}`)
      .join('&');
    
    // 5. Verify with Alipay public key
    const publicKeyObj = forge.pki.publicKeyFromPem(ALIPAY_PUBLIC_KEY);
    const md = forge.md.sha256.create();
    md.update(stringToVerify, 'utf8');
    
    return publicKeyObj.verify(md.digest().bytes(), forge.util.decode64(sign));
  } catch (error) {
    console.error('Error verifying Alipay signature:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    // Parse the notification data
    const formData = await req.formData();
    const notification = Object.fromEntries(formData.entries());

    console.log('Received Alipay notification:', notification);

    // Verify the Alipay signature
    const isSignatureValid = verifyAlipaySignature(notification);

    if (!isSignatureValid) {
      console.error('Invalid Alipay signature');
      return new Response('Invalid signature', { status: 400 });
    }

    // Check trade status
    if (notification.trade_status === 'TRADE_SUCCESS') {
      const orderId = notification.out_trade_no;
      const alipayTradeNo = notification.trade_no;

      // Initialize Supabase client
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Get the purchase record
      const { data: purchaseData, error: purchaseError } = await supabaseClient
        .from('credit_purchases')
        .select('*')
        .eq('id', orderId)
        .single();

      if (purchaseError) {
        console.error('Error fetching purchase record:', purchaseError);
        return new Response('Purchase record not found', { status: 404 });
      }

      // Check if payment has already been processed (idempotency)
      if (purchaseData.payment_status === 'completed') {
        console.log('Payment already processed, returning success');
        return new Response('success', { status: 200 });
      }

      // Start a transaction to ensure data consistency
      // Note: Supabase JS client doesn't support transactions directly, so we use RPC
      const { error: transactionError } = await supabaseClient.rpc('process_alipay_payment', {
        p_order_id: orderId,
        p_alipay_trade_no: alipayTradeNo,
        p_user_id: purchaseData.user_id,
        p_credits: purchaseData.credits,
        p_description: purchaseData.description || '支付宝购买积分'
      });

      if (transactionError) {
        console.error('Error processing payment transaction:', transactionError);
        return new Response('Transaction failed', { status: 500 });
      }

      return new Response('success', { status: 200 }); // Alipay requires a 'success' response
    } else {
      console.log('Alipay payment failed with status:', notification.trade_status);
      
      // Update credit_purchases table to mark as failed
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      await supabaseClient
        .from('credit_purchases')
        .update({ payment_status: 'failed' })
        .eq('id', notification.out_trade_no);
        
      return new Response('Payment failed', { status: 400 });
    }
  } catch (error) {
    console.error('Error handling Alipay notification:', error);
    return new Response('Internal server error', { status: 500 });
  }
});