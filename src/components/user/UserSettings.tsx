import React, { useState, useEffect } from 'react';
import { User, Phone, LogOut, Lock, Mail, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';
import { useNavigate, Link } from 'react-router-dom';

const MAX_NICKNAME_CHANGES = 5;
const NICKNAME_CHANGE_INTERVAL = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

export function UserSettings() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    full_name: '',
    phone: '',
    email: '',
    user_role: 'user' as 'user' | 'agent' | 'admin',
    nickname_changes: [] as { timestamp: number }[]
  });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  async function fetchProfile() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone, user_role, nickname_changes, email')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      if (data) {
        setProfile({
          full_name: data.full_name || '',
          phone: data.phone || '',
          email: user?.email || '',
          user_role: data.user_role,
          nickname_changes: data.nickname_changes || []
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }

  const canChangeNickname = () => {
    const now = Date.now();
    const recentChanges = profile.nickname_changes.filter(
      change => now - change.timestamp < NICKNAME_CHANGE_INTERVAL
    );
    return recentChanges.length < MAX_NICKNAME_CHANGES;
  };

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewNickname(e.target.value);
  };

  const handleConfirmNickname = async () => {
    if (!canChangeNickname()) {
      setError('您已达到本月昵称修改次数上限，请30天后再试');
      return;
    }

    if (!newNickname.trim()) {
      setError('昵称不能为空');
      return;
    }

    if (newNickname.length > 20) {
      setError('昵称不能超过20个字符');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const now = Date.now();
      const updatedChanges = [...profile.nickname_changes, { timestamp: now }];

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: newNickname,
          nickname_changes: updatedChanges
        })
        .eq('id', user?.id);

      if (error) throw error;

      setProfile(prev => ({
        ...prev,
        full_name: newNickname,
        nickname_changes: updatedChanges
      }));
      setShowConfirmation(false);
      setNewNickname('');
    } catch (error) {
      console.error('Error updating nickname:', error);
      setError('修改失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  async function handleSignOut() {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">账号设置</h2>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            昵称 {!canChangeNickname() && '(已达到本月修改次数上限)'}
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            {showConfirmation ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newNickname}
                  onChange={handleNicknameChange}
                  className="pl-10 w-full rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                  placeholder="输入新昵称"
                  maxLength={20}
                />
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowConfirmation(false);
                      setError('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmNickname}
                    disabled={loading || !newNickname || !canChangeNickname()}
                    className="flex-1 bg-[#F52E6B] text-white py-2 px-4 rounded-lg hover:bg-[#FE6587] disabled:opacity-50"
                  >
                    确认修改
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={profile.full_name}
                  disabled
                  className="pl-10 flex-1 rounded-lg border border-gray-300 py-2 px-3 bg-gray-50"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmation(true);
                    setNewNickname(profile.full_name);
                    setError('');
                  }}
                  disabled={!canChangeNickname()}
                  className="bg-[#F52E6B] text-white py-2 px-4 rounded-lg hover:bg-[#FE6587] disabled:opacity-50"
                >
                  修改昵称
                </button>
              </div>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            每30天内最多可修改{MAX_NICKNAME_CHANGES}次昵称
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            手机号
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              value={profile.phone}
              disabled
              className="pl-10 w-full rounded-lg border border-gray-300 py-2 px-3 bg-gray-50 text-gray-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            邮箱
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              value={profile.email}
              disabled
              className="pl-10 w-full rounded-lg border border-gray-300 py-2 px-3 bg-gray-50 text-gray-500"
            />
          </div>
        </div>

        <Link
          to="/change-password"
          className="flex items-center justify-center space-x-2 w-full border border-[#F52E6B] text-[#F52E6B] font-medium py-2 px-4 rounded-lg hover:bg-[#F52E6B] hover:bg-opacity-10 transition duration-200"
        >
          <Lock className="h-5 w-5" />
          <span>修改密码</span>
        </Link>

        <button
          type="button"
          onClick={handleSignOut}
          className="w-full mt-4 flex items-center justify-center space-x-2 border border-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg hover:bg-gray-50 transition duration-200"
        >
          <LogOut className="h-5 w-5" />
          <span>退出登录</span>
        </button>
      </div>
    </div>
  );
}