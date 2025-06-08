// src/api/authRest.ts (Web/H5 version)

import { createClient } from '@supabase/supabase-js';
import { request } from '../utils/request.web';
import { setItem, removeItem } from '../utils/storage.web';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

// Initialize Supabase client
export const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  }
});

// Save session
const storeSession = async (session: any) => {
  try {
    setItem('supabase_session', session);
  } catch (error) {
    console.error('Error storing session:', error);
  }
};

// Read session
const getStoredSession = async () => {
  try {
    return getItem('supabase_session');
  } catch (error) {
    console.error('Error retrieving session:', error);
    return null;
  }
};

export async function registerWithEmail(email: string, password: string) {
  const { data, error } = await supabaseAuth.signUp({
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
  if (data.session) await storeSession(data.session);
  return data;
}

export async function loginWithEmail(email: string, password: string) {
  const { data, error } = await supabaseAuth.signInWithPassword({ email, password });
  if (error) throw error;
  if (data.session) await storeSession(data.session);
  return data;
}

export async function sendPhoneOTP(phone: string) {
  const formattedPhone = `+86${phone.replace(/\D/g, '')}`;
  const { data, error } = await supabaseAuth.signInWithOtp({ phone: formattedPhone });
  if (error) throw error;
  return data;
}

export async function verifyPhoneOTP(phone: string, token: string) {
  const formattedPhone = `+86${phone.replace(/\D/g, '')}`;
  const { data, error } = await supabaseAuth.verifyOtp({ phone: formattedPhone, token, type: 'sms' });
  if (error) throw error;
  if (data.session) await storeSession(data.session);
  return data;
}

export async function resetPasswordWithEmail(email: string) {
  const { data, error } = await supabaseAuth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  });
  if (error) throw error;
  return data;
}

export async function updatePassword(newPassword: string) {
  const { data, error } = await supabaseAuth.updateUser({ password: newPassword });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabaseAuth.signOut();
  try {
    removeItem('supabase_session');
  } catch (e) {
    console.error('Error removing session:', e);
  }
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data, error } = await supabaseAuth.getUser();
  if (error) throw error;
  return data.user;
}

export async function getSession() {
  const { data, error } = await supabaseAuth.getSession();
  if (error) throw error;
  if (data.session) await storeSession(data.session);
  return data.session;
}

export async function getUserProfile(userId: string, token: string) {
  const url = `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`;
  const res = await request(url, {
    method: 'GET',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  const data = await res.json();
  return data[0];
}

export async function updateUserProfile(userId: string, updates: any, token: string) {
  const url = `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`;
  const res = await request(url, {
    method: 'PATCH',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: updates
  });
  return await res.json();
}

export async function isEmailRegistrationEnabled() {
  const url = `${supabaseUrl}/rest/v1/system_settings?id=eq.1&select=email_registration_enabled`;
  const res = await request(url, {
    method: 'GET',
    headers: {
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json'
    }
  });
  const data = await res.json();
  return data.length > 0 ? data[0].email_registration_enabled ?? true : true;
}

export const authRest = {
  registerWithEmail,
  loginWithEmail,
  sendPhoneOTP,
  verifyPhoneOTP,
  resetPasswordWithEmail,
  updatePassword,
  signOut,
  getCurrentUser,
  getSession,
  getUserProfile,
  updateUserProfile,
  isEmailRegistrationEnabled
};

export default authRest;