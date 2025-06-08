import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Map, Coins, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { generateTravelPlan } from '../api/plansRest';
import { useAuthStore } from '../store/auth';
import { DatePicker } from '../components/DatePicker';
import { useCreditStore } from '../store/credits';
import { supabase } from '../lib/supabase';

interface FormData {
  from: string;
  to: string;
  date: string;
  days: number;
  preferences: string[];
}

const PLAN_GENERATION_COST = 50;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute timeout for circuit breaker
const GENERATION_TIMEOUT = 120000; // 2 minutes timeout for generation

// Circuit breaker state
let lastFailureTime: number | null = null;
let consecutiveFailures = 0;

export function TravelPlanPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { total: credits, fetchCredits, consumeCredits, hasEnoughCredits } = useCreditStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreditWarning, setShowCreditWarning] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    from: '',
    to: '',
    date: getDefaultDate(),
    days: 3,
    preferences: [],
  });

  function getDefaultDate() {
    const date = new Date();
    date.setDate(date.getDate() + 3);
    return date.toISOString().split('T')[0];
  }

  const today = new Date().toISOString().split('T')[0];

  const preferenceOptions = [
    '美食探索',
    '文化体验',
    '购物',
    '自然风光',
    '历史古迹',
    '主题乐园',
    '休闲度假',
    '户外运动',
  ];

  useEffect(() => {
    if (user) {
      fetchCredits();
    }
  }, [user, fetchCredits]);

  // Circuit breaker check
  const isCircuitBreakerOpen = () => {
    if (!lastFailureTime || !consecutiveFailures) return false;
    
    const timeSinceLastFailure = Date.now() - lastFailureTime;
    return consecutiveFailures >= MAX_RETRIES && timeSinceLastFailure < CIRCUIT_BREAKER_TIMEOUT;
  };

  // Reset circuit breaker
  const resetCircuitBreaker = () => {
    lastFailureTime = null;
    consecutiveFailures = 0;
  };

  // Update circuit breaker state on failure
  const updateCircuitBreakerOnFailure = () => {
    lastFailureTime = Date.now();
    consecutiveFailures++;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!hasEnoughCredits(PLAN_GENERATION_COST)) {
      setShowCreditWarning(true);
      return;
    }

    // Check circuit breaker
    if (isCircuitBreakerOpen()) {
      setError('AI服务暂时不可用，请等待一分钟后再试。如果问题持续存在，请联系客服。');
      return;
    }

    setLoading(true);
    setError(null);
    let planData = null;
    let retryCount = 0;
    let planId = null;

    try {
      // First create a plan record with "generating" status
      const { data, error: planError } = await supabase
        .from('travel_plan_logs')
        .insert({
          user_id: user.id,
          from_location: formData.from,
          to_location: formData.to,
          travel_date: formData.date,
          days: formData.days,
          preferences: formData.preferences,
          plan_text: '正在生成您的专属行程，请稍候10-120秒，可以稍后在用户中心-我的行程中查看',
          poi_list: []
        })
        .select()
        .single();

      if (planError) throw planError;

      planData = data;
      planId = data.id;

      // Navigate to the plan detail page immediately
      navigate(`/plan-log/${planId}`);

      // Get the current session for the auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      // Start a background process to generate the plan
      const generatePlanInBackground = async () => {
        try {
          const startTime = Date.now();
          let success = false;
          
          while (retryCount < MAX_RETRIES && !success) {
            try {
              // Check if we've exceeded the timeout
              if (Date.now() - startTime > GENERATION_TIMEOUT) {
                throw new Error('Plan generation timed out');
              }
              
              const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-plan`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                  from: formData.from,
                  to: formData.to,
                  date: formData.date,
                  days: formData.days,
                  preferences: formData.preferences
                })
              });

              if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
              }

              const responseData = await response.json();
              
              if (responseData.planText && typeof responseData.planText === 'string' && responseData.planText.length > 10) {
                // Update plan with the generated content
                await supabase
                  .from('travel_plan_logs')
                  .update({ 
                    plan_text: responseData.planText,
                    poi_list: []
                  })
                  .eq('id', planId);
                
                // Only consume credits if plan generation was successful
                await consumeCredits(
                  PLAN_GENERATION_COST, 
                  '生成旅行计划'
                );
                
                success = true;
                resetCircuitBreaker();
              } else {
                throw new Error('Invalid response from AI service');
              }
            } catch (err) {
              retryCount++;
              console.error(`Attempt ${retryCount} failed:`, err);
              
              if (retryCount === MAX_RETRIES) {
                updateCircuitBreakerOnFailure();
                throw err;
              }
              
              // Wait before retrying
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retryCount - 1)));
            }
          }
        } catch (error) {
          console.error('Error in background plan generation:', error);
          
          // Update plan with error message
          await supabase
            .from('travel_plan_logs')
            .update({ 
              plan_text: `生成行程时出现错误: ${error instanceof Error ? error.message : '请稍后重试'}`,
              poi_list: []
            })
            .eq('id', planId);
        }
      };

      // Start the background process without waiting for it
      generatePlanInBackground();
      
    } catch (err) {
      console.error('Error creating plan:', err);
      const errorMessage = err instanceof Error ? err.message : '创建计划失败，请重试';
      
      if (planId) {
        await supabase
          .from('travel_plan_logs')
          .update({ 
            plan_text: `生成行程时出现错误: ${errorMessage}`,
            poi_list: []
          })
          .eq('id', planId);
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">制定旅行计划</h1>
        
        {/* Credit Status */}
        <div className="mb-6 flex items-center justify-between bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center">
            <Coins className="h-5 w-5 text-[#F52E6B] mr-2" />
            <span className="text-gray-700">当前积分: <span className="font-bold">{credits}</span></span>
          </div>
          <div className="text-sm text-gray-500">
            生成一次计划需要 <span className="font-medium text-[#F52E6B]">50</span> 积分
          </div>
        </div>

        {/* Generation Time Notice */}
        <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-lg flex items-start">
          <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <p className="text-sm">
              旅行计划生成需要<strong>10-120秒</strong>的时间，提交后您可以在<strong>用户中心-我的行程</strong>中查看结果。
            </p>
          </div>
        </div>

        {/* Circuit Breaker Warning */}
        {isCircuitBreakerOpen() && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <h3 className="font-medium">AI服务暂时不可用</h3>
              <p className="mt-1 text-sm">
                系统检测到AI服务异常，请等待一分钟后再试。如果问题持续存在，请联系客服。
              </p>
            </div>
          </div>
        )}
        
        {showCreditWarning && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <h3 className="font-medium">积分不足</h3>
              <p className="mt-1 text-sm">每次生成需要 50 积分，您当前仅有 {credits} 积分</p>
              <button 
                onClick={() => {
                  navigate('/profile');
                  setTimeout(() => {
                    const element = document.getElementById('credits-tab');
                    if (element) element.click();
                  }, 100);
                }}
                className="mt-2 text-[#F52E6B] hover:text-[#FE6587] text-sm font-medium"
              >
                立即前往【积分中心】购买积分
              </button>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <MapPin className="w-6 h-6 text-[#F52E6B]" />
              <div className="flex-1 space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="出发地（城市名称，如:北京）"
                    value={formData.from}
                    onChange={(e) => setFormData({ ...formData, from: e.target.value })}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                    required
                  />
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="目的地（城市名称，如:上海）"
                    value={formData.to}
                    onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Clock className="w-6 h-6 text-[#F52E6B]" />
              <DatePicker
                value={formData.date}
                onChange={(date) => setFormData({ ...formData, date })}
                minDate={new Date(today)}
                placeholder="选择出发日期"
                className="flex-1"
              />
            </div>

            <div className="flex items-center space-x-4">
              <Clock className="w-6 h-6 text-[#F52E6B]" />
              <input
                type="number"
                min="1"
                max="30"
                value={formData.days}
                onChange={(e) => setFormData({ ...formData, days: parseInt(e.target.value) })}
                className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-[#F52E6B] focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Map className="w-5 h-5 text-[#F52E6B] mr-2" />
              旅行偏好
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {preferenceOptions.map((tag) => (
                <label key={tag} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.preferences.includes(tag)}
                    onChange={(e) => {
                      const newPreferences = e.target.checked
                        ? [...formData.preferences, tag]
                        : formData.preferences.filter((p) => p !== tag);
                      setFormData({ ...formData, preferences: newPreferences });
                    }}
                    className="rounded border-gray-300 text-[#F52E6B] focus:ring-[#F52E6B]"
                  />
                  <span>{tag}</span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
              <div className="whitespace-pre-line">{error}</div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="absolute top-0 right-0 p-2"
              >
                <span className="text-red-500 hover:text-red-700">×</span>
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !hasEnoughCredits(PLAN_GENERATION_COST) || isCircuitBreakerOpen()}
            className="w-full bg-[#F52E6B] text-white py-3 rounded-lg font-semibold hover:bg-[#FE6587] disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-white h-2.5 rounded-full animate-pulse" style={{ width: '100%' }}></div>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <span>生成行程</span>
                <span className="ml-2 text-sm bg-white bg-opacity-20 px-2 py-0.5 rounded-full">
                  消耗 50 积分
                </span>
              </div>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}