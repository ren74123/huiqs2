import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';
import { PlanCard } from '../../components/PlanCard';

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

export function TravelPlans() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [plans, setPlans] = useState<TravelPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPlans();
    }
  }, [user]);

  async function fetchPlans() {
    try {
      const { data, error } = await supabase
        .from('travel_plan_logs')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#F52E6B] border-t-transparent"></div>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="text-center py-12">
        <Map className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">暂无行程规划</p>
        <button
          onClick={() => navigate('/plan')}
          className="text-[#F52E6B] hover:text-[#FE6587] font-medium"
        >
          制定行程
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {plans.map((plan) => (
        <PlanCard
          key={plan.id}
          from={plan.from_location}
          to={plan.to_location}
          days={plan.days}
          date={plan.travel_date}
          preferences={plan.preferences || []}
          status={plan.plan_text === '正在生成您的专属行程，可以稍后查看' ? 'generating' : 'completed'}
          onView={() => navigate(`/plan-log/${plan.id}`)}
          onShare={() => navigate(`/share/plan/${plan.id}`)}
        />
      ))}
    </div>
  );
}