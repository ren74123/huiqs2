import request from '@/api/request';

// Login with WeChat
export async function loginWithWeChat(code: string) {
  const { data, error } = await request({
    method: 'POST',
    url: '/auth/wechat',
    data: { code }
  });

  if (error) throw error;
  return data;
}

// Register with email
export async function registerWithEmail(email: string, password: string) {
const { data, error } = await supabaseRequest('POST', 'auth/sign_up', {
  body: {
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin
    }
  }
});

  if (error) throw error;
  return data;
}

// Login with email
export async function loginWithEmail(email: string, password: string) {
const { data, error } = await supabaseRequest('POST', 'auth/sign_in_with_password', {
  body: {
    email,
    password
  }
});

  if (error) throw error;
  return data;
}

// Send OTP to phone
export async function sendPhoneOTP(phone: string) {
  const formattedPhone = `+86${phone.replace(/\D/g, '')}`;
const { data, error } = await supabaseRequest('POST', 'auth/sign_in_with_otp', {
  body: {
    phone: formattedPhone
  }
});

  if (error) throw error;
  return data;
}

// Verify phone OTP
export async function verifyPhoneOTP(phone: string, token: string) {
  const formattedPhone = `+86${phone.replace(/\D/g, '')}`;
const { data, error } = await supabaseRequest('POST', 'auth/verify_otp', {
  body: {
    phone: formattedPhone,
    token,
    type: 'sms'
  }
});

  if (error) throw error;
  return data;
}

// Reset password with email
export async function resetPasswordWithEmail(email: string) {
const { data, error } = await supabaseRequest('POST', 'auth/reset_password_for_email', {
  body: {
    email,
    redirectTo: `${window.location.origin}/reset-password`
  }
});

  if (error) throw error;
  return data;
}

// Update password
export async function updatePassword(newPassword: string) {
const { data, error } = await supabaseRequest('PATCH', 'auth/update_user', {
  body: {
    password: newPassword
  }
});

  if (error) throw error;
  return data;
}

// Sign out
export async function signOut() {
  const { error } = await supabaseRequest('POST', 'auth/sign_out');
  if (error) throw error;
}

// Get current user
export async function getCurrentUser() {
  const { data, error } = await supabaseRequest('GET', 'auth/get_user');
  if (error) throw error;
  return data.user;
}

// Get user profile
export async function getUserProfile(userId: string) {
const { data, error } = await supabaseRequest('GET', `profiles?select=*&id=eq.${userId}`);

  if (error) throw error;
  return data;
}

// Update user profile
export async function updateUserProfile(userId: string, updates: any) {
const { data, error } = await supabaseRequest('PATCH', `profiles?id=eq.${userId}`, updates);

  if (error) throw error;
  return data;
}

// Check if email registration is enabled
export async function isEmailRegistrationEnabled() {
const { data, error } = await supabaseRequest('GET', 'system_settings?select=email_registration_enabled');

  if (error) {
    console.error('Error checking email registration setting:', error);
    return true; // Default to enabled if there's an error
  }

  return data?.email_registration_enabled ?? true;
}