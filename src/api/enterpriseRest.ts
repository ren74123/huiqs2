// src/api/enterpriseRest.ts (Web/H5 完整等价版本)

import { request } from '@/utils/request';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

function buildHeaders(token: string, write = false) {
  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(write ? { Prefer: 'return=representation' } : {})
  };
}

export async function getEnterpriseOrders(options: {
  userId?: string;
  status?: string;
  dateRange?: { start: string; end: string };
} = {}, token: string) {
  try {
    const filters: string[] = [];
    if (options.userId) filters.push(`user_id=eq.${options.userId}`);
    if (options.status && options.status !== 'all') filters.push(`status=eq.${options.status}`);
    if (options.dateRange?.start && options.dateRange?.end)
      filters.push(`travel_date=gte.${options.dateRange.start}&travel_date=lte.${options.dateRange.end}`);

    const filterStr = filters.length ? `?${filters.join('&')}` : '';
    const url = `${supabaseUrl}/rest/v1/enterprise_orders${filterStr}&order=created_at.desc`;

    const res = await request(url, { method: 'GET', headers: buildHeaders(token) });
    return await res.json();
  } catch (error) {
    console.error('Error fetching enterprise orders:', error);
    throw error;
  }
}

export async function getEnterpriseOrder(orderId: string, token: string) {
  const url = `${supabaseUrl}/rest/v1/enterprise_orders?id=eq.${orderId}`;
  const res = await request(url, { method: 'GET', headers: buildHeaders(token) });
  const data = await res.json();
  if (data.length === 0) throw new Error('Order not found');
  return data[0];
}

export async function createEnterpriseOrder(orderData: any, token: string) {
  const res = await request(`${supabaseUrl}/rest/v1/enterprise_orders`, {
    method: 'POST',
    headers: buildHeaders(token, true),
    body: orderData
  });
  return await res.json();
}

export async function updateEnterpriseOrderStatus(orderId: string, status: string, token: string) {
  const res = await request(`${supabaseUrl}/rest/v1/enterprise_orders?id=eq.${orderId}`, {
    method: 'PATCH',
    headers: buildHeaders(token, true),
    body: {
      status,
      updated_at: new Date().toISOString()
    }
  });
  return await res.json();
}

export async function getEnterpriseOrderApplications(orderId: string, token: string) {
  const url = `${supabaseUrl}/rest/v1/enterprise_order_applications?order_id=eq.${orderId}&select=*,agent:profiles!enterprise_order_applications_agent_id_fkey(full_name,agency_id)&order=created_at.desc`;
  const res = await request(url, { method: 'GET', headers: buildHeaders(token) });
  return await res.json();
}

export async function createEnterpriseOrderApplication(applicationData: any, token: string) {
  const res = await request(`${supabaseUrl}/rest/v1/enterprise_order_applications`, {
    method: 'POST',
    headers: buildHeaders(token, true),
    body: applicationData
  });
  return await res.json();
}

export async function updateEnterpriseOrderApplicationStatus(
  applicationId: string,
  status: string,
  reviewReason: string,
  token: string
) {
  const res = await request(`${supabaseUrl}/rest/v1/enterprise_order_applications?id=eq.${applicationId}`, {
    method: 'PATCH',
    headers: buildHeaders(token, true),
    body: {
      status,
      review_reason: reviewReason,
      updated_at: new Date().toISOString()
    }
  });
  return await res.json();
}

export async function payEnterpriseInfoFee(orderId: string, agentId: string, amount: number, token: string) {
  await request(`${supabaseUrl}/rest/v1/info_fee_logs`, {
    method: 'POST',
    headers: buildHeaders(token, true),
    body: {
      order_id: orderId,
      agent_id: agentId,
      amount,
      remark: '企业团建信息费'
    }
  });

  await request(`${supabaseUrl}/rest/v1/enterprise_orders?id=eq.${orderId}`, {
    method: 'PATCH',
    headers: buildHeaders(token, true),
    body: {
      has_paid_info_fee: true,
      updated_at: new Date().toISOString()
    }
  });

  return true;
}

export async function getEnterpriseInfoFeeLogs(agentId: string, token: string) {
  const url = `${supabaseUrl}/rest/v1/info_fee_logs?agent_id=eq.${agentId}&remark=eq.企业团建信息费&order=created_at.desc`;
  const res = await request(url, { method: 'GET', headers: buildHeaders(token) });
  return await res.json();
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
