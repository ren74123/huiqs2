import { request } from '../utils/request';

const BASE_URL = '/api/travel-plans';

/**
 * Get user travel plans
 * @param userId User ID
 * @param token Auth token
 */
export async function getUserTravelPlans(userId: string, token: string) {
  try {
    const response = await request(`${BASE_URL}?user_id=${userId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching user travel plans:', error);
    throw error;
  }
}

/**
 * Get travel plan by ID
 * @param planId Plan ID
 * @param token Auth token
 */
export async function getTravelPlan(planId: string, token: string) {
  try {
    const response = await request(`${BASE_URL}/${planId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return await response.json();
  } catch (error) {
    console.error('Error fetching travel plan:', error);
    throw error;
  }
}

/**
 * Create a new travel plan
 * @param planData Plan data
 * @param token Auth token
 */
export async function createTravelPlan(planData: any, token: string) {
  try {
    const response = await request(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: planData
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error creating travel plan:', error);
    throw error;
  }
}

/**
 * Update a travel plan
 * @param planId Plan ID
 * @param updates Updated fields
 * @param token Auth token
 */
export async function updateTravelPlan(planId: string, updates: any, token: string) {
  try {
    const response = await request(`${BASE_URL}/${planId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: updates
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error updating travel plan:', error);
    throw error;
  }
}

/**
 * Generate travel plan via Coze API
 * @param params Generation parameters
 * @param token Auth token
 */
export async function generateTravelPlan(params: any, token: string) {
  try {
    const response = await request(`/api/generate-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: params
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error generating travel plan:', error);
    throw error;
  }
}

/**
 * Get user favorite plans
 * @param userId User ID
 * @param token Auth token
 */
export async function getUserFavorites(userId: string, token: string) {
  try {
    const response = await request(`/api/favorites?user_id=${userId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching favorites:', error);
    throw error;
  }
}

/**
 * Toggle favorite for a plan
 * @param planId Plan ID
 * @param userId User ID
 * @param token Auth token
 */
export async function togglePlanFavorite(planId: string, userId: string, token: string) {
  try {
    const response = await request(`/api/favorites/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: {
        user_id: userId,
        plan_id: planId
      }
    });

    const data = await response.json();
    return data?.favorited ?? false;
  } catch (error) {
    console.error('Error toggling favorite:', error);
    throw error;
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