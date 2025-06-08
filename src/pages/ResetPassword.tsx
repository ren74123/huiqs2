// src/pages/ResetPassword.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setConfirmed(true);
      }
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  const handleReset = async () => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      alert('密码重置成功，请重新登录');
      navigate('/auth');
    }
  };

  if (!confirmed) {
    return <div className="p-4 text-gray-500">正在验证您的链接...</div>;
  }

  return (
    <div className="p-6 max-w-sm mx-auto">
      <h2 className="text-xl font-bold mb-4">设置新密码</h2>
      <input
        type="password"
        placeholder="请输入新密码"
        className="w-full border p-2 mb-4"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        onClick={handleReset}
        className="w-full bg-[#F52E6B] text-white p-2 rounded"
      >
        重置密码
      </button>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
