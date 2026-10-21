import type { AuthSuccessResponse, AuthTokens, User } from '../types';
import { API_BASE, apiRequest, clearStoredTokens, storeTokens } from './httpClient';
import { logDiagnosticWarning } from './localStorage';

export const authApi = {
  login: async (email: string, password: string): Promise<AuthSuccessResponse> => {
    const res = await apiRequest<AuthSuccessResponse>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
      false
    );
    storeTokens(res.tokens);
    return res;
  },

  signup: async (data: {
    email: string;
    password: string;
    display_name: string;
    semester?: number;
    department?: string;
    bio?: string;
  }): Promise<AuthSuccessResponse> => {
    const res = await apiRequest<AuthSuccessResponse>(
      '/api/auth/signup',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      false
    );
    storeTokens(res.tokens);
    return res;
  },

  getMe: async (): Promise<User> => {
    return apiRequest<User>('/api/auth/me');
  },

  refreshToken: async (): Promise<AuthTokens | null> => {
    try {
      const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (refreshRes.ok) {
        const tokens: AuthTokens = await refreshRes.json();
        storeTokens(tokens);
        return tokens;
      }
      clearStoredTokens();
      return null;
    } catch (err) {
      logDiagnosticWarning('authApi.refreshToken', err);
      clearStoredTokens();
      return null;
    }
  },

  logout: (): void => {
    clearStoredTokens();
    fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    }).catch((err) => {
      logDiagnosticWarning('authApi.logout', err);
    });
  },
};
