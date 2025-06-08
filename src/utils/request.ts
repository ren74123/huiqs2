// src/utils/request.ts

export interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
  body?: any;
}

export async function request(
  url: string,
  options: RequestOptions = {}
): Promise<Response> {
  const { method = 'GET', headers = {}, body } = options;

  const fetchOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };

  const res = await fetch(url, fetchOptions);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request failed: ${res.status} ${res.statusText} - ${text}`);
  }

  return res;
}