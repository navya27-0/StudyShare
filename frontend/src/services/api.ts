import type { AuthSuccessResponse, AuthTokens, SubjectItem, User } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

const TOKEN_KEY = 'studyshare_access_token';
const REFRESH_TOKEN_KEY = 'studyshare_refresh_token';

export const getStoredAccessToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const getStoredRefreshToken = (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY);

export const storeTokens = (tokens: AuthTokens): void => {
  localStorage.setItem(TOKEN_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
};

export const clearStoredTokens = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
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
 * Base HTTP request wrapper with automatic Bearer token injection and refresh retry.
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const token = getStoredAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle token expiration & automatic refresh
  if (response.status === 401 && retry) {
    const refreshToken = getStoredRefreshToken();
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (refreshRes.ok) {
          const newTokens: AuthTokens = await refreshRes.json();
          storeTokens(newTokens);
          return apiRequest<T>(endpoint, options, false);
        } else {
          clearStoredTokens();
        }
      } catch {
        clearStoredTokens();
      }
    }
  }

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    let errorData: unknown = null;
    try {
      errorData = await response.json();
      if (typeof errorData === 'object' && errorData !== null && 'detail' in errorData) {
        errorDetail = String((errorData as { detail: unknown }).detail);
      }
    } catch {
      // response is not json
    }
    throw new ApiError(errorDetail, response.status, errorData);
  }

  return response.json();
}

// Authentication API methods
export const authApi = {
  login: async (email: string, password: string): Promise<AuthSuccessResponse> => {
    const res = await apiRequest<AuthSuccessResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }, false);
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
    const res = await apiRequest<AuthSuccessResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false);
    storeTokens(res.tokens);
    return res;
  },

  getMe: async (): Promise<User> => {
    return apiRequest<User>('/api/auth/me');
  },

  logout: (): void => {
    clearStoredTokens();
  },
};

// Academic Taxonomy API methods
export const taxonomyApi = {
  getSubjectsTree: async (): Promise<SubjectItem[]> => {
    try {
      return await apiRequest<SubjectItem[]>('/api/resources/taxonomy');
    } catch {
      // Fallback fallback seed taxonomy if endpoint is still loading or offline
      return [
        {
          id: 1,
          code: 'CS201',
          name: 'Data Structures & Algorithms',
          semester: 3,
          units: [
            {
              id: 1,
              subject_id: 1,
              unit_number: 1,
              title: 'Linear Data Structures & Amortized Analysis',
              ordering: 1,
              topics: [
                { id: 1, unit_id: 1, title: 'Linked Lists, Stacks & Queue Applications', ordering: 1 },
              ],
            },
            {
              id: 2,
              subject_id: 1,
              unit_number: 2,
              title: 'Balanced Search Trees & Heaps',
              ordering: 2,
              topics: [
                { id: 2, unit_id: 2, title: 'AVL Tree Rotations & Balance Factor Analysis', ordering: 1 },
              ],
            },
            {
              id: 3,
              subject_id: 1,
              unit_number: 3,
              title: 'Graph Algorithms & Traversal',
              ordering: 3,
              topics: [
                { id: 3, unit_id: 3, title: 'Dijkstra, Bellman-Ford & Shortest Path Trees', ordering: 1 },
              ],
            },
          ],
        },
        {
          id: 2,
          code: 'CS204',
          name: 'Operating Systems & System Programming',
          semester: 4,
          units: [
            {
              id: 4,
              subject_id: 2,
              unit_number: 1,
              title: 'Process Management, Threads & Concurrency',
              ordering: 1,
              topics: [
                { id: 4, unit_id: 4, title: 'Deadlock Avoidance & Banker Algorithm', ordering: 1 },
              ],
            },
            {
              id: 5,
              subject_id: 2,
              unit_number: 2,
              title: 'Virtual Memory & Page Replacement',
              ordering: 2,
              topics: [
                { id: 5, unit_id: 5, title: 'LRU, Working Set Model & TLB Hierarchies', ordering: 1 },
              ],
            },
          ],
        },
        {
          id: 3,
          code: 'CS301',
          name: 'Database Management Systems',
          semester: 5,
          units: [
            {
              id: 6,
              subject_id: 3,
              unit_number: 1,
              title: 'Relational Model, Normalization & SQL',
              ordering: 1,
              topics: [
                { id: 6, unit_id: 6, title: '3NF & BCNF Decomposition Algorithms', ordering: 1 },
              ],
            },
            {
              id: 7,
              subject_id: 3,
              unit_number: 2,
              title: 'ACID Transactions & Concurrency Control',
              ordering: 2,
              topics: [
                { id: 7, unit_id: 7, title: 'Two-Phase Locking (2PL) & Serializability', ordering: 1 },
              ],
            },
          ],
        },
      ];
    }
  },
};
