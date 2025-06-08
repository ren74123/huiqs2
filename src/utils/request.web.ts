// src/utils/request.web.ts
// Web/H5 request implementation

// Default request timeout in milliseconds
const DEFAULT_TIMEOUT = 30000;

// Request options interface
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

/**
 * Universal request function for web/H5 environment
 * @param url Request URL
 * @param options Request options
 * @returns Response data
 */
export async function request(
  url: string,
  options: RequestOptions = {}
): Promise<Response> {
  const { method = 'GET', headers = {}, body, timeout = DEFAULT_TIMEOUT } = options;

  // Create AbortController for timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      signal: controller.signal,
      ...(body ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
    };

    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Request failed with status ${response.status}: ${errorText}`);
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    
    throw error;
  }
}

export default request;