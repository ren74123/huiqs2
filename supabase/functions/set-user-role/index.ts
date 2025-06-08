import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the request is from an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authorization token');
    }

    // Check if the requester is an admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw new Error('Error fetching user profile');
    }

    if (profile.user_role !== 'admin') {
      throw new Error('Only administrators can set user roles');
    }

    // Parse request body
    const { user_id, role } = await req.json();

    if (!user_id || !role) {
      throw new Error('Missing required parameters: user_id and role');
    }

    // Validate role
    const validRoles = ['user', 'agent', 'admin', 'reviewer'];
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    // Update user's app_metadata
    const { data, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      {
        app_metadata: {
          user_role: role
        }
      }
    );

    if (updateError) {
      throw updateError;
    }

    // Also update the user_role in the profiles table
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({ user_role: role })
      .eq('id', user_id);

    if (profileUpdateError) {
      throw profileUpdateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User role updated to ${role}`,
        data
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error setting user role:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An error occurred while setting user role'
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400
      }
    );
  }
});