/**
 * HTTP utility for making API requests
 */
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

export interface HttpResponse<T = any> {
  data: T;
  status: number;
  headers: http.IncomingHttpHeaders;
}

/**
 * Make an HTTP request using Node's built-in http/https modules
 */
export async function httpRequest<T = any>(
  url: string,
  options: HttpRequestOptions = {}
): Promise<HttpResponse<T>> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const requestOptions: http.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 30000,
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = data ? JSON.parse(data) : null;
          resolve({
            data: parsedData,
            status: res.statusCode || 0,
            headers: res.headers,
          });
        } catch (error) {
          resolve({
            data: data as any,
            status: res.statusCode || 0,
            headers: res.headers,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`HTTP request failed: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('HTTP request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

/**
 * Make a GET request
 */
export async function get<T = any>(url: string, headers?: Record<string, string>): Promise<HttpResponse<T>> {
  return httpRequest<T>(url, { method: 'GET', headers });
}

/**
 * Make a POST request
 */
export async function post<T = any>(
  url: string,
  body: any,
  headers?: Record<string, string>
): Promise<HttpResponse<T>> {
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  return httpRequest<T>(url, {
    method: 'POST',
    headers: { ...defaultHeaders, ...headers },
    body: bodyStr,
  });
}

/**
 * Fetch wrapper using VSCode's fetch API (if available)
 * Falls back to Node's http/https
 */
export async function fetchJson<T = any>(
  url: string,
  options: HttpRequestOptions = {}
): Promise<T> {
  try {
    // Try using VSCode's fetch first (available in VSCode 1.85+)
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: options.headers,
      body: options.body,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    // Fallback to Node's http/https
    const response = await httpRequest<T>(url, options);
    if (response.status >= 400) {
      throw new Error(`HTTP ${response.status}: Request failed`);
    }
    return response.data;
  }
}
