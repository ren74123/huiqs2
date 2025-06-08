// ✅ 最终版完整 Auth 登录注册组件，修复卡片渲染丢失问题，保留旅行者平台 UI
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, KeyRound, AlertCircle, CheckCircle, Lock, User, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';

export default function Auth() {
  const navigate = useNavigate();
  const { signIn } = useAuthStore();
  const [mode, setMode] = useState<'main' | 'phone' | 'email' | 'verify'>('main');
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailRegistrationEnabled, setEmailRegistrationEnabled] = useState(true);
  const [systemSettingsLoading, setSystemSettingsLoading] = useState(true);

  useEffect(() => {
    fetchSystemSettings();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const fetchSystemSettings = async () => {
    try {
      setSystemSettingsLoading(true);
      const { data } = await supabase
        .from('system_settings')
        .select('email_registration_enabled')
        .eq('id', 1)
        .maybeSingle();
      setEmailRegistrationEnabled(data?.email_registration_enabled ?? true);
    } catch {
      setEmailRegistrationEnabled(true);
    } finally {
      setSystemSettingsLoading(false);
    }
  };

  const handleSendCode = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || '发送失败');
      setMode('verify');
      setSuccess('验证码已发送');
      setCountdown(60);
    } catch {
      setError('验证码发送失败');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-sms-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, token: verificationCode }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || '验证失败');
      navigate('/');
    } catch {
      setError('验证码错误');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });
        
        if (error) throw error;
        
        // For email registration, we'll show a success message instead of redirecting
        setSuccess('注册成功！请查看您的邮箱完成验证。如果你没看到邮件，请检查垃圾箱');
        setTimeout(() => {
          setIsRegistering(false);
        }, 3000);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || '邮箱验证失败');
    } finally {
      setLoading(false);
    }
  };

  if (systemSettingsLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#F52E6B] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F52E6B] to-[#FF6B6B] flex flex-col justify-between">
      <div className="text-center text-white pt-40">
        <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-2xl font-bold">旅行者平台</h1>
        <p className="text-sm">探索世界的每一个角落</p>
      </div>

      <div className="bg-white rounded-t-3xl shadow-lg px-6 pt-8 pb-10">
        <div className="max-w-sm mx-auto">
          {error && <div className="text-sm text-red-500 mb-3 flex items-center"><AlertCircle className="w-4 h-4 mr-2" />{error}</div>}
          {success && <div className="text-sm text-green-500 mb-3 flex items-center"><CheckCircle className="w-4 h-4 mr-2" />{success}</div>}

          {mode === 'main' && (
            <div className="space-y-4">
              <button onClick={() => setMode('phone')} className="w-full flex items-center justify-center space-x-3 bg-[#F52E6B] text-white p-3 rounded-lg hover:bg-[#FE6587] transition">
                <Phone className="h-5 w-5" />
                <span>使用手机号登录/注册</span>
              </button>
              {emailRegistrationEnabled && (
                <button onClick={() => setMode('email')} className="w-full flex items-center justify-center space-x-3 bg-white border border-gray-300 p-3 rounded-lg hover:bg-gray-50 transition">
                  <Mail className="h-5 w-5 text-[#F52E6B]" />
                  <span>使用邮箱登录/注册</span>
                </button>
              )}
            </div>
          )}

          {mode === 'phone' && (
            <form onSubmit={(e) => { e.preventDefault(); handleSendCode(); }} className="space-y-4">
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="请输入手机号" className="w-full border rounded-lg p-3" required />
              <button type="submit" className="w-full bg-[#F52E6B] text-white p-3 rounded-lg">{loading ? '发送中...' : '获取验证码'}</button>
              <div className="text-sm flex justify-between">
                <button onClick={() => setMode('main')} className="text-gray-600">返回</button>
                <button onClick={() => navigate('/forgot-password')} className="text-[#F52E6B] hover:underline">忘记密码？</button>
              </div>
            </form>
          )}

         {mode === 'verify' && (
  <form onSubmit={(e) => { e.preventDefault(); handleVerify(); }} className="space-y-4">
    <input
      type="text"
      maxLength={6}
      value={verificationCode}
      onChange={(e) => setVerificationCode(e.target.value)}
      placeholder="请输入验证码"
      className="w-full border rounded-lg p-3"
      required
    />
    <button
      type="submit"
      className="w-full bg-[#F52E6B] text-white p-3 rounded-lg"
      disabled={loading}
    >
      {loading ? '验证中...' : '验证并登录'}
    </button>

    <div className="text-sm flex justify-between items-center">
      <button onClick={() => setMode('phone')} type="button" className="text-gray-600">
        返回
      </button>

      {countdown > 0 ? (
        <span className="text-gray-500">{countdown} 秒后可重新发送</span>
      ) : (
        <button
          type="button"
          onClick={handleSendCode}
          className="text-[#F52E6B] hover:underline"
        >
          重新发送验证码
        </button>
      )}
    </div>
  </form>
)}


          {mode === 'email' && (
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="请输入邮箱" className="w-full border rounded-lg p-3" required />
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="请输入密码" className="w-full border rounded-lg p-3 pr-10" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button type="submit" className="w-full bg-[#F52E6B] text-white p-3 rounded-lg">{loading ? '处理中...' : (isRegistering ? '注册' : '登录')}</button>
              <div className="text-sm flex justify-between">
                <button type="button" onClick={() => setMode('main')} className="text-gray-600">返回</button>
                {isRegistering ? (
                  <button type="button" onClick={() => setIsRegistering(false)} className="text-[#F52E6B] hover:underline">已有账号？登录</button>
                ) : (
                  <>
                    <button type="button" onClick={() => setIsRegistering(true)} className="text-[#F52E6B] hover:underline">没有账号？去注册</button>
                    <button type="button" onClick={() => navigate('/forgot-password')} className="text-[#F52E6B] hover:underline">忘记密码？</button>
                  </>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}