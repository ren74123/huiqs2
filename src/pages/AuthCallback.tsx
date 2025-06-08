import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';

export function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from the URL
        const { data, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (!data.session) {
          throw new Error('No session found');
        }

        // Get user role
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_role')
          .eq('id', data.session.user.id)
          .single();

        // Redirect based on role
        if (profile?.user_role === 'admin') {
          navigate('/admin');
        } else if (profile?.user_role === 'agent') {
          navigate('/profile');
        } else {
          navigate('/');
        }
      } catch (err) {
        console.error('Error handling auth callback:', err);
        setError('Authentication failed. Please try again.');
        setTimeout(() => navigate('/auth'), 2000);
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F52E6B] mx-auto mb-4"></div>
          <p className="text-gray-600">正在登录中，请稍候...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
            {error}
          </div>
          <p className="text-gray-600">正在返回登录页面...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F52E6B] mx-auto mb-4"></div>
        <p className="text-gray-600">登录成功，正在跳转...</p>
      </div>
    </div>
  );
}