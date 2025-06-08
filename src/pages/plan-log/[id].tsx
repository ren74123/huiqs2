import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Coins, Share2, Download, MapPin, Calendar, Clock, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';
import { useCreditStore } from '../../store/credits';
import html2canvas from 'html2canvas';

interface TravelPlan {
  id: string;
  from_location: string;
  to_location: string;
  travel_date: string;
  days: number;
  plan_text: string;
  preferences: string[];
  created_at: string;
}

const PLAN_GENERATION_COST = 50; // 50 credits per plan generation
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute timeout for circuit breaker
const GENERATION_TIMEOUT = 120000; // 2 minutes timeout for plan generation

// Circuit breaker state
let lastFailureTime: number | null = null;
let consecutiveFailures = 0;

export function PlanDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const { total: credits, fetchCredits, consumeCredits, hasEnoughCredits } = useCreditStore();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [formattedPlan, setFormattedPlan] = useState<string>('');
  const [retryLoading, setRetryLoading] = useState(false);
  const [showCreditWarning, setShowCreditWarning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const [generationTimeout, setGenerationTimeout] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!id) {
      setLoading(false);
      return;
    }
    fetchCredits();
    fetchPlan();

    // Subscribe to changes
    const channel = supabase
      .channel('plan_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'travel_plan_logs',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          setPlan(payload.new as TravelPlan);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, id, navigate, fetchCredits]);

  useEffect(() => {
    if (plan?.plan_text) {
      setFormattedPlan(formatPlanText(plan.plan_text));
    }
  }, [plan]);
  
  useEffect(() => {
    if (!id) return;

    // If plan is in generating state, start the timer
    if (plan?.plan_text && (
      plan.plan_text.includes('正在生成您的专属行程') || 
      plan.plan_text.includes('正在重新生成您的专属行程')
    )) {
      if (!generationStartTime) {
        setGenerationStartTime(Date.now());
      }
      
      // Check if generation has timed out
      if (generationStartTime && (Date.now() - generationStartTime > GENERATION_TIMEOUT)) {
        setGenerationTimeout(true);
        return;
      }
      
      const interval = setInterval(async () => {
        // Check for timeout
        if (generationStartTime && (Date.now() - generationStartTime > GENERATION_TIMEOUT)) {
          clearInterval(interval);
          setGenerationTimeout(true);
          return;
        }

        const { data, error } = await supabase
          .from('travel_plan_logs')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.error('❌ 轮询获取计划失败：', error);
          return;
        }

        if (data) {
          console.log('🔁 轮询结果：', data.plan_text?.substring(0, 50));
          setPlan(data);

          if (data.plan_text && !data.plan_text.includes('正在生成')) {
            console.log('✅ 检测到计划生成完成，停止轮询');
            clearInterval(interval);
            setGenerationStartTime(null);
          }
        }
      }, 3000); // 每 3 秒轮询一次

      return () => clearInterval(interval);
    } else {
      // Reset generation start time if plan is not in generating state
      setGenerationStartTime(null);
      setGenerationTimeout(false);
    }
  }, [id, plan?.plan_text, generationStartTime]);

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

  async function fetchPlan() {
    try {
      const { data, error } = await supabase
        .from('travel_plan_logs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setPlan(data);
    } catch (error) {
      console.error('Error fetching plan:', error);
      if (!loading) {
        navigate('/profile');
      }
    } finally {
      setLoading(false);
    }
  }

  const formatPlanText = (text: string): string => {
    if (!text) return '';

    // Apply Markdown-style formatting
    return text
      .replace(/^第\s?(\d+)\s?天[:：]/gm, '# 第 $1 天')
      .replace(/【(.+?)】/g, '## $1')
      .replace(/推荐景点[：:]/g, '- 推荐景点：')
      .replace(/景点特色[、:]?/g, '- 景点特色：')
      .replace(/适合人群[、:]?/g, '- 适合人群：')
      .replace(/推荐交通(方式)?[：:]?/g, '- 推荐交通：')
      .replace(/推荐美食[：:]?/g, '- 推荐美食：')
      .replace(/出行建议[：:]?/g, '- 出行建议：')
      .replace(/^❌/gm, '- 🚫')
      .replace(/^❗/gm, '- ⚠️');
  };

  const handleRetry = async () => {
    if (!plan || !user) return;
    
    // Check if user has enough credits
    if (!hasEnoughCredits(PLAN_GENERATION_COST)) {
      setShowCreditWarning(true);
      return;
    }
    
    // Check circuit breaker
    if (isCircuitBreakerOpen()) {
      alert('AI服务暂时不可用，请等待一分钟后再试。如果问题持续存在，请联系客服。');
      return;
    }

    setRetryLoading(true);
    try {
      // Update plan status to regenerating
      await supabase
        .from('travel_plan_logs')
        .update({ 
          plan_text: '正在重新生成您的专属行程，请稍候10-120秒，可以稍后查看'
        })
        .eq('id', plan.id);
      
      // Reset generation timeout and start time
      setGenerationTimeout(false);
      setGenerationStartTime(Date.now());

      // Get the current session for the auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      // Call Coze API with proper authorization
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          from: plan.from_location,
          to: plan.to_location,
          date: plan.travel_date,
          days: plan.days,
          preferences: plan.preferences
        })
      });

      if (!response.ok) {
        updateCircuitBreakerOnFailure();
        throw new Error(`API request failed with status ${response.status}`);
      }

      const responseData = await response.json();

      // Only if we get a valid response, consume credits
      if (responseData.planText && typeof responseData.planText === 'string' && responseData.planText.length > 10) {
        // Consume credits
        const creditSuccess = await consumeCredits(
          PLAN_GENERATION_COST, 
          '重新生成旅行计划'
        );

        if (!creditSuccess) {
          throw new Error('积分扣除失败');
        }

        // Update plan with Coze response
        await supabase
          .from('travel_plan_logs')
          .update({ 
            plan_text: responseData.planText,
            poi_list: []
          })
          .eq('id', plan.id);
          
        // Reset circuit breaker on success
        resetCircuitBreaker();
      } else {
        // If we didn't get a valid response, don't consume credits
        console.warn('Coze 返回无效 planText，保留原始状态，等待下一轮轮询');
        updateCircuitBreakerOnFailure();
      }

    } catch (error) {
      console.error('Error retrying plan generation:', error);
      updateCircuitBreakerOnFailure();
      
      // Update plan with error message
      await supabase
        .from('travel_plan_logs')
        .update({ 
          plan_text: '重新生成行程时出现错误，请重试'
        })
        .eq('id', plan.id);
    } finally {
      setRetryLoading(false);
      setShowCreditWarning(false);
    }
  };

  const handleSaveImage = async () => {
    if (!plan || saving) return;
    
    try {
      setSaving(true);
      const element = document.getElementById('plan-card');
      if (!element) return;

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
      });

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, 'image/png');
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `travel-plan-${plan.from_location}-${plan.to_location}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error saving image:', error);
    } finally {
      setSaving(false);
    }
  };

  const renderPlanContent = () => {
    if (!formattedPlan) return null;

    const lines = formattedPlan.split('\n');
    const elements: JSX.Element[] = [];

    lines.forEach((line, index) => {
      if (line.startsWith('# ')) {
        // Day header
        elements.push(
          <div key={index} className="mt-6 mb-4 bg-[#F52E6B] bg-opacity-10 p-3 rounded-lg">
            <h2 className="text-xl font-bold text-[#F52E6B]">{line.substring(2)}</h2>
          </div>
        );
      } else if (line.startsWith('## ')) {
        // Time section
        elements.push(
          <div key={index} className="mt-4 mb-2">
            <h3 className="text-lg font-semibold text-gray-800 border-l-4 border-[#F52E6B] pl-2">
              {line.substring(3)}
            </h3>
          </div>
        );
      } else if (line.startsWith('- ')) {
        // Recommendation item
        let icon = null;
        let textClass = "text-gray-700";
        
        if (line.includes('推荐景点')) {
          icon = <MapPin className="h-4 w-4 text-[#F52E6B] flex-shrink-0" />;
        } else if (line.includes('景点特色')) {
          icon = <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />;
        } else if (line.includes('适合人群')) {
          icon = <Users className="h-4 w-4 text-blue-500 flex-shrink-0" />;
        } else if (line.includes('推荐交通')) {
          icon = <Bus className="h-4 w-4 text-green-500 flex-shrink-0" />;
        } else if (line.includes('推荐美食')) {
          icon = <Utensils className="h-4 w-4 text-orange-500 flex-shrink-0" />;
        } else if (line.includes('出行建议')) {
          icon = <Lightbulb className="h-4 w-4 text-purple-500 flex-shrink-0" />;
        } else if (line.includes('🚫') || line.includes('⚠️')) {
          icon = <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />;
          textClass = "text-red-600 font-medium";
        }

        elements.push(
          <div key={index} className="flex items-start space-x-2 my-2 ml-2">
            {icon}
            <span className={textClass}>{line.substring(2)}</span>
          </div>
        );
      } else if (line.trim() !== '') {
        // Regular text
        elements.push(
          <p key={index} className="my-2 text-gray-700">{line}</p>
        );
      }
    });

    return elements;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#F52E6B] border-t-transparent"></div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">行程不存在</h2>
          <button
            onClick={() => navigate('/profile')}
            className="text-[#F52E6B] hover:text-[#FE6587]"
          >
            返回个人中心
          </button>
        </div>
      </div>
    );
  }

  const isGenerating = plan.plan_text.includes('正在生成您的专属行程') || 
                       plan.plan_text.includes('正在重新生成您的专属行程');
  const hasError = plan.plan_text.includes('生成行程时出现错误') || 
                   plan.plan_text.includes('重新生成行程时出现错误');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-[#F52E6B]"
        >
          <ArrowLeft className="h-5 w-5 mr-1" />
          <span>返回</span>
        </button>
        
        {!isGenerating && !hasError && (
          <div className="flex space-x-2">
            <button
              onClick={handleSaveImage}
              disabled={saving}
              className="flex items-center space-x-1 bg-[#F52E6B] text-white px-3 py-1 rounded-lg hover:bg-[#FE6587] disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>{saving ? '保存中...' : '保存图片'}</span>
            </button>
            <button
              onClick={() => {
                navigate(`/share/plan/${plan.id}`);
              }}
              className="flex items-center space-x-1 bg-gray-100 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-200"
            >
              <Share2 className="h-4 w-4" />
              <span>分享</span>
            </button>
          </div>
        )}
      </div>

      <div id="plan-card" className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-full max-w-md bg-gray-200 rounded-full h-2.5 mb-6">
                <div className="bg-[#F52E6B] h-2.5 rounded-full animate-pulse" style={{ width: '100%' }}></div>
              </div>
              <p className="text-gray-500 mb-4">正在生成您的专属行程，请稍候...</p>
              <p className="text-sm text-gray-400">预计需要10-120秒，您也可以稍后在用户中心-我的行程中查看</p>
            </div>
          ) : generationTimeout ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="bg-yellow-100 text-yellow-600 p-4 rounded-lg mb-6 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                <p>生成行程超时，请重试</p>
              </div>
              
              {showCreditWarning ? (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg max-w-md">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <Coins className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium">积分不足</h3>
                      <div className="mt-2 text-sm">
                        <p>每次重新生成需要 50 积分，您当前仅有 {credits} 积分</p>
                        <button 
                          onClick={() => {
                            navigate('/profile');
                            setTimeout(() => {
                              const element = document.getElementById('credits-tab');
                              if (element) element.click();
                            }, 100);
                          }}
                          className="mt-2 text-[#F52E6B] hover:text-[#FE6587] font-medium"
                        >
                          立即前往【积分中心】购买积分
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleRetry}
                  disabled={retryLoading}
                  className="bg-[#F52E6B] text-white px-6 py-2 rounded-lg hover:bg-[#FE6587] disabled:opacity-50 flex items-center"
                >
                  {retryLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      重试中...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      重新生成 (消耗50积分)
                    </>
                  )}
                </button>
              )}
            </div>
          ) : hasError ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="bg-red-100 text-red-600 p-4 rounded-lg mb-6 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                <p>生成行程时出现错误</p>
              </div>
              
              {showCreditWarning ? (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg max-w-md">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <Coins className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium">积分不足</h3>
                      <div className="mt-2 text-sm">
                        <p>每次重新生成需要 50 积分，您当前仅有 {credits} 积分</p>
                        <button 
                          onClick={() => {
                            navigate('/profile');
                            setTimeout(() => {
                              const element = document.getElementById('credits-tab');
                              if (element) element.click();
                            }, 100);
                          }}
                          className="mt-2 text-[#F52E6B] hover:text-[#FE6587] font-medium"
                        >
                          立即前往【积分中心】购买积分
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleRetry}
                  disabled={retryLoading}
                  className="bg-[#F52E6B] text-white px-6 py-2 rounded-lg hover:bg-[#FE6587] disabled:opacity-50 flex items-center"
                >
                  {retryLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      重试中...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      重新生成 (消耗50积分)
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="border-b border-gray-200 pb-4 mb-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                  {plan.from_location} → {plan.to_location}
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <MapPin className="h-5 w-5 text-[#F52E6B]" />
                    <span>{plan.from_location} → {plan.to_location}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Calendar className="h-5 w-5 text-[#F52E6B]" />
                    <span>{new Date(plan.travel_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Clock className="h-5 w-5 text-[#F52E6B]" />
                    <span>{plan.days}天</span>
                  </div>
                </div>
              </div>

              {/* Preferences */}
              {plan.preferences?.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-3">旅行偏好</h2>
                  <div className="flex flex-wrap gap-2">
                    {plan.preferences.map((pref, index) => (
                      <span key={index} className="px-3 py-1 bg-pink-50 text-[#F52E6B] rounded-full text-sm">
                        {pref}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Plan Content */}
              <div className="prose max-w-none">
                {renderPlanContent()}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Import the icons used in the component
function Star(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" />
    </svg>
  );
}

function Users(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function Bus(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 6v6" />
      <path d="M16 6v6" />
      <path d="M2 12h20" />
      <path d="M7 18h10" />
      <path d="M18 18h1a2 2 0 0 0 2-2v-7a5 5 0 0 0-5-5H8a5 5 0 0 0-5 5v7a2 2 0 0 0 2 2h1" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  );
}

function Utensils(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </svg>
  );
}

function Lightbulb(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  );
}