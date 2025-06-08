import { createClient } from '@supabase/supabase-js';
import { request } from '../utils/request.web';

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to build query string from filter object
const buildQueryString = (filter: Record<string, any>): string => {
  if (!filter || Object.keys(filter).length === 0) return '';
  
  const params = new URLSearchParams();
  
  Object.entries(filter).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      Object.entries(value).forEach(([op, opValue]) => {
        params.append(`${key}.${op}`, String(opValue));
      });
    } else {
      params.append(key, String(value));
    }
  });
  
  return params.toString();
};

/**
 * Select data from a table
 */
const select = async (
  table: string,
  options: {
    filter?: Record<string, any>,
    token?: string,
    select?: string,
    order?: string,
    limit?: number,
    offset?: number
  } = {}
): Promise<any[]> => {
  const { filter, select: columns, order, limit, offset, token } = options;
  
  let url = `${supabaseUrl}/rest/v1/${table}?`;
  
  // Add select columns
  if (columns) {
    url += `select=${columns}&`;
  }
  
  // Add filters
  if (filter) {
    Object.entries(filter).forEach(([key, value]) => {
      url += `${key}=${value}&`;
    });
  }
  
  // Add order
  if (order) {
    const [column, direction] = order.split('.');
    url += `order=${column}.${direction}&`;
  }
  
  // Add pagination
  if (limit !== undefined) {
    url += `limit=${limit}&`;
  }
  
  if (offset !== undefined) {
    url += `offset=${offset}&`;
  }
  
  // Add headers
  const headers: Record<string, string> = {
    apikey: supabaseAnonKey,
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Make request
  const response = await request(url, {
    method: 'GET',
    headers
  });
  
  return await response.json();
};

/**
 * Insert data into a table
 */
const insert = async (
  table: string,
  data: Record<string, any>,
  token?: string
): Promise<any> => {
  const url = `${supabaseUrl}/rest/v1/${table}`;
  
  const headers: Record<string, string> = {
    apikey: supabaseAnonKey,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await request(url, {
    method: 'POST',
    headers,
    body: data
  });
  
  const result = await response.json();
  return result[0] || result;
};

/**
 * Update data in a table
 */
const update = async (
  table: string,
  filter: Record<string, any>,
  data: Record<string, any>,
  token?: string
): Promise<any> => {
  let url = `${supabaseUrl}/rest/v1/${table}?`;
  
  // Add filters
  Object.entries(filter).forEach(([key, value]) => {
    url += `${key}=${value}&`;
  });
  
  const headers: Record<string, string> = {
    apikey: supabaseAnonKey,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await request(url, {
    method: 'PATCH',
    headers,
    body: data
  });
  
  const result = await response.json();
  return result[0] || result;
};

/**
 * Remove data from a table
 */
const remove = async (
  table: string,
  filter: Record<string, any>,
  token?: string
): Promise<any> => {
  let url = `${supabaseUrl}/rest/v1/${table}?`;
  
  // Add filters
  Object.entries(filter).forEach(([key, value]) => {
    url += `${key}=${value}&`;
  });
  
  const headers: Record<string, string> = {
    apikey: supabaseAnonKey,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await request(url, {
    method: 'DELETE',
    headers
  });
  
  const result = await response.json();
  return result[0] || result;
};

/**
 * Execute a stored procedure (RPC)
 */
const rpc = async (
  functionName: string,
  params: Record<string, any>,
  token?: string
): Promise<any> => {
  const url = `${supabaseUrl}/rest/v1/rpc/${functionName}`;
  
  const headers: Record<string, string> = {
    apikey: supabaseAnonKey,
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await request(url, {
    method: 'POST',
    headers,
    body: params
  });
  
  return await response.json();
};

/**
 * Count records in a table
 */
const count = async (
  table: string,
  filter?: Record<string, any>,
  token?: string
): Promise<number> => {
  let url = `${supabaseUrl}/rest/v1/${table}?`;
  
  // Add count parameter
  url += 'select=count&head=true&';
  
  // Add filters
  if (filter) {
    Object.entries(filter).forEach(([key, value]) => {
      url += `${key}=${value}&`;
    });
  }
  
  const headers: Record<string, string> = {
    apikey: supabaseAnonKey,
    'Content-Type': 'application/json',
    'Prefer': 'count=exact'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await request(url, {
    method: 'GET',
    headers
  });
  
  const count = response.headers.get('content-range')?.split('/')[1];
  return count ? parseInt(count) : 0;
};

export const db = {
  select,
  insert,
  update,
  remove,
  rpc,
  count
};

export default db;