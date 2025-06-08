// ✅ 微信小程序 TravelPlan 页面（结构、逻辑、样式合法化保留）
import React, { useState, useEffect } from 'react';
import { View, Text, Input, Button, Form, Checkbox, Picker, Label } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './travel-plan.scss';
import '@/styles/utils.scss';
import request from '@/api/request';
import { useStore } from '@/libs/wxbuf/react/useStore';
import { store as authStore } from '@/store/auth';
import { store as creditStore } from '@/store/credits';

const PLAN_GENERATION_COST = 50;
const MAX_RETRIES = 3;
const CIRCUIT_BREAKER_TIMEOUT = 60000;

let lastFailureTime: number | null = null;
let consecutiveFailures = 0;

function getDefaultDate() {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  return date.toISOString().split('T')[0];
}

export default function TravelPlan() {
  const { user, loading: authLoading, initialized } = useStore(authStore);
  const { credits, loading, error } = useStore(creditStore);

  const [formData, setFormData] = useState({
    from: '',
    to: '',
    date: getDefaultDate(),
    days: 3,
    preferences: [] as string[]
  });

  const [formError, setFormError] = useState<string | null>(null);

  const hasEnoughCredits = (required: number) => credits >= required;
  const isDisabled = !hasEnoughCredits(PLAN_GENERATION_COST);

  useEffect(() => {
    if (user) creditStore.fetchCredits();
  }, [user]);

  useEffect(() => {
    if (initialized && !authLoading && !user) {
      Taro.redirectTo({ url: '/pages/index/index' });
    }
  }, [initialized, authLoading, user]);

  const preferenceOptions = [
    '美食探索', '文化体验', '购物', '自然风光',
    '历史古迹', '主题乐园', '休闲度假', '户外运动'
  ];

  const isCircuitBreakerOpen = () => {
    return (
      lastFailureTime !== null &&
      Date.now() - lastFailureTime < CIRCUIT_BREAKER_TIMEOUT &&
      consecutiveFailures >= MAX_RETRIES
    );
  };

  const resetCircuitBreaker = () => {
    lastFailureTime = null;
    consecutiveFailures = 0;
  };

  const handleSubmit = async () => {
    setFormError(null);

    if (authLoading || !initialized) {
      Taro.showToast({ title: '正在检测登录状态...', icon: 'none' });
      return;
    }

    if (!user) {
      Taro.showToast({ title: '请先登录', icon: 'none' });
      return Taro.navigateTo({ url: '/pages/index/index' });
    }

    if (!hasEnoughCredits(PLAN_GENERATION_COST)) {
      Taro.showToast({ title: '积分不足，无法生成计划', icon: 'none' });
      return;
    }

    if (isCircuitBreakerOpen()) {
      setFormError('AI服务暂时不可用，请稍后再试。');
      return;
    }

    creditStore.setLoading(true);
    let retryCount = 0;
    let planId: string | null = null;

    try {
      const res = await request({
        url: '/api/travel_plan_logs',
        method: 'POST',
        data: {
          from_location: formData.from,
          to_location: formData.to,
          travel_date: formData.date,
          days: formData.days,
          preferences: formData.preferences
        }
      });

      planId = res.data.id;
      Taro.navigateTo({ url: `/pages/plan-log/index?id=${planId}` });

      const token = Taro.getStorageSync('token');
      if (!token) throw new Error('无效会话');

      const generatePlanInBackground = async () => {
        try {
          while (retryCount < MAX_RETRIES) {
            const res = await request({
              url: '/api/plan/generate',
              method: 'POST',
              header: { Authorization: `Bearer ${token}` },
              data: {
                id: planId,
                from_location: formData.from,
                to_location: formData.to,
                travel_date: formData.date,
                days: formData.days
              }
            });
            if (!res.data?.success) throw new Error('AI生成失败');

            await creditStore.consumeCredits({
              amount: PLAN_GENERATION_COST,
              remark: '生成旅行计划'
            });

            resetCircuitBreaker();
            return;
          }
        } catch (err: any) {
          lastFailureTime = Date.now();
          consecutiveFailures++;
          await request({
            url: `/api/travel_plan_logs/${planId}`,
            method: 'PATCH',
            data: {
              plan_text: `生成失败：${err.message}`,
              poi_list: []
            }
          });
        }
      };

      generatePlanInBackground();
    } catch (err: any) {
      setFormError(err.message || '生成失败');
    } finally {
      creditStore.setLoading(false);
    }
  };

  return (
    <View className="travel-plan-page">
      {/* 样式和功能在 travel-plan.scss 中合法化处理 */}
      <View className="travel-form-container">
        <Text className="travel-title">制定旅行计划</Text>

        <View className="travel-credit-bar">
          <Text>当前积分: <Text className="font-bold">{credits}</Text></Text>
          <Text className="text-sm text-gray-500">生成一次计划需要 <Text className="text-F52E6B">50</Text> 积分</Text>
        </View>

        <View className="travel-alert">
          <Text>旅行计划生成需要<Text className="font-bold">10-120秒</Text>，可在<Text className="font-bold">用户中心-我的行程</Text>中查看。</Text>
        </View>

        <Form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <View className="form-group">
            <Input className="input" placeholder="出发地（如:北京）" value={formData.from} onInput={e => setFormData({ ...formData, from: e.detail.value })} />
            <Input className="input" placeholder="目的地（如:上海）" value={formData.to} onInput={e => setFormData({ ...formData, to: e.detail.value })} />
            <Picker mode="date" value={formData.date} onChange={e => { if (e.detail?.value) setFormData({ ...formData, date: e.detail.value }); }}>
              <View className="picker">选择出发日期：{formData.date}</View>
            </Picker>
            <Input className="input" type="number" placeholder="出行天数" value={String(formData.days)} onInput={e => setFormData({ ...formData, days: parseInt(e.detail.value) })} />
          </View>

          <View className="preference-section">
            <Text className="preference-title">旅行偏好</Text>
            <View className="preference-grid">
              {preferenceOptions.map(tag => (
                <Label key={tag} className="checkbox-label">
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

          {formError && <Text className="text-error mt-2">{formError}</Text>}
          {error && <Text className="text-error mt-2">{error}</Text>}

          <Button
            className={`submit-button ${isDisabled ? 'disabled' : ''}`}
            formType="submit"
            disabled={isDisabled}
            loading={loading}
          >
            <View className="submit-inner">
              <Text>{isDisabled ? '积分不足' : '生成行程'}</Text>
              <Text className="tag">消耗 50 积分</Text>
            </View>
          </Button>

          {isDisabled && (
            <View className="disabled-hint">
              当前积分不足，前往 <Text className="text-F52E6B" onClick={() => Taro.navigateTo({ url: '/pages/user-center/index' })}>用户中心</Text> 充值积分。
            </View>
          )}
        </Form>
      </View>
    </View>
  );
}
