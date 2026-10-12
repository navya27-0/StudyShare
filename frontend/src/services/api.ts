import type {
  AdminActionSuccess,
  AdminReportListResponse,
  AdminUserListResponse,
  ModerationActionListResponse,
  AuthSuccessResponse,
  AuthTokens,
  BookmarkResponse,
  DuplicateCheckResponse,
  RatingResponse,
  ReportResponse,
  ResourceDetail,
  ResourceFilterParams,
  ResourceListItem,
  ResourceListResponse,
  SubjectItem,
  TopicItem,
  UnitItem,
  User,
  UserActivityListResponse,
  UserBookmarksListResponse,
  VoteResponse,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

const TOKEN_KEY = 'studyshare_access_token';
const REFRESH_TOKEN_KEY = 'studyshare_refresh_token';
const TAXONOMY_CACHE_KEY = 'studyshare_taxonomy_cache_v1';
const DOWNLOAD_HISTORY_KEY = 'studyshare_download_history_v1';
const OFFLINE_BOOKMARKS_KEY = 'studyshare_offline_bookmarks_v1';

// In-memory primary token store (reduces XSS surface while maintaining reload persistence)
let inMemoryAccessToken: string | null = null;

export const getStoredAccessToken = (): string | null => {
  if (inMemoryAccessToken) return inMemoryAccessToken;
  try {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const getStoredRefreshToken = (): string | null => {
  try {
    return sessionStorage.getItem(REFRESH_TOKEN_KEY) || localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const storeTokens = (tokens: AuthTokens): void => {
  inMemoryAccessToken = tokens.access_token;
  try {
    sessionStorage.setItem(TOKEN_KEY, tokens.access_token);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
    localStorage.setItem(TOKEN_KEY, tokens.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  } catch {
    // Ignore storage quota errors
  }
};

export const clearStoredTokens = (): void => {
  inMemoryAccessToken = null;
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // Ignore storage errors
  }
};

// Download history & Offline Saved Library helpers for low-bandwidth / exam reliability
export const getDownloadedIds = (): Set<number> => {
  try {
    const raw = localStorage.getItem(DOWNLOAD_HISTORY_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as number[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
};

export const markResourceDownloaded = (resourceId: number): void => {
  try {
    const current = getDownloadedIds();
    current.add(resourceId);
    localStorage.setItem(DOWNLOAD_HISTORY_KEY, JSON.stringify(Array.from(current).slice(-200)));
  } catch {
    // Ignore storage errors
  }
};

export const getOfflineBookmarks = (): ResourceListItem[] => {
  try {
    const raw = localStorage.getItem(OFFLINE_BOOKMARKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ResourceListItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveOfflineBookmarks = (items: ResourceListItem[]): void => {
  try {
    localStorage.setItem(OFFLINE_BOOKMARKS_KEY, JSON.stringify(items.slice(0, 100)));
  } catch {
    // Ignore storage errors
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
 * Base HTTP request wrapper with automatic Bearer token injection, HttpOnly cookie credentials, and refresh retry.
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

  // Handle token expiration & automatic refresh (supports HttpOnly cookie + token rotation)
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
    } catch {
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
          errorDetail = detail.map((e: { msg?: string; loc?: string[] }) => {
            const field = e.loc ? e.loc[e.loc.length - 1] : '';
            return field ? `${field}: ${e.msg || 'invalid'}` : e.msg || 'validation error';
          }).join('; ');
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
    const refreshToken = getStoredRefreshToken();
    clearStoredTokens();
    fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: refreshToken ? JSON.stringify({ refresh_token: refreshToken }) : undefined,
    }).catch(() => {
      // Ignore network errors during logout cleanup
    });
  },
};

const FALLBACK_TAXONOMY: SubjectItem[] = [
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

// Academic Taxonomy API methods with local caching for low-bandwidth campus connections
export const taxonomyApi = {
  invalidateCache: (): void => {
    try {
      localStorage.removeItem(TAXONOMY_CACHE_KEY);
    } catch {
      // Ignore storage errors
    }
  },

  getSubjectsTree: async (forceRefresh = false): Promise<SubjectItem[]> => {
    if (!forceRefresh) {
      try {
        const cachedRaw = localStorage.getItem(TAXONOMY_CACHE_KEY);
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw) as { ts: number; data: SubjectItem[] };
          if (parsed && Array.isArray(parsed.data) && parsed.data.length > 0) {
            // If cached within 10 minutes, return immediately and revalidate silently if older than 2 min
            const ageMs = Date.now() - (parsed.ts || 0);
            if (ageMs < 10 * 60 * 1000) {
              if (ageMs > 2 * 60 * 1000) {
                apiRequest<SubjectItem[]>('/api/resources/taxonomy')
                  .then((fresh) => {
                    localStorage.setItem(
                      TAXONOMY_CACHE_KEY,
                      JSON.stringify({ ts: Date.now(), data: fresh })
                    );
                  })
                  .catch(() => {});
              }
              return parsed.data;
            }
          }
        }
      } catch {
        // Ignore cache read error
      }
    }

    try {
      const fresh = await apiRequest<SubjectItem[]>('/api/resources/taxonomy');
      try {
        localStorage.setItem(
          TAXONOMY_CACHE_KEY,
          JSON.stringify({ ts: Date.now(), data: fresh })
        );
      } catch {
        // Ignore quota error
      }
      return fresh;
    } catch {
      // Try stale cache before hardcoded fallback
      try {
        const cachedRaw = localStorage.getItem(TAXONOMY_CACHE_KEY);
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw) as { data: SubjectItem[] };
          if (parsed?.data?.length) return parsed.data;
        }
      } catch {
        // Ignore
      }
      return FALLBACK_TAXONOMY;
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
    if (params.is_verified !== undefined) search.set('is_verified', String(params.is_verified));
    if (params.uploader_id) search.set('uploader_id', String(params.uploader_id));
    if (params.q && params.q.trim()) search.set('q', params.q.trim());
    if (params.sort_by) search.set('sort_by', params.sort_by);
    if (params.page) search.set('page', String(params.page));
    if (params.page_size) search.set('page_size', String(params.page_size));

    const queryString = search.toString();
    const endpoint = queryString ? `/api/resources?${queryString}` : '/api/resources';
    return apiRequest<ResourceListResponse>(endpoint);
  },

  checkDuplicate: async (params: {
    title?: string;
    filename?: string;
    topic_id?: number;
    unit_id?: number;
    subject_id?: number;
    file_size_bytes?: number;
  }): Promise<DuplicateCheckResponse> => {
    const search = new URLSearchParams();
    if (params.title && params.title.trim()) search.set('title', params.title.trim());
    if (params.filename && params.filename.trim()) search.set('filename', params.filename.trim());
    if (params.topic_id) search.set('topic_id', String(params.topic_id));
    if (params.unit_id) search.set('unit_id', String(params.unit_id));
    if (params.subject_id) search.set('subject_id', String(params.subject_id));
    if (params.file_size_bytes) search.set('file_size_bytes', String(params.file_size_bytes));
    return apiRequest<DuplicateCheckResponse>(`/api/resources/check-duplicate?${search.toString()}`);
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
    markResourceDownloaded(resourceId);
    return apiRequest<{ resource_id: number; downloads_count: number }>(`/api/resources/${resourceId}/download`, {
      method: 'POST',
    });
  },

  createUnit: async (subjectId: number, title: string, unitNumber?: number): Promise<UnitItem> => {
    const res = await apiRequest<UnitItem>('/api/resources/units', {
      method: 'POST',
      body: JSON.stringify({ subject_id: subjectId, title, unit_number: unitNumber }),
    });
    taxonomyApi.invalidateCache();
    return res;
  },

  createTopic: async (unitId: number, title: string): Promise<TopicItem> => {
    const res = await apiRequest<TopicItem>('/api/resources/topics', {
      method: 'POST',
      body: JSON.stringify({ unit_id: unitId, title }),
    });
    taxonomyApi.invalidateCache();
    return res;
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

  getUserBookmarks: async (userId: number): Promise<{ items: { resource_id: number }[]; bookmarks: { resource_id: number }[] }> => {
    try {
      const res = await apiRequest<{ items?: { resource_id: number }[]; bookmarks?: { resource_id: number }[] }>(`/api/users/${userId}/bookmarks`);
      const list = res.items || res.bookmarks || [];
      return { items: list, bookmarks: list };
    } catch {
      return { items: [], bookmarks: [] };
    }
  },
};

// Users API methods
export const usersApi = {
  getProfile: async (userId: number): Promise<User> => {
    return apiRequest<User>(`/api/users/${userId}`);
  },

  getActivity: async (userId: number, limit = 20): Promise<UserActivityListResponse> => {
    return apiRequest<UserActivityListResponse>(`/api/users/${userId}/activity?limit=${limit}`);
  },

  getBookmarks: async (userId: number, page = 1, pageSize = 20): Promise<UserBookmarksListResponse> => {
    return apiRequest<UserBookmarksListResponse>(`/api/users/${userId}/bookmarks?page=${page}&page_size=${pageSize}`);
  },
};

// Admin & Moderation API methods
export const adminApi = {
  getReports: async (status?: string, page = 1, pageSize = 20): Promise<AdminReportListResponse> => {
    const query = new URLSearchParams();
    if (status && status !== 'all') query.append('status', status);
    query.append('page', String(page));
    query.append('page_size', String(pageSize));
    return apiRequest<AdminReportListResponse>(`/api/admin/reports?${query.toString()}`);
  },

  actionReport: async (reportId: number, action: string, note?: string): Promise<AdminActionSuccess> => {
    return apiRequest<AdminActionSuccess>(`/api/admin/reports/${reportId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, note }),
    });
  },

  removeResource: async (resourceId: number, note?: string): Promise<AdminActionSuccess> => {
    return apiRequest<AdminActionSuccess>(`/api/admin/resources/${resourceId}/remove`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },

  restoreResource: async (resourceId: number, note?: string): Promise<AdminActionSuccess> => {
    return apiRequest<AdminActionSuccess>(`/api/admin/resources/${resourceId}/restore`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },

  getUsers: async (params?: { q?: string; role?: string; is_active?: boolean; page?: number; pageSize?: number }): Promise<AdminUserListResponse> => {
    const query = new URLSearchParams();
    if (params?.q) query.append('q', params.q);
    if (params?.role) query.append('role', params.role);
    if (params?.is_active !== undefined) query.append('is_active', String(params.is_active));
    query.append('page', String(params?.page || 1));
    query.append('page_size', String(params?.pageSize || 20));
    return apiRequest<AdminUserListResponse>(`/api/admin/users?${query.toString()}`);
  },

  banUser: async (userId: number, note?: string): Promise<AdminActionSuccess> => {
    return apiRequest<AdminActionSuccess>(`/api/admin/users/${userId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },

  unbanUser: async (userId: number, note?: string): Promise<AdminActionSuccess> => {
    return apiRequest<AdminActionSuccess>(`/api/admin/users/${userId}/unban`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },

  warnUser: async (userId: number, note?: string): Promise<AdminActionSuccess> => {
    return apiRequest<AdminActionSuccess>(`/api/admin/users/${userId}/warn`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },

  getModerationActions: async (params?: { resourceId?: number; targetUserId?: number; page?: number; pageSize?: number }): Promise<ModerationActionListResponse> => {
    const query = new URLSearchParams();
    if (params?.resourceId) query.append('resource_id', String(params.resourceId));
    if (params?.targetUserId) query.append('target_user_id', String(params.targetUserId));
    query.append('page', String(params?.page || 1));
    query.append('page_size', String(params?.pageSize || 20));
    return apiRequest<ModerationActionListResponse>(`/api/admin/moderation-actions?${query.toString()}`);
  },
};



