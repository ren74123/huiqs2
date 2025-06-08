import { request } from '@tarojs/taro';
import db from './supabaseRest';

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;
/**
 * Get travel packages with filtering options
 * @param options Filter options
 * @param token Auth token
 * @returns Travel packages
 */
export async function getTravelPackages(
  options: {
    status?: string;
    destination?: string;
    departure?: string;
    sortBy?: 'hot' | 'discount' | 'international';
    limit?: number;
    offset?: number;
  } = {},
  token?: string
) {
  try {
    const filter: Record<string, any> = {};
    
    // Add status filter
    if (options.status && options.status !== 'all') {
      filter.status = `eq.${options.status}`;
    } else {
      // Default to approved packages
      filter.status = 'eq.approved';
    }
    
    // Add destination filter
    if (options.destination) {
      filter.destination = `ilike.%${options.destination}%`;
    }
    
    // Add departure filter
    if (options.departure) {
      filter.departure = `ilike.%${options.departure}%`;
    }
    
    // Add sorting
    let order = 'hot_score.desc';
    if (options.sortBy === 'discount') {
      filter.is_discounted = 'eq.true';
      order = 'discount_price.asc';
    } else if (options.sortBy === 'international') {
      filter.is_international = 'eq.true';
    }
    
    // Add pagination
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    
    // Get packages with agent info
    const packages = await db.select('travel_packages', {
      filter,
      select: '*,agent:profiles!travel_packages_agent_id_fkey(full_name,agency_id)',
      order,
      limit,
      offset,
      token
    });
    
    return packages;
  } catch (error) {
    console.error('Error fetching travel packages:', error);
    throw error;
  }
}

/**
 * Get a single travel package by ID
 * @param id Package ID
 * @param token Auth token
 * @returns Travel package
 */
export async function getTravelPackage(id: string, token?: string) {
  try {
    const packages = await db.select('travel_packages', {
      filter: { id: `eq.${id}` },
      select: '*,agent:profiles!travel_packages_agent_id_fkey(full_name,agency_id)',
      token
    });
    
    if (packages.length === 0) {
      throw new Error('Package not found');
    }
    
    // Increment views
    await incrementPackageViews(id);
    
    return packages[0];
  } catch (error) {
    console.error('Error fetching travel package:', error);
    throw error;
  }
}

/**
 * Increment package views
 * @param packageId Package ID
 * @returns Success status
 */
export async function incrementPackageViews(packageId: string) {
  try {
    return await db.rpc('increment_package_views', { package_id: packageId });
  } catch (error) {
    console.error('Error incrementing package views:', error);
    // Don't throw error for view increments as it's not critical
    return false;
  }
}

/**
 * Create a new travel package
 * @param packageData Package data
 * @param token Auth token
 * @returns Created package
 */
export async function createTravelPackage(packageData: any, token: string) {
  try {
    return await db.insert('travel_packages', packageData, token);
  } catch (error) {
    console.error('Error creating travel package:', error);
    throw error;
  }
}

/**
 * Update a travel package
 * @param id Package ID
 * @param updates Package updates
 * @param token Auth token
 * @returns Updated package
 */
export async function updateTravelPackage(id: string, updates: any, token: string) {
  try {
    return await db.update('travel_packages', { id: `eq.${id}` }, updates, token);
  } catch (error) {
    console.error('Error updating travel package:', error);
    throw error;
  }
}

/**
 * Delete a travel package
 * @param id Package ID
 * @param token Auth token
 * @returns Success status
 */
export async function deleteTravelPackage(id: string, token: string) {
  try {
    return await db.remove('travel_packages', { id: `eq.${id}` }, token);
  } catch (error) {
    console.error('Error deleting travel package:', error);
    throw error;
  }
}

/**
 * Toggle package favorite status
 * @param packageId Package ID
 * @param userId User ID
 * @param token Auth token
 * @returns Success status
 */
export async function togglePackageFavorite(packageId: string, userId: string, token: string) {
  try {
    // Check if already favorited
    const favorites = await db.select('package_favorites', {
      filter: {
        user_id: `eq.${userId}`,
        package_id: `eq.${packageId}`
      },
      token
    });
    
    if (favorites.length > 0) {
      // Remove favorite
      await db.remove('package_favorites', {
        user_id: `eq.${userId}`,
        package_id: `eq.${packageId}`
      }, token);
      return false;
    } else {
      // Add favorite
      await db.insert('package_favorites', {
        user_id: userId,
        package_id: packageId
      }, token);
      return true;
    }
  } catch (error) {
    console.error('Error toggling package favorite:', error);
    throw error;
  }
}

/**
 * Check if a package is favorited by a user
 * @param packageId Package ID
 * @param userId User ID
 * @param token Auth token
 * @returns Is favorited
 */
export async function isPackageFavorited(packageId: string, userId: string, token: string) {
  try {
    const favorites = await db.select('package_favorites', {
      filter: {
        user_id: `eq.${userId}`,
        package_id: `eq.${packageId}`
      },
      token
    });
    
    return favorites.length > 0;
  } catch (error) {
    console.error('Error checking package favorite:', error);
    throw error;
  }
}

/**
 * Get package reviews
 * @param packageId Package ID
 * @param token Auth token
 * @returns Package reviews
 */
export async function getPackageReviews(packageId: string, token?: string) {
  try {
    return await db.select('package_reviews', {
      filter: { package_id: `eq.${packageId}` },
      select: '*,user:profiles!package_reviews_user_id_fkey(full_name)',
      order: 'created_at.desc',
      token
    });
  } catch (error) {
    console.error('Error fetching package reviews:', error);
    throw error;
  }
}

/**
 * Create or update a package review
 * @param packageId Package ID
 * @param userId User ID
 * @param rating Rating
 * @param comment Comment
 * @param token Auth token
 * @returns Created or updated review
 */
export async function createOrUpdateReview(
  packageId: string,
  userId: string,
  rating: number,
  comment: string,
  token: string
) {
  try {
    // Check if review exists
    const reviews = await db.select('package_reviews', {
      filter: {
        user_id: `eq.${userId}`,
        package_id: `eq.${packageId}`
      },
      token
    });
    
    if (reviews.length > 0) {
      // Update existing review
      return await db.update('package_reviews', {
        user_id: `eq.${userId}`,
        package_id: `eq.${packageId}`
      }, {
        rating,
        comment
      }, token);
    } else {
      // Create new review
      return await db.insert('package_reviews', {
        user_id: userId,
        package_id: packageId,
        rating,
        comment
      }, token);
    }
  } catch (error) {
    console.error('Error creating or updating review:', error);
    throw error;
  }
}

export default {
  getTravelPackages,
  getTravelPackage,
  incrementPackageViews,
  createTravelPackage,
  updateTravelPackage,
  deleteTravelPackage,
  togglePackageFavorite,
  isPackageFavorited,
  getPackageReviews,
  createOrUpdateReview
};