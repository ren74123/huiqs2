import request from '@/api/request';

/**
 * Get user messages
 */
export async function getUserMessages(userId: string, token: string) {
  return await request({
    url: '/messages',
    method: 'GET',
    data: {
      filter: { receiver_id: `eq.${userId}` },
      select: '*,sender:profiles!sender_id(full_name,avatar_url,user_role)',
      order: 'created_at.desc',
    }
  });
}

/**
 * Get system messages
 */
export async function getSystemMessages(token: string) {
  return await request({
    url: '/messages',
    method: 'GET',
    data: {
      filter: { type: 'eq.system' },
      select: '*,sender:profiles!sender_id(full_name,avatar_url,user_role)',
      order: 'created_at.desc',
    }
  });
}

/**
 * Get order messages
 */
export async function getOrderMessages(agentId: string, token: string) {
  return await request({
    url: '/message_logs',
    method: 'GET',
    data: {
      filter: { 'orders.travel_packages.agent_id': `eq.${agentId}` },
      select: `*,orders!inner(id,order_number,travel_packages!inner(title,destination,agent_id))`,
      order: 'created_at.desc',
    }
  });
}

/**
 * Send message
 */
export async function sendMessage(messageData: any, token: string) {
  return await request({
    url: '/messages',
    method: 'POST',
    data: messageData,
  });
}

/**
 * Mark message as read
 */
export async function markMessageAsRead(messageId: string, token: string) {
  return await request({
    url: '/messages',
    method: 'PATCH',
    data: {
      filter: { id: `eq.${messageId}` },
      data: { read: true },
    }
  });
}

/**
 * Mark all messages as read
 */
export async function markAllMessagesAsRead(userId: string, token: string) {
  return await request({
    url: '/messages',
    method: 'PATCH',
    data: {
      filter: { receiver_id: `eq.${userId}`, read: 'eq.false' },
      data: { read: true },
    }
  });
}

/**
 * Get unread message count
 */
export async function getUnreadMessageCount(userId: string, token: string) {
  try {
    const profiles = await request({
      url: '/profiles',
      method: 'GET',
      data: {
        filter: { id: `eq.${userId}` },
        select: 'user_role',
      }
    });

    const userRole = profiles[0]?.user_role;

    const directCount = await request({
      url: '/messages/count',
      method: 'GET',
      data: {
        filter: { receiver_id: `eq.${userId}`, read: 'eq.false' },
      }
    });

    let systemCount = 0;
    let orderUpdateCount = 0;
    let enterpriseCount = 0;

    if (userRole === 'admin' || userRole === 'agent') {
      systemCount = await request({
        url: '/messages/count',
        method: 'GET',
        data: {
          filter: { type: 'eq.system', read: 'eq.false' },
        }
      });
    }

    if (userRole === 'agent') {
      orderUpdateCount = await request({
        url: '/message_logs/count',
        method: 'GET',
        data: {
          filter: {
            'orders.travel_packages.agent_id': `eq.${userId}`,
            read: 'eq.false'
          },
        }
      });

      enterpriseCount = await request({
        url: '/enterprise_orders/count',
        method: 'GET',
        data: {
          filter: {
            status: 'eq.approved',
            has_paid_info_fee: 'is.false'
          },
        }
      });
    }

    return directCount + systemCount + orderUpdateCount + enterpriseCount;
  } catch (error) {
    console.error('Error getting unread message count:', error);
    return 0;
  }
}

export default {
  getUserMessages,
  getSystemMessages,
  getOrderMessages,
  sendMessage,
  markMessageAsRead,
  markAllMessagesAsRead,
  getUnreadMessageCount
};
