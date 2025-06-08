import { supabase } from '../lib/supabase';

// Register with email
export async function registerWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: {
        email_confirmed: true // Add this to bypass email verification
      }
    }
  });

  if (error) throw error;
  return data;
}

// Login with email
export async function loginWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
}

// Send OTP to phone
export async function sendPhoneOTP(phone: string) {
  const formattedPhone = `+86${phone.replace(/\D/g, '')}`;
  const { data, error } = await supabase.auth.signInWithOtp({
    phone: formattedPhone
  });

  if (error) throw error;
  return data;
}

// Verify phone OTP
export async function verifyPhoneOTP(phone: string, token: string) {
  const formattedPhone = `+86${phone.replace(/\D/g, '')}`;
  const { data, error } = await supabase.auth.verifyOtp({
    phone: formattedPhone,
    token,
    type: 'sms'
  });

  if (error) throw error;
  return data;
}

// Reset password with email
export async function resetPasswordWithEmail(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  });

  if (error) throw error;
  return data;
}

// Update password
export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) throw error;
  return data;
}

// Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Get current user
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

// Get user profile
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

// Update user profile
export async function updateUserProfile(userId: string, updates: any) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) throw error;
  return data;
}

// Check if email registration is enabled
export async function isEmailRegistrationEnabled() {
  const { data, error } = await supabase
    .from('system_settings')
    .select('email_registration_enabled')
    .single();

  if (error) {
    console.error('Error checking email registration setting:', error);
    return true; // Default to enabled if there's an error
  }

  return data?.email_registration_enabled ?? true;
}