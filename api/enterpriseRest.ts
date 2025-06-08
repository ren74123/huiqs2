import Taro from '@tarojs/taro';
import request from 'utils/request';

// Environment variables
const supabaseUrl = process.env.TARO_APP_SUPABASE_URL || 'https://qzvbtrakodqlsdbzbemp.supabase.co';
const supabaseAnonKey = process.env.TARO_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6dmJ0cmFrb2RxbHNkYnpiZW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzOTQxMDQsImV4cCI6MjA1Nzk3MDEwNH0.LxRnUvWgNEXw6yqTr3SCFi9RzGUcbBjljzPoP15QCIc';

/**
 * Get enterprise orders
 * @param options Filter options
 * @param token Auth token
 * @returns Enterprise orders
 */
export async function getEnterpriseOrders(
  options: {
    userId?: string;
    status?: string;
    dateRange?: { start: string; end: string };
  } = {},
  token: string
) {
  try {
    const filter: Record<string, any> = {};
    
    // Add user filter
    if (options.userId) {
      filter.user_id = `eq.${options.userId}`;
    }
    
    // Add status filter
    if (options.status && options.status !== 'all') {
      filter.status = `eq.${options.status}`;
    }
    
    // Add date range filter
    if (options.dateRange?.start && options.dateRange?.end) {
      filter.travel_date = `gte.${options.dateRange.start},lte.${options.dateRange.end}`;
    }
    
    return await request({
      url: '/enterprise_orders',
      method: 'GET',
      data: {
        filter,
        order: 'created_at.desc',
      }
    });
  } catch (error) {
    console.error('Error fetching enterprise orders:', error);
    throw error;
  }
}

/**
 * Get enterprise order by ID
 * @param orderId Order ID
 * @param token Auth token
 * @returns Enterprise order
 */
export async function getEnterpriseOrder(orderId: string, token: string) {
  try {
    const orders = await request({
      url: '/enterprise_orders',
      method: 'GET',
      data: {
        filter: { id: `eq.${orderId}` },
      }
    });
    
    if (orders.length === 0) {
      throw new Error('Order not found');
    }
    
    return orders[0];
  } catch (error) {
    console.error('Error fetching enterprise order:', error);
    throw error;
  }
}

/**
 * Create enterprise order
 * @param orderData Order data
 * @param token Auth token
 * @returns Created order
 */
export async function createEnterpriseOrder(orderData: any, token: string) {
  try {
    return await request({
      url: '/enterprise_orders',
      method: 'POST',
      data: orderData,
    });
  } catch (error) {
    console.error('Error creating enterprise order:', error);
    throw error;
  }
}

/**
 * Update enterprise order status
 * @param orderId Order ID
 * @param status New status
 * @param token Auth token
 * @returns Updated order
 */
export async function updateEnterpriseOrderStatus(orderId: string, status: string, token: string) {
  try {
    return await request({
      url: '/enterprise_orders',
      method: 'PATCH',
      data: {
        filter: { id: `eq.${orderId}` },
        data: {
          status,
          updated_at: new Date().toISOString()
        },
      }
    });
  } catch (error) {
    console.error('Error updating enterprise order status:', error);
    throw error;
  }
}

/**
 * Get enterprise order applications
 * @param orderId Order ID
 * @param token Auth token
 * @returns Order applications
 */
export async function getEnterpriseOrderApplications(orderId: string, token: string) {
  try {
    return await request({
      url: '/enterprise_order_applications',
      method: 'GET',
      data: {
        filter: { order_id: `eq.${orderId}` },
        select: '*,agent:profiles!enterprise_order_applications_agent_id_fkey(full_name,agency_id)',
        order: 'created_at.desc',
      }
    });
  } catch (error) {
    console.error('Error fetching enterprise order applications:', error);
    throw error;
  }
}

/**
 * Create enterprise order application
 * @param applicationData Application data
 * @param token Auth token
 * @returns Created application
 */
export async function createEnterpriseOrderApplication(applicationData: any, token: string) {
  try {
    return await request({
      url: '/enterprise_order_applications',
      method: 'POST',
      data: applicationData,
    });
  } catch (error) {
    console.error('Error creating enterprise order application:', error);
    throw error;
  }
}

/**
 * Update enterprise order application status
 * @param applicationId Application ID
 * @param status New status
 * @param reviewReason Review reason
 * @param token Auth token
 * @returns Updated application
 */
export async function updateEnterpriseOrderApplicationStatus(
  applicationId: string,
  status: string,
  reviewReason: string,
  token: string
) {
  try {
    return await request({
      url: '/enterprise_order_applications',
      method: 'PATCH',
      data: {
        filter: { id: `eq.${applicationId}` },
        data: {
          status,
          review_reason: reviewReason,
          updated_at: new Date().toISOString()
        },
      }
    });
  } catch (error) {
    console.error('Error updating enterprise order application status:', error);
    throw error;
  }
}

/**
 * Pay enterprise info fee
 * @param orderId Order ID
 * @param agentId Agent ID
 * @param amount Amount
 * @param token Auth token
 * @returns Success status
 */
export async function payEnterpriseInfoFee(orderId: string, agentId: string, amount: number, token: string) {
  try {
    // Create info fee log
    await request({
      url: '/info_fee_logs',
      method: 'POST',
      data: {
        order_id: orderId,
        agent_id: agentId,
        amount,
        remark: '企业团建信息费'
      }
    });
    
    // Update order has_paid_info_fee status
    await request({
      url: '/enterprise_orders',
      method: 'PATCH',
      data: {
        filter: { id: `eq.${orderId}` },
        data: {
          has_paid_info_fee: true,
          updated_at: new Date().toISOString()
        },
      }
    );
    
    return true;
  } catch (error) {
    console.error('Error paying enterprise info fee:', error);
    throw error;
  }
}

/**
 * Get enterprise info fee logs
 * @param agentId Agent ID
 * @param token Auth token
 * @returns Info fee logs
 */
export async function getEnterpriseInfoFeeLogs(agentId: string, token: string) {
  try {
    return await request({
      url: '/info_fee_logs',
      method: 'GET',
      data: {
        filter: { 
          agent_id: `eq.${agentId}`,
          remark: 'eq.企业团建信息费'
        },
        order: 'created_at.desc',
      }
    });
  } catch (error) {
    console.error('Error fetching enterprise info fee logs:', error);
    throw error;
  }
}

export default {
  getEnterpriseOrders,
  getEnterpriseOrder,
  createEnterpriseOrder,
  updateEnterpriseOrderStatus,
  getEnterpriseOrderApplications,
  createEnterpriseOrderApplication,
  updateEnterpriseOrderApplicationStatus,
  payEnterpriseInfoFee,
  getEnterpriseInfoFeeLogs
};
