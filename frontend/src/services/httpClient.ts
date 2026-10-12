import type { AuthTokens } from '../types';
import { logDiagnosticWarning } from './localStorage';

export const API_BASE = import.meta.env.VITE_API_URL || '';

const ACCESS_TOKEN_SESSION_KEY = 'studyshare_access_token';
const LEGACY_REFRESH_TOKEN_KEY = 'studyshare_refresh_token';

/**
 * Security Hardening:
 * - Access tokens live primarily in memory and tab-scoped `sessionStorage` (for reload continuity).
 * - Refresh tokens are managed via the backend `HttpOnly` cookie (`studyshare_refresh_token`)
 *   and transient in-memory state — never persisted to `localStorage` where XSS could exfiltrate long-lived credentials.
 */
let inMemoryAccessToken: string | null = null;
let inMemoryRefreshToken: string | null = null;

export const getStoredAccessToken = (): string | null => {
  if (inMemoryAccessToken) return inMemoryAccessToken;
  try {
    const sessionTok = sessionStorage.getItem(ACCESS_TOKEN_SESSION_KEY);
    if (sessionTok) {
      inMemoryAccessToken = sessionTok;
      return sessionTok;
    }
    return null;
  } catch (err) {
    logDiagnosticWarning('httpClient.getStoredAccessToken', err);
    return null;
  }
};

export const getStoredRefreshToken = (): string | null => {
  return inMemoryRefreshToken;
};

export const storeTokens = (tokens: AuthTokens): void => {
  inMemoryAccessToken = tokens.access_token;
  inMemoryRefreshToken = tokens.refresh_token || null;
  try {
    sessionStorage.setItem(ACCESS_TOKEN_SESSION_KEY, tokens.access_token);
    // Proactively purge any legacy long-lived tokens from Web Storage
    sessionStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
    localStorage.removeItem(ACCESS_TOKEN_SESSION_KEY);
    localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
  } catch (err) {
    logDiagnosticWarning('httpClient.storeTokens', err);
  }
};

export const clearStoredTokens = (): void => {
  inMemoryAccessToken = null;
  inMemoryRefreshToken = null;
  try {
    sessionStorage.removeItem(ACCESS_TOKEN_SESSION_KEY);
    sessionStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
    localStorage.removeItem(ACCESS_TOKEN_SESSION_KEY);
    localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
  } catch (err) {
    logDiagnosticWarning('httpClient.clearStoredTokens', err);
  }
};

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Shared HTTP client with automatic Bearer token injection, HttpOnly cookie credentials,
 * token rotation retry on 401, and structured error normalization.
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const token = getStoredAccessToken();

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers,
    });
  } catch (netErr: unknown) {
    const rawMsg = netErr instanceof Error ? netErr.message : 'Network request failed';
    throw new ApiError(
      `Network connection failure: ${rawMsg}. Please check your internet connection or server availability.`,
      0,
      netErr
    );
  }

  // Handle token expiration & automatic refresh via HttpOnly cookie + optional in-memory fallback
  if (response.status === 401 && retry) {
    const refreshToken = getStoredRefreshToken();
    try {
      const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: refreshToken ? JSON.stringify({ refresh_token: refreshToken }) : undefined,
      });

      if (refreshRes.ok) {
        const newTokens: AuthTokens = await refreshRes.json();
        storeTokens(newTokens);
        return apiRequest<T>(endpoint, options, false);
      } else {
        clearStoredTokens();
      }
    } catch (refreshErr) {
      logDiagnosticWarning('httpClient.refreshRetry', refreshErr);
      clearStoredTokens();
    }
  }

  if (!response.ok) {
    let errorDetail = `Request failed with HTTP status ${response.status}`;
    let errorData: unknown = null;
    try {
      errorData = await response.json();
      if (typeof errorData === 'object' && errorData !== null && 'detail' in errorData) {
        const detail = (errorData as { detail: unknown }).detail;
        if (typeof detail === 'string') {
          errorDetail = detail;
        } else if (Array.isArray(detail)) {
          errorDetail = detail
            .map((e: { msg?: string; loc?: string[] }) => {
              const field = e.loc ? e.loc[e.loc.length - 1] : '';
              return field ? `${field}: ${e.msg || 'invalid'}` : e.msg || 'validation error';
            })
            .join('; ');
        } else {
          errorDetail = JSON.stringify(detail);
        }
      }
    } catch {
      if (response.status === 413) {
        errorDetail = 'File payload is too large. Maximum allowed file size is 50 MB.';
      } else if (response.status === 502 || response.status === 503 || response.status === 504) {
        errorDetail = 'Backend server is currently unreachable. Please retry shortly.';
      }
    }
    throw new ApiError(errorDetail, response.status, errorData);
  }

  return response.json();
}
