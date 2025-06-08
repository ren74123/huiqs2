import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qzvbtrakodqlsdbzbemp.supabase.co', // 项目 URL（API 设置中查看）
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6dmJ0cmFrb2RxbHNkYnpiZW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzOTQxMDQsImV4cCI6MjA1Nzk3MDEwNH0.LxRnUvWgNEXw6yqTr3SCFi9RzGUcbBjljzPoP15QCIc'         // 管理员密钥（Supabase 设置中 → API → Service Role Key）
);

async function createTestUsers() {
  for (let i = 1; i <= 10; i++) {
    const email = `test${i}@qq.com`;
    const password = '123456';

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      console.error(`❌ ${email} 创建失败:`, error.message);
    } else {
      console.log(`✅ ${email} 创建成功`);
    }
  }
}

createTestUsers();
