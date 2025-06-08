// app/components/PlanForm.client.tsx
'use client';

import React, { useState } from 'react';

export default function TravelPlan() {
  const [from, setFrom] = useState('北京');
  const [to, setTo] = useState('上海');
  const [date, setDate] = useState('');
  const [days, setDays] = useState(3);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const allPreferences = ['美食', '历史', '人文', '科技', '自然', '主题乐园'];

  const handleSubmit = async () => {
    const payload = {
      from,
      to,
      date,
      days: Number(days),
      preferences: preferences.length > 0 ? preferences : ['无偏好']
    };

    setLoading(true);
    setResult('正在生成您的专属行程，可以稍后查看');
    
    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      setResult(data.planText || '生成失败');
    } catch (err) {
      setResult('请求失败，请检查网络或服务状态');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded shadow-md space-y-4">
      <h2 className="text-xl font-bold">智能行程生成器</h2>

      <div className="flex flex-col gap-2">
        <label>出发地</label>
        <input
          className="border rounded p-2"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />

        <label>目的地</label>
        <input
          className="border rounded p-2"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />

        <label>出发日期</label>
        <input
          type="date"
          className="border rounded p-2"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <label>旅行天数</label>
        <input
          type="number"
          className="border rounded p-2"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          min={1}
        />

        <label>旅行偏好</label>
        <div className="flex flex-wrap gap-3">
          {allPreferences.map((tag) => (
            <label key={tag} className="flex items-center space-x-1">
              <input
                type="checkbox"
                checked={preferences.includes(tag)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setPreferences([...preferences, tag]);
                  } else {
                    setPreferences(preferences.filter((t) => t !== tag));
                  }
                }}
              />
              <span>{tag}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 flex items-center justify-center space-x-2"
        disabled={loading}
      >
        {loading && (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
        )}
        <span>{loading ? '生成中...' : '生成旅行计划'}</span>
      </button>

      {result && (
        <div className="mt-4 whitespace-pre-wrap bg-gray-100 p-3 rounded border">
          {result}
        </div>
      )}
    </div>
  );
}