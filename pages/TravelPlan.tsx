// ✅ 完整迁移版 TravelPlan 页面（功能保留 + 类名合法化）
import React, { useState, useEffect } from 'react';
import { View, Text, Input, Button, Form, Checkbox, Picker, Label } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useAuthStore } from '@/store/auth';
import { useCreditStore } from '@/store/credits';
import { supabase } from '@/lib/supabase';
import './travel-plan.scss';
import '@/styles/utils.scss';

const PLAN_GENERATION_COST = 50;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
const CIRCUIT_BREAKER_TIMEOUT = 60000;
const GENERATION_TIMEOUT = 120000;

let lastFailureTime = null;
let consecutiveFailures = 0;

export default function TravelPlan() {
  const { user } = useAuthStore();
  const { total: credits, fetchCredits, consumeCredits, hasEnoughCredits } = useCreditStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreditWarning, setShowCreditWarning] = useState(false);
  const [formData, setFormData] = useState({
    from: '',
    to: '',
    date: getDefaultDate(),
    days: 3,
    preferences: []
  });

  function getDefaultDate() {
    const date = new Date();
    date.setDate(date.getDate() + 3);
    return date.toISOString().split('T')[0];
  }

  useEffect(() => {
    if (user) fetchCredits();
  }, [user]);

  const preferenceOptions = [
    '美食探索','文化体验','购物','自然风光','历史古迹','主题乐园','休闲度假','户外运动'
  ];

  const isCircuitBreakerOpen = () => {
    if (!lastFailureTime || !consecutiveFailures) return false;
    return Date.now() - lastFailureTime < CIRCUIT_BREAKER_TIMEOUT && consecutiveFailures >= MAX_RETRIES;
  };

  const handleSubmit = async () => {
    if (!user) return Taro.navigateTo({ url: '/pages/index/index' });
    if (!hasEnoughCredits(PLAN_GENERATION_COST)) return setShowCreditWarning(true);
    if (isCircuitBreakerOpen()) {
      setError('AI服务暂时不可用，请稍后再试。');
      return;
    }

    setLoading(true);
    let retryCount = 0;
    let planId = null;

    try {
      const { data, error: planError } = await supabase.from('travel_plan_logs').insert({
        user_id: user.id,
        from_location: formData.from,
        to_location: formData.to,
        travel_date: formData.date,
        days: formData.days,
        preferences: formData.preferences,
        plan_text: '正在生成中...',
        poi_list: []
      }).select().single();

      if (planError) throw planError;
      planId = data.id;
      Taro.navigateTo({ url: `/pages/plan-log/index?id=${planId}` });

      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes?.data?.session?.access_token;
      if (!token) throw new Error('无效会话');

      const generatePlanInBackground = async () => {
        try {
          const startTime = Date.now();
          while (retryCount < MAX_RETRIES) {
            const res = await Taro.request({
              url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-plan`,
              method: 'POST',
              header: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              data: formData
            });
            if (res.statusCode !== 200 || !res.data.planText) throw new Error('AI返回异常');

            await supabase.from('travel_plan_logs').update({
              plan_text: res.data.planText,
              poi_list: []
            }).eq('id', planId);

            await consumeCredits(PLAN_GENERATION_COST, '生成旅行计划');
            resetCircuitBreaker();
            return;
          }
        } catch (err) {
          lastFailureTime = Date.now();
          consecutiveFailures++;
          await supabase.from('travel_plan_logs').update({ plan_text: `生成失败：${err.message}`, poi_list: [] }).eq('id', planId);
        }
      };
      generatePlanInBackground();
    } catch (err) {
      setError(err.message || '生成失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="max-w-4xl mx-auto px-4 py-8">
      <View className="bg-white rounded-lg shadow-lg p-6">
        <Text className="text-2xl font-bold text-gray-900 mb-8">制定旅行计划</Text>

        <View className="mb-6 flex items-center justify-between bg-gray-50 p-4 rounded-lg">
          <Text>当前积分: <Text className="font-bold">{credits}</Text></Text>
          <Text className="text-sm text-gray-500">生成一次计划需要 <Text className="font-medium text-F52E6B">50</Text> 积分</Text>
        </View>

        <View className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-lg">
          <Text>旅行计划生成需要<Text className="font-bold">10-120秒</Text>，可在<Text className="font-bold">用户中心-我的行程</Text>中查看。</Text>
        </View>

        <Form onSubmit={(e) => handleSubmit(e)}>
          <View className="space-y-4">
            <Input className="w-full p-3 border rounded-lg" placeholder="出发地（城市名称，如:北京）"
              value={formData.from} onInput={e => setFormData({ ...formData, from: e.detail.value })} />
            <Input className="w-full p-3 border rounded-lg" placeholder="目的地（城市名称，如:上海）"
              value={formData.to} onInput={e => setFormData({ ...formData, to: e.detail.value })} />
            <Picker mode="date" onChange={e => setFormData({ ...formData, date: e.detail.value })}>
              <View className="p-3 border rounded-lg text-gray-500">选择出发日期：{formData.date}</View>
            </Picker>
            <Input className="w-full p-3 border rounded-lg" type="number" placeholder="出行天数"
              value={String(formData.days)} onInput={e => setFormData({ ...formData, days: parseInt(e.detail.value) })} />
          </View>

          <View className="mt-6">
            <Text className="text-lg font-semibold mb-4 block">旅行偏好</Text>
            <View className="grid grid-cols-2 md-grid-cols-4 gap-3">
              {preferenceOptions.map(tag => (
                <Label key={tag} className="flex items-center space-x-2">
<Checkbox
  value={tag}
  checked={formData.preferences.includes(tag)}
  onChange={() => {
    const isChecked = formData.preferences.includes(tag);
    const newPreferences = isChecked
      ? formData.preferences.filter(p => p !== tag)
      : [...formData.preferences, tag];

    setFormData({ ...formData, preferences: newPreferences });
  }}
/>
                  <Text>{tag}</Text>
                </Label>
              ))}
            </View>
          </View>

          {error && <Text className="text-red-500 text-sm mt-4">{error}</Text>}
          <Button className="w-full bg-F52E6B text-white py-3 rounded-lg font-semibold mt-6"
            formType="submit" loading={loading}>
            <View className="flex items-center justify-center">
              <Text>生成行程</Text>
              <Text className="ml-2 text-sm bg-white bg-opacity-20 px-2 py-0_5 rounded-full">消耗 50 积分</Text>
            </View>
          </Button>
        </Form>
      </View>
    </View>
  );
}
