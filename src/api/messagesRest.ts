// src/api/messagesRest.ts (Web/H5 完整等价版本)

import { request } from '@/utils/request';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export async function getUserMessages(userId: string, token: string) {
  const url = `${supabaseUrl}/rest/v1/messages?receiver_id=eq.${userId}&select=*,sender:profiles!sender_id(full_name,avatar_url,user_role)&order=created_at.desc`;
  const res = await request(url, {
    method: 'GET',
    headers: buildHeaders(token)
  });
  return await res.json();
}

export async function getSystemMessages(token: string) {
  const url = `${supabaseUrl}/rest/v1/messages?type=eq.system&select=*,sender:profiles!sender_id(full_name,avatar_url,user_role)&order=created_at.desc`;
  const res = await request(url, {
    method: 'GET',
    headers: buildHeaders(token)
  });
  return await res.json();
}

export async function getOrderMessages(agentId: string, token: string) {
  const url = `${supabaseUrl}/rest/v1/message_logs?orders.travel_packages.agent_id=eq.${agentId}&select=*,orders!inner(id,order_number,travel_packages!inner(title,destination,agent_id))&order=created_at.desc`;
  const res = await request(url, {
    method: 'GET',
    headers: buildHeaders(token)
  });
  return await res.json();
}

export async function sendMessage(messageData: any, token: string) {
  const res = await request(`${supabaseUrl}/rest/v1/messages`, {
    method: 'POST',
    headers: buildHeaders(token, true),
    body: messageData
  });
  return await res.json();
}

export async function markMessageAsRead(messageId: string, token: string) {
  const url = `${supabaseUrl}/rest/v1/messages?id=eq.${messageId}`;
  const res = await request(url, {
    method: 'PATCH',
    headers: buildHeaders(token, true),
    body: { read: true }
  });
  return await res.json();
}

export async function markAllMessagesAsRead(userId: string, token: string) {
  const url = `${supabaseUrl}/rest/v1/messages?receiver_id=eq.${userId}&read=eq.false`;
  const res = await request(url, {
    method: 'PATCH',
    headers: buildHeaders(token, true),
    body: { read: true }
  });
  return await res.json();
}

export async function getUnreadMessageCount(userId: string, token: string) {
  try {
    const roleUrl = `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=user_role`;
    const roleRes = await request(roleUrl, { method: 'GET', headers: buildHeaders(token) });
    const userRole = (await roleRes.json())[0]?.user_role;

    const count = async (table: string, filter: string) => {
      const url = `${supabaseUrl}/rest/v1/${table}?${filter}&select=id`; // just count rows
      const res = await request(url, { method: 'GET', headers: buildHeaders(token) });
      return (await res.json()).length;
    };

    const directCount = await count('messages', `receiver_id=eq.${userId}&read=eq.false`);

    let systemCount = 0;
    let orderUpdateCount = 0;
    let enterpriseCount = 0;

    if (userRole === 'admin' || userRole === 'agent') {
      systemCount = await count('messages', `type=eq.system&read=eq.false`);
    }
    if (userRole === 'agent') {
      orderUpdateCount = await count('message_logs', `orders.travel_packages.agent_id=eq.${userId}&read=eq.false`);
      enterpriseCount = await count('enterprise_orders', `status=eq.approved&has_paid_info_fee=is.false`);
    }

    return directCount + systemCount + orderUpdateCount + enterpriseCount;
  } catch (e) {
    console.error('Error getting unread count:', e);
    return 0;
  }
}

function buildHeaders(token: string, write = false) {
  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(write ? { Prefer: 'return=representation' } : {})
  };
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
