import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Shield, Globe, Bell, Coins, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';

interface SystemSettings {
  maintenance_mode: boolean;
  registration_enabled: boolean;
  email_registration_enabled: boolean; // Changed from email_verification_required
  max_travel_packages_per_agent: number;
  commission_rate: number;
  is_publish_package_charged: boolean;
  package_publish_cost: number;
  notification_settings: {
    new_user_notification: boolean;
    new_order_notification: boolean;
    new_application_notification: boolean;
  };
}

export function AdminSettings() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>({
    maintenance_mode: false,
    registration_enabled: true,
    email_registration_enabled: true, // Changed from email_verification_required
    max_travel_packages_per_agent: 5,
    commission_rate: 5,
    is_publish_package_charged: false,
    package_publish_cost: 50,
    notification_settings: {
      new_user_notification: true,
      new_order_notification: true,
      new_application_notification: true,
    }
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAdminAccess();
    fetchSettings();
  }, [user, navigate]);

  async function checkAdminAccess() {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_role')
      .eq('id', user?.id)
      .single();

    if (profile?.user_role !== 'admin') {
      navigate('/');
    }
  }

  async function fetchSettings() {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Settings don't exist yet, create default settings
          await supabase
            .from('system_settings')
            .insert([settings]);
        } else {
          throw error;
        }
      } else if (data) {
        // Map email_verification_required to email_registration_enabled if it exists
        const updatedData = {
          ...data,
          email_registration_enabled: data.email_verification_required !== undefined 
            ? data.email_verification_required 
            : true,
          commission_rate: data.commission_rate || 5,
          is_publish_package_charged: data.is_publish_package_charged || false,
          package_publish_cost: data.package_publish_cost || 50
        };
        setSettings(updatedData);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSettings() {
    setSaving(true);
    try {
      // Map email_registration_enabled back to email_verification_required for backward compatibility
      const dataToSave = {
        ...settings,
        email_verification_required: settings.email_registration_enabled
      };
      
      const { error } = await supabase
        .from('system_settings')
        .update(dataToSave)
        .eq('id', 1);

      if (error) throw error;
      alert('设置已保存');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F52E6B]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="mr-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
        </div>
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="bg-[#F52E6B] text-white px-4 py-2 rounded-lg hover:bg-[#FE6587] transition-colors disabled:opacity-50 flex items-center space-x-2"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? '保存中...' : '保存设置'}</span>
        </button>
      </div>

      <div className="space-y-6">
        {/* System Status */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center mb-4">
            <Shield className="h-5 w-5 text-[#F52E6B] mr-2" />
            <h2 className="text-lg font-medium text-gray-900">系统状态</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-700">维护模式</label>
                <p className="text-sm text-gray-500">
                  启用后，只有管理员可以访问系统
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.maintenance_mode}
                  onChange={(e) => setSettings({
                    ...settings,
                    maintenance_mode: e.target.checked
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#F52E6B]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F52E6B]"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Registration Settings */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center mb-4">
            <Globe className="h-5 w-5 text-[#F52E6B] mr-2" />
            <h2 className="text-lg font-medium text-gray-900">注册设置</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-700">开放注册</label>
                <p className="text-sm text-gray-500">
                  允许新用户注册账号
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.registration_enabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    registration_enabled: e.target.checked
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#F52E6B]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F52E6B]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-700">启用邮箱注册</label>
                <p className="text-sm text-gray-500">
                  允许用户使用邮箱注册账号（适用于国际用户）
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.email_registration_enabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    email_registration_enabled: e.target.checked
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#F52E6B]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F52E6B]"></div>
              </label>
            </div>

            <div>
              <label className="font-medium text-gray-700">
                每个旅行社最大套餐数量
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={settings.max_travel_packages_per_agent}
                onChange={(e) => setSettings({
                  ...settings,
                  max_travel_packages_per_agent: parseInt(e.target.value)
                })}
                className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
              />
              <p className="mt-1 text-sm text-gray-500">
                限制每个旅行社可以发布的套餐数量
              </p>
            </div>

            <div>
              <label className="font-medium text-gray-700">
                旅行社返点比例 (%)
              </label>
              <div className="relative mt-1">
                <Coins className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={settings.commission_rate}
                  onChange={(e) => setSettings({
                    ...settings,
                    commission_rate: parseFloat(e.target.value)
                  })}
                  className="pl-10 block w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                旅行社线下成交订单需向平台缴纳的返点比例
              </p>
            </div>
          </div>
        </div>

        {/* Package Publishing Settings */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center mb-4">
            <Package className="h-5 w-5 text-[#F52E6B] mr-2" />
            <h2 className="text-lg font-medium text-gray-900">套餐发布设置</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-medium text-gray-700">启用套餐发布收费</div>
                <div className="text-xs text-gray-500">启用后，旅行社每发布一个套餐将扣除一定积分</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.is_publish_package_charged}
                  onChange={(e) => setSettings({
                    ...settings,
                    is_publish_package_charged: e.target.checked
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#F52E6B]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F52E6B]"></div>
              </label>
            </div>

            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                每次发布扣除积分数量
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F52E6B]"
                value={settings.package_publish_cost}
                onChange={(e) => setSettings({
                  ...settings,
                  package_publish_cost: Number(e.target.value)
                })}
                min={0}
              />
              <p className="text-xs text-gray-400 mt-1">
                旅行社发布一个套餐所需的积分，默认 50
              </p>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center mb-4">
            <Bell className="h-5 w-5 text-[#F52E6B] mr-2" />
            <h2 className="text-lg font-medium text-gray-900">通知设置</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-700">新用户注册通知</label>
                <p className="text-sm text-gray-500">
                  有新用户注册时通知管理员
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notification_settings.new_user_notification}
                  onChange={(e) => setSettings({
                    ...settings,
                    notification_settings: {
                      ...settings.notification_settings,
                      new_user_notification: e.target.checked
                    }
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#F52E6B]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F52E6B]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-700">新订单通知</label>
                <p className="text-sm text-gray-500">
                  有新订单时通知管理员
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notification_settings.new_order_notification}
                  onChange={(e) => setSettings({
                    ...settings,
                    notification_settings: {
                      ...settings.notification_settings,
                      new_order_notification: e.target.checked
                    }
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#F52E6B]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F52E6B]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-700">新申请通知</label>
                <p className="text-sm text-gray-500">
                  有新的旅行社申请时通知管理员
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notification_settings.new_application_notification}
                  onChange={(e) => setSettings({
                    ...settings,
                    notification_settings: {
                      ...settings.notification_settings,
                      new_application_notification: e.target.checked
                    }
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#F52E6B]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F52E6B]"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}