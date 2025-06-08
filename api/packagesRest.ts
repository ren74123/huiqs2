import request from '@/api/request';

const API_BASE = '/api';

export async function getTravelPackages(options = {}, token) {
  try {
    const res = await request({
      url: `${API_BASE}/travel-packages`,
      method: 'GET',
      data: options,
      authRequired: !!token
    });
    return res.data;
  } catch (error) {
    console.error('Error fetching travel packages:', error);
    throw error;
  }
}

export async function getTravelPackage(id, token) {
  try {
    const res = await request({
      url: `${API_BASE}/travel-packages/${id}`,
      method: 'GET',
      authRequired: !!token
    });
    return res.data;
  } catch (error) {
    console.error('Error fetching travel package:', error);
    throw error;
  }
}

export async function createTravelPackage(packageData, token) {
  try {
    return await request({
      url: `${API_BASE}/travel-packages`,
      method: 'POST',
      data: packageData,
      authRequired: true,
      token
    });
  } catch (error) {
    console.error('Error creating travel package:', error);
    throw error;
  }
}

export async function updateTravelPackage(id, updates, token) {
  try {
    return await request({
      url: `${API_BASE}/travel-packages/${id}`,
      method: 'PATCH',
      data: updates,
      authRequired: true,
      token
    });
  } catch (error) {
    console.error('Error updating travel package:', error);
    throw error;
  }
}

export async function deleteTravelPackage(id, token) {
  try {
    return await request({
      url: `${API_BASE}/travel-packages/${id}`,
      method: 'DELETE',
      authRequired: true,
      token
    });
  } catch (error) {
    console.error('Error deleting travel package:', error);
    throw error;
  }
}

export async function togglePackageFavorite(packageId, userId, token) {
  try {
    return await request({
      url: `${API_BASE}/favorites/packages/${packageId}`,
      method: 'POST',
      data: { userId },
      authRequired: true,
      token
    });
  } catch (error) {
    console.error('Error toggling package favorite:', error);
    throw error;
  }
}

export async function isPackageFavorited(packageId, userId, token) {
  try {
    const res = await request({
      url: `${API_BASE}/favorites/packages/${packageId}?userId=${userId}`,
      method: 'GET',
      authRequired: true,
      token
    });
    return res.data?.favorited;
  } catch (error) {
    console.error('Error checking package favorite:', error);
    throw error;
  }
}

export async function getPackageReviews(packageId, token) {
  try {
    const res = await request({
      url: `${API_BASE}/travel-packages/${packageId}/reviews`,
      method: 'GET',
      authRequired: !!token
    });
    return res.data;
  } catch (error) {
    console.error('Error fetching package reviews:', error);
    throw error;
  }
}

export async function createOrUpdateReview(packageId, userId, rating, comment, token) {
  try {
    return await request({
      url: `${API_BASE}/travel-packages/${packageId}/reviews`,
      method: 'POST',
      data: { userId, rating, comment },
      authRequired: true,
      token
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    throw error;
  }
}

export default {
  getTravelPackages,
  getTravelPackage,
  createTravelPackage,
  updateTravelPackage,
  deleteTravelPackage,
  togglePackageFavorite,
  isPackageFavorited,
  getPackageReviews,
  createOrUpdateReview
};
