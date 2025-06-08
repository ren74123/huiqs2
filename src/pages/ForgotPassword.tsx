import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, ArrowLeft, KeyRound, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function ForgotPassword() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'phone' | 'email'>('phone'); // Default to phone
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailRegistrationEnabled, setEmailRegistrationEnabled] = useState(true);

  useEffect(() => {
    // Check if email registration is enabled
    fetchSystemSettings();
  }, []);

  const fetchSystemSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('email_registration_enabled')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching system settings:', error);
        return;
      }

      // If no data is returned, default to true
      setEmailRegistrationEnabled(data?.email_registration_enabled ?? true);
    } catch (error) {
      console.error('Error fetching system settings:', error);
      // Default to true if there's an error
      setEmailRegistrationEnabled(true);
    }
  };

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (mode === 'email') {
        // Send password reset email
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) throw error;
        setSuccess('重置密码链接已发送到您的邮箱，请查收');
      } else {
        // Send OTP to phone
        const formattedPhone = `+86${phone.replace(/\D/g, '')}`;
        const { error } = await supabase.auth.signInWithOtp({
          phone: formattedPhone,
        });

        if (error) throw error;
        setStep('verify');
        startCountdown();
        setSuccess('验证码已发送到您的手机，请查收');
      }
    } catch (error: any) {
      console.error('Error sending code:', error);
      setError('发送失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('密码长度不能少于6个字符');
      setLoading(false);
      return;
    }

    try {
      // Verify OTP
      const formattedPhone = `+86${phone.replace(/\D/g, '')}`;
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: verificationCode,
        type: 'sms',
      });

      if (verifyError) throw verifyError;

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setSuccess('密码重置成功，请使用新密码登录');
      setTimeout(() => {
        navigate('/auth');
      }, 2000);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      setError('重置密码失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Banner/Logo Section */}
      <div className="bg-gradient-to-r from-[#F52E6B] to-[#FF6B6B] h-40 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-2">
            <Lock className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-xl font-bold">忘记密码</h1>
          <p className="text-sm opacity-80">重置您的账户密码</p>
        </div>
      </div>

      <div className="px-4 py-6 -mt-6 relative">
        <div className="bg-white rounded-t-3xl shadow-lg px-6 pt-8 pb-10">
          <div className="max-w-sm mx-auto">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
                <span>{success}</span>
              </div>
            )}

            <div className="flex border-b border-gray-200 mb-6">
              <button
                onClick={() => {
                  setMode('phone');
                  setStep('request');
                  setError('');
                }}
                className={`flex-1 py-3 font-medium ${
                  mode === 'phone'
                    ? 'text-[#F52E6B] border-b-2 border-[#F52E6B]'
                    : 'text-gray-500'
                }`}
              >
                手机号找回
              </button>
              
              {emailRegistrationEnabled && (
                <button
                  onClick={() => {
                    setMode('email');
                    setStep('request');
                    setError('');
                  }}
                  className={`flex-1 py-3 font-medium ${
                    mode === 'email'
                      ? 'text-[#F52E6B] border-b-2 border-[#F52E6B]'
                      : 'text-gray-500'
                  }`}
                >
                  邮箱找回
                </button>
              )}
            </div>

            {mode === 'email' ? (
              <form onSubmit={handleSendCode} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    邮箱
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                      placeholder="请输入注册邮箱"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#F52E6B] text-white py-3 rounded-lg font-medium hover:bg-[#FE6587] disabled:opacity-50"
                >
                  {loading ? '发送中...' : '发送重置链接'}
                </button>
                
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => navigate('/auth')}
                    className="text-[#F52E6B] hover:underline"
                  >
                    返回登录
                  </button>
                </div>
              </form>
            ) : step === 'request' ? (
              <form onSubmit={handleSendCode} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    手机号
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10 w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                      placeholder="请输入注册手机号"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#F52E6B] text-white py-3 rounded-lg font-medium hover:bg-[#FE6587] disabled:opacity-50"
                >
                  {loading ? '发送中...' : '获取验证码'}
                </button>
                
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => navigate('/auth')}
                    className="text-[#F52E6B] hover:underline"
                  >
                    返回登录
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    验证码
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="pl-10 w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                      placeholder="请输入验证码"
                      required
                    />
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-sm text-gray-500">
                      验证码已发送至 {phone}
                    </p>
                    {countdown > 0 ? (
                      <span className="text-sm text-gray-500">{countdown}秒后可重新发送</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendCode}
                        className="text-sm text-[#F52E6B]"
                      >
                        重新发送
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    新密码
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 pr-10 w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                      placeholder="请输入新密码"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    >
                      {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">密码长度不能少于6个字符</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    确认密码
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10 w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                      placeholder="请再次输入新密码"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#F52E6B] text-white py-3 rounded-lg font-medium hover:bg-[#FE6587] disabled:opacity-50"
                >
                  {loading ? '重置中...' : '重置密码'}
                </button>
                
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setStep('request')}
                    className="text-[#F52E6B] hover:underline"
                  >
                    返回上一步
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}