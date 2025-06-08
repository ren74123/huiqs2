import request from '@/api/request';

export async function getUserTravelPlans(userId: string, token: string) {
  return await request({
    url: '/api/travel_plan_logs',
    method: 'GET',
    data: {
      filter: { user_id: `eq.${userId}` },
      order: 'created_at.desc'
    },
    token
  });
}

export async function getTravelPlan(planId: string, token: string) {
  return await request({
    url: `/api/travel_plan_logs/${planId}`,
    method: 'GET',
    token
  });
}

export async function createTravelPlan(planData: any, token: string) {
  return await request({
    url: '/api/travel_plan_logs',
    method: 'POST',
    data: planData,
    token
  });
}

export async function updateTravelPlan(planId: string, updates: any, token: string) {
  return await request({
    url: `/api/travel_plan_logs/${planId}`,
    method: 'PATCH',
    data: updates,
    token
  });
}

export async function generateTravelPlan(params: any, token: string) {
  return await request({
    url: '/api/plan/generate',
    method: 'POST',
    data: params,
    token
  });
}

export async function getUserFavorites(userId: string, token: string) {
  return await request({
    url: '/api/favorites',
    method: 'GET',
    data: {
      filter: { user_id: `eq.${userId}` },
      select: '*,travel_plan_logs(id,from_location,to_location,travel_date,days)',
      order: 'created_at.desc'
    },
    token
  });
}

export async function togglePlanFavorite(planId: string, userId: string, token: string) {
  const existing = await request({
    url: '/api/favorites',
    method: 'GET',
    data: {
      filter: {
        user_id: `eq.${userId}`,
        plan_id: `eq.${planId}`
      }
    },
    token
  });

  if (existing?.length > 0) {
    await request({
      url: '/api/favorites',
      method: 'DELETE',
      data: {
        filter: {
          user_id: `eq.${userId}`,
          plan_id: `eq.${planId}`
        }
      },
      token
    });
    return false;
  } else {
    await request({
      url: '/api/favorites',
      method: 'POST',
      data: {
        user_id: userId,
        plan_id: planId
      },
      token
    });
    return true;
  }
}

export default {
  getUserTravelPlans,
  getTravelPlan,
  createTravelPlan,
  updateTravelPlan,
  generateTravelPlan,
  getUserFavorites,
  togglePlanFavorite
};
