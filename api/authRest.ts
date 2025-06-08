export async function registerWithEmail(email: string, password: string) {
  const response = await request({
    url: '/auth/v1/signup',
    method: 'POST',
    data: {
      email,
      password,
      options: {
        emailRedirectTo: '/auth/v1/callback'
      }
    }
  });

  if (response.error) throw response.error;

  if (response.data.session) {
    // 假设 storeSession 函数现在直接使用 request 而不是 supabaseUrl
    // 这里可能需要进一步调整以确保 storeSession 正确工作
  }

  return response.data;
}

// 其他函数的替换...
