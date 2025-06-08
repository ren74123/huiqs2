import { request } from '../utils/request';
import db from './supabaseRest';

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;
/**
 * Get user orders
 * @param userId User ID
 * @param token Auth token
 * @returns User orders
 */
export async function getUserOrders(userId: string, token: string) {
  try {
    return await db.select('orders', {
      filter: { user_id: `eq.${userId}` },
      select: `*,travel_packages(id,title,price,destination,duration,image,agent:profiles!travel_packages_agent_id_fkey(full_name,agency_id))`,
      order: 'created_at.desc',
      token
    });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    throw error;
  }
}

/**
 * Get agent orders
 * @param agentId Agent ID
 * @param token Auth token
 * @returns Agent orders
 */
export async function getAgentOrders(agentId: string, token: string) {
  try {
    return await db.select('orders', {
      filter: { 'travel_packages.agent_id': `eq.${agentId}` },
      select: `*,travel_packages!inner(id,title,price,destination,duration,image)`,
      order: 'created_at.desc',
      token
    });
  } catch (error) {
    console.error('Error fetching agent orders:', error);
    throw error;
  }
}

/**
 * Create a new order
 * @param orderData Order data
 * @param token Auth token
 * @returns Created order
 */
export async function createOrder(orderData: any, token: string) {
  try {
    return await db.insert('orders', orderData, token);
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}

/**
 * Update order status
 * @param orderId Order ID
 * @param status New status
 * @param token Auth token
 * @returns Updated order
 */
export async function updateOrderStatus(orderId: string, status: string, token: string) {
  try {
    return await db.update('orders', { id: `eq.${orderId}` }, { status }, token);
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
}

/**
 * Update order contract status
 * @param orderId Order ID
 * @param contractStatus New contract status
 * @param token Auth token
 * @returns Updated order
 */
export async function updateOrderContractStatus(orderId: string, contractStatus: string, token: string) {
  try {
    return await db.update('orders', { id: `eq.${orderId}` }, { contract_status: contractStatus }, token);
  } catch (error) {
    console.error('Error updating order contract status:', error);
    throw error;
  }
}

/**
 * Get order messages
 * @param orderId Order ID
 * @param token Auth token
 * @returns Order messages
 */
export async function getOrderMessages(orderId: string, token: string) {
  try {
    return await db.select('message_logs', {
      filter: { order_id: `eq.${orderId}` },
      order: 'created_at.asc',
      token
    });
  } catch (error) {
    console.error('Error fetching order messages:', error);
    throw error;
  }
}

/**
 * Send order message
 * @param orderId Order ID
 * @param fromRole Sender role (user or agent)
 * @param message Message content
 * @param token Auth token
 * @returns Created message
 */
export async function sendOrderMessage(orderId: string, fromRole: 'user' | 'agent', message: string, token: string) {
  try {
    return await db.insert('message_logs', {
      order_id: orderId,
      from_role: fromRole,
      message,
      read: false
    }, token);
  } catch (error) {
    console.error('Error sending order message:', error);
    throw error;
  }
}

/**
 * Mark order messages as read
 * @param orderId Order ID
 * @param token Auth token
 * @returns Success status
 */
export async function markOrderMessagesAsRead(orderId: string, token: string) {
  try {
    return await db.update('message_logs', 
      { order_id: `eq.${orderId}`, read: 'eq.false' }, 
      { read: true }, 
      token
    );
  } catch (error) {
    console.error('Error marking order messages as read:', error);
    throw error;
  }
}

/**
 * Pay info fee
 * @param orderId Order ID
 * @param agentId Agent ID
 * @param amount Amount
 * @param remark Remark
 * @param token Auth token
 * @returns Success status
 */
export async function payInfoFee(orderId: string, agentId: string, amount: number, remark: string, token: string) {
  try {
    // Create info fee log
    await db.insert('info_fee_logs', {
      order_id: orderId,
      agent_id: agentId,
      amount,
      remark: remark || '信息费'
    }, token);
    
    // Update order has_paid_info_fee status
    await db.update('orders', { id: `eq.${orderId}` }, { has_paid_info_fee: true }, token);
    
    return true;
  } catch (error) {
    console.error('Error paying info fee:', error);
    throw error;
  }
}

/**
 * Get info fee logs
 * @param agentId Agent ID
 * @param token Auth token
 * @returns Info fee logs
 */
export async function getInfoFeeLogs(agentId: string, token: string) {
  try {
    return await db.select('info_fee_logs', {
      filter: { agent_id: `eq.${agentId}` },
      select: `*,order:orders(id,order_number,travel_packages(title))`,
      order: 'created_at.desc',
      token
    });
  } catch (error) {
    console.error('Error fetching info fee logs:', error);
    throw error;
  }
}

export default {
  getUserOrders,
  getAgentOrders,
  createOrder,
  updateOrderStatus,
  updateOrderContractStatus,
  getOrderMessages,
  sendOrderMessage,
  markOrderMessagesAsRead,
  payInfoFee,
  getInfoFeeLogs
};