import type {
  BookmarkResponse,
  DuplicateCheckResponse,
  RatingResponse,
  ReportResponse,
  ResourceDetail,
  ResourceFilterParams,
  ResourceListResponse,
  TopicItem,
  UnitItem,
  VoteResponse,
} from '../types';
import { apiRequest } from './httpClient';
import { logDiagnosticWarning, markResourceDownloaded } from './localStorage';
import { taxonomyApi } from './taxonomyApi';

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
    return apiRequest<DuplicateCheckResponse>(
      `/api/resources/check-duplicate?${search.toString()}`
    );
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

  recordDownload: async (
    resourceId: number
  ): Promise<{ resource_id: number; downloads_count: number }> => {
    markResourceDownloaded(resourceId);
    return apiRequest<{ resource_id: number; downloads_count: number }>(
      `/api/resources/${resourceId}/download`,
      {
        method: 'POST',
      }
    );
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
      body: JSON.stringify({ value: voteType }),
    });
  },

  toggleBookmark: async (
    resourceId: number,
    currentlyBookmarked: boolean
  ): Promise<BookmarkResponse> => {
    if (currentlyBookmarked) {
      await apiRequest<{ message: string; bookmarked: boolean }>(
        `/api/resources/${resourceId}/bookmark`,
        {
          method: 'DELETE',
        }
      );
      return { user_id: 0, resource_id: resourceId, bookmarked: false };
    }
    return apiRequest<BookmarkResponse>(`/api/resources/${resourceId}/bookmark`, {
      method: 'POST',
    });
  },

  getUserBookmarks: async (
    userId: number
  ): Promise<{ items: { resource_id: number }[]; bookmarks: { resource_id: number }[] }> => {
    try {
      const res = await apiRequest<{ items: { resource_id: number }[] }>(
        `/api/users/${userId}/bookmarks`
      );
      const list = Array.isArray(res.items) ? res.items : [];
      return { items: list, bookmarks: list };
    } catch (err) {
      logDiagnosticWarning('resourcesApi.getUserBookmarks', err);
      return { items: [], bookmarks: [] };
    }
  },
};
