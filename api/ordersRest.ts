import request from '@/api/request';

export async function getUserOrders(userId: string, token: string) {
  try {
    return await request({
      url: '/api/orders',
      method: 'GET',
      data: { user_id: userId },
      token
    });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    throw error;
  }
}

export async function getAgentOrders(agentId: string, token: string) {
  try {
    return await request({
      url: '/api/orders',
      method: 'GET',
      data: {
        filter: { 'travel_packages.agent_id': `eq.${agentId}` },
        select: `*,travel_packages!inner(id,title,price,destination,duration,image)`,
        order: 'created_at.desc'
      },
      token
    });
  } catch (error) {
    console.error('Error fetching agent orders:', error);
    throw error;
  }
}

export async function createOrder(orderData: any, token: string) {
  try {
    return await request({
      url: '/api/orders',
      method: 'POST',
      data: orderData,
      token
    });
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}

export async function updateOrderStatus(orderId: string, status: string, token: string) {
  try {
    return await request({
      url: `/api/orders/${orderId}`,
      method: 'PATCH',
      data: { status },
      token
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
}

export async function updateOrderContractStatus(orderId: string, contractStatus: string, token: string) {
  try {
    return await request({
      url: `/api/orders/${orderId}`,
      method: 'PATCH',
      data: { contract_status: contractStatus },
      token
    });
  } catch (error) {
    console.error('Error updating order contract status:', error);
    throw error;
  }
}

export async function getOrderMessages(orderId: string, token: string) {
  try {
    return await request({
      url: '/api/message_logs',
      method: 'GET',
      data: {
        filter: { order_id: `eq.${orderId}` },
        order: 'created_at.asc'
      },
      token
    });
  } catch (error) {
    console.error('Error fetching order messages:', error);
    throw error;
  }
}

export async function sendOrderMessage(orderId: string, fromRole: 'user' | 'agent', message: string, token: string) {
  try {
    return await request({
      url: '/api/message_logs',
      method: 'POST',
      data: {
        order_id: orderId,
        from_role: fromRole,
        message,
        read: false
      },
      token
    });
  } catch (error) {
    console.error('Error sending order message:', error);
    throw error;
  }
}

export async function markOrderMessagesAsRead(orderId: string, token: string) {
  try {
    return await request({
      url: '/api/message_logs',
      method: 'PATCH',
      data: {
        filter: { order_id: `eq.${orderId}`, read: 'eq.false' },
        data: { read: true }
      },
      token
    });
  } catch (error) {
    console.error('Error marking order messages as read:', error);
    throw error;
  }
}

export async function payInfoFee(orderId: string, agentId: string, amount: number, remark: string, token: string) {
  try {
    await request({
      url: '/api/info_fee_logs',
      method: 'POST',
      data: {
        order_id: orderId,
        agent_id: agentId,
        amount,
        remark: remark || '信息费'
      },
      token
    });

    await request({
      url: `/api/orders/${orderId}`,
      method: 'PATCH',
      data: { has_paid_info_fee: true },
      token
    });

    return true;
  } catch (error) {
    console.error('Error paying info fee:', error);
    throw error;
  }
}

export async function getInfoFeeLogs(agentId: string, token: string) {
  try {
    return await request({
      url: '/api/info_fee_logs',
      method: 'GET',
      data: {
        filter: { agent_id: `eq.${agentId}` },
        select: `*,order:orders(id,order_number,travel_packages(title))`,
        order: 'created_at.desc'
      },
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
