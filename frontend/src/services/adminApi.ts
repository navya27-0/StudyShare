import type {
  AdminActionSuccess,
  AdminReportListResponse,
  AdminUserListResponse,
  ModerationActionListResponse,
} from '../types';
import { apiRequest } from './httpClient';

export const adminApi = {
  getReports: async (
    status?: string,
    page = 1,
    pageSize = 20
  ): Promise<AdminReportListResponse> => {
    const query = new URLSearchParams();
    if (status && status !== 'all') query.append('status', status);
    query.append('page', String(page));
    query.append('page_size', String(pageSize));
    return apiRequest<AdminReportListResponse>(`/api/admin/reports?${query.toString()}`);
  },

  actionReport: async (
    reportId: number,
    action: string,
    note?: string
  ): Promise<AdminActionSuccess> => {
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

  getUsers: async (params?: {
    q?: string;
    role?: string;
    is_active?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<AdminUserListResponse> => {
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

  getModerationActions: async (params?: {
    resourceId?: number;
    targetUserId?: number;
    page?: number;
    pageSize?: number;
  }): Promise<ModerationActionListResponse> => {
    const query = new URLSearchParams();
    if (params?.resourceId) query.append('resource_id', String(params.resourceId));
    if (params?.targetUserId) query.append('target_user_id', String(params.targetUserId));
    query.append('page', String(params?.page || 1));
    query.append('page_size', String(params?.pageSize || 20));
    return apiRequest<ModerationActionListResponse>(
      `/api/admin/moderation-actions?${query.toString()}`
    );
  },
};
