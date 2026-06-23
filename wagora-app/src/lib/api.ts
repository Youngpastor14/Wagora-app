/**
 * Centralized API client for the Wagora backend.
 *
 * All backend requests should go through this module.
 * This eliminates the 21 scattered `import.meta.env.VITE_API_URL`
 * references and provides a single place to configure auth headers,
 * error handling, and the base URL.
 */

import { supabase } from './supabase/client';

/** The deployed backend URL. Set VITE_API_URL in Vercel's env vars. */
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://api.getwagora.com';


/**
 * Get the current user's Bearer token from Supabase session.
 * Returns null if no active session.
 */
async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

type RequestOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
  /** If true, skips adding the Authorization header (for public endpoints) */
  skipAuth?: boolean;
};

/**
 * Wrapper around fetch that:
 * 1. Prepends the API base URL
 * 2. Injects the Supabase JWT as a Bearer token
 * 3. Sets Content-Type: application/json by default
 * 4. Throws a descriptive error on non-2xx responses
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipAuth = false, headers: extraHeaders = {}, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  if (!skipAuth) {
    const token = await getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `API error ${response.status}: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody?.detail || errorBody?.error || errorMessage;
    } catch {
      // Response wasn't JSON — use the status text
    }
    throw new Error(errorMessage);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/**
 * Convenience wrappers for common HTTP methods.
 *
 * Usage:
 *   const campaigns = await api.get('/api/campaigns/');
 *   const campaign = await api.post('/api/campaigns/', { name: 'Q3 Push', platform: 'Email' });
 *   await api.patch('/api/campaigns/123', { status: 'Paused' });
 *   await api.delete('/api/campaigns/123');
 */
export const api = {
  get: <T = unknown>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { method: 'GET', ...options }),

  post: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),

  patch: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),

  put: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),

  delete: <T = unknown>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { method: 'DELETE', ...options }),
};
