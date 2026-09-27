import type {
  AuthSuccessResponse,
  AuthTokens,
  BookmarkResponse,
  RatingResponse,
  ReportResponse,
  ResourceDetail,
  ResourceFilterParams,
  ResourceListResponse,
  SubjectItem,
  TopicItem,
  UnitItem,
  User,
  VoteResponse,
} from '../types';

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

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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

// Resources API methods
export const resourcesApi = {
  list: async (params: ResourceFilterParams = {}): Promise<ResourceListResponse> => {
    const search = new URLSearchParams();
    if (params.subject_id) search.set('subject_id', String(params.subject_id));
    if (params.subject_code) search.set('subject_code', params.subject_code);
    if (params.unit_id) search.set('unit_id', String(params.unit_id));
    if (params.topic_id) search.set('topic_id', String(params.topic_id));
    if (params.semester) search.set('semester', String(params.semester));
    if (params.type) search.set('type', params.type);
    if (params.min_rating) search.set('min_rating', String(params.min_rating));
    if (params.q && params.q.trim()) search.set('q', params.q.trim());
    if (params.sort_by) search.set('sort_by', params.sort_by);
    if (params.page) search.set('page', String(params.page));
    if (params.page_size) search.set('page_size', String(params.page_size));

    const queryString = search.toString();
    const endpoint = queryString ? `/api/resources?${queryString}` : '/api/resources';
    return apiRequest<ResourceListResponse>(endpoint);
  },

  get: async (resourceId: number): Promise<ResourceDetail> => {
    return apiRequest<ResourceDetail>(`/api/resources/${resourceId}`);
  },

  create: async (formData: FormData): Promise<ResourceDetail> => {
    return apiRequest<ResourceDetail>('/api/resources', {
      method: 'POST',
      body: formData,
    });
  },

  update: async (resourceId: number, formData: FormData): Promise<ResourceDetail> => {
    return apiRequest<ResourceDetail>(`/api/resources/${resourceId}`, {
      method: 'PUT',
      body: formData,
    });
  },

  rate: async (resourceId: number, stars: number): Promise<RatingResponse> => {
    return apiRequest<RatingResponse>(`/api/resources/${resourceId}/rating`, {
      method: 'POST',
      body: JSON.stringify({ stars }),
    });
  },

  report: async (resourceId: number, reason: string): Promise<ReportResponse> => {
    return apiRequest<ReportResponse>(`/api/resources/${resourceId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  recordDownload: async (resourceId: number): Promise<{ resource_id: number; downloads_count: number }> => {
    return apiRequest<{ resource_id: number; downloads_count: number }>(`/api/resources/${resourceId}/download`, {
      method: 'POST',
    });
  },

  createUnit: async (subjectId: number, title: string, unitNumber?: number): Promise<UnitItem> => {
    return apiRequest<UnitItem>('/api/resources/units', {
      method: 'POST',
      body: JSON.stringify({ subject_id: subjectId, title, unit_number: unitNumber }),
    });
  },

  createTopic: async (unitId: number, title: string): Promise<TopicItem> => {
    return apiRequest<TopicItem>('/api/resources/topics', {
      method: 'POST',
      body: JSON.stringify({ unit_id: unitId, title }),
    });
  },

  vote: async (resourceId: number, voteType: 'up' | 'down'): Promise<VoteResponse> => {
    return apiRequest<VoteResponse>(`/api/resources/${resourceId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ value: voteType, vote_type: voteType }),
    });
  },

  toggleBookmark: async (resourceId: number, currentlyBookmarked: boolean): Promise<BookmarkResponse> => {
    if (currentlyBookmarked) {
      await apiRequest<{ message: string; bookmarked: boolean }>(`/api/resources/${resourceId}/bookmark`, {
        method: 'DELETE',
      });
      return { user_id: 0, resource_id: resourceId, bookmarked: false };
    } else {
      return apiRequest<BookmarkResponse>(`/api/resources/${resourceId}/bookmark`, {
        method: 'POST',
      });
    }
  },

  getUserBookmarks: async (userId: number): Promise<{ bookmarks: { resource_id: number }[] }> => {
    try {
      return await apiRequest<{ bookmarks: { resource_id: number }[] }>(`/api/users/${userId}/bookmarks`);
    } catch {
      return { bookmarks: [] };
    }
  },
};


