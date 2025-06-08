import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function DebugTokenPage() {
  useEffect(() => {
    (async () => {
      try {
        // ✅ 获取当前 Supabase 会话（不刷新）
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();

        if (sessionErr || !sessionData.session) {
          console.error('❌ getSession 获取失败:', sessionErr?.message);
          return;
        }

        const session = sessionData.session;
        const user = session.user;

        console.log('✅ 当前用户:', user?.id, user?.email);
        console.log('✅ access_token:', session.access_token);
        console.log('✅ refresh_token:', session.refresh_token);

        // ✅ 可选：判断 refresh_token 是否像一个真正的 JWT
        const isValidJwt = (token: string | null | undefined) =>
          typeof token === 'string' && token.includes('.') && token.split('.').length === 3;

        if (!isValidJwt(session.refresh_token)) {
          console.warn('⚠️ refresh_token 看起来不是合法 JWT，但 Supabase 仍可能支持');
        }
      } catch (e) {
        console.error('❌ 异常错误:', e);
      }
    })();
  }, []);

  return (
    <div className="p-8 text-center text-sm text-gray-700">
      ✅ 控制台已输出当前登录用户的 access_token 和 refresh_token，请按 F12 打开控制台查看。
    </div>
  );
}
