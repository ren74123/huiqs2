import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Calendar, Clock, Share2, Download, ArrowLeft } from 'lucide-react';
import { supabase } from '@/../lib/supabase';
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

export function SharePlan() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [formattedPlan, setFormattedPlan] = useState<string>('');

  useEffect(() => {
    if (id) {
      fetchPlan();
    }
  }, [id]);

  useEffect(() => {
    if (plan?.plan_text) {
      setFormattedPlan(formatPlanText(plan.plan_text));
    }
  }, [plan]);

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
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg text-gray-600">Travel plan not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => window.history.back()}
          className="flex items-center text-gray-600 hover:text-[#F52E6B]"
        >
          <ArrowLeft className="h-5 w-5 mr-1" />
          <span>返回</span>
        </button>
        
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
              if (navigator.share) {
                navigator.share({
                  title: `${plan.from_location} → ${plan.to_location} 旅行计划`,
                  text: `查看我的 ${plan.from_location} → ${plan.to_location} ${plan.days}天旅行计划`,
                  url: window.location.href
                });
              }
            }}
            className="flex items-center space-x-1 bg-gray-100 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-200"
          >
            <Share2 className="h-4 w-4" />
            <span>分享</span>
          </button>
        </div>
      </div>

      <div id="plan-card" className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6">
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

          <div className="mt-8 text-center text-sm text-gray-500">
            {saving ? '保存中...' : '点击右上角分享'}
          </div>
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

function AlertTriangle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}