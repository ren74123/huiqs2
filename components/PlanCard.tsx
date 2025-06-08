import React from 'react';
import { MapPin, Calendar, Clock, Share2 } from 'lucide-react';

interface PlanCardProps {
  from: string;
  to: string;
  days: number;
  date: string;
  preferences: string[];
  status: 'generating' | 'completed';
  onView: () => void;
  onShare: () => void;
}

export function PlanCard({
  from,
  to,
  days,
  date,
  preferences,
  status,
  onView,
  onShare
}: PlanCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {from} → {to}
          </h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
            className="text-gray-400 hover:text-[#F52E6B]"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-gray-500 text-sm">
            <MapPin className="h-4 w-4 mr-2" />
            <span>{from} → {to}</span>
          </div>
          <div className="flex items-center text-gray-500 text-sm">
            <Calendar className="h-4 w-4 mr-2" />
            <span>{new Date(date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center text-gray-500 text-sm">
            <Clock className="h-4 w-4 mr-2" />
            <span>{days}天</span>
          </div>
        </div>

        {preferences.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {preferences.map((pref, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-pink-50 text-[#F52E6B] rounded-full text-sm"
              >
                {pref}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {status === 'generating' && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#F52E6B] border-t-transparent mr-2" />
            )}
            <span className={`text-sm ${
              status === 'generating' 
                ? 'text-yellow-600'
                : 'text-green-600'
            }`}>
              {status === 'generating' ? '正在生成您的专属行程，可以稍后查看' : '已完成'}
            </span>
          </div>
          <button
            onClick={onView}
            className="bg-[#F52E6B] text-white py-2 px-4 rounded-lg hover:bg-[#FE6587] transition-colors"
          >
            查看详情
          </button>
        </div>
      </div>
    </div>
  );
}