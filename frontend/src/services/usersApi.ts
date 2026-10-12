import type { User, UserActivityListResponse, UserBookmarksListResponse } from '../types';
import { apiRequest } from './httpClient';

export const usersApi = {
  getProfile: async (userId: number): Promise<User> => {
    return apiRequest<User>(`/api/users/${userId}`);
  },

  getActivity: async (userId: number, limit = 20): Promise<UserActivityListResponse> => {
    return apiRequest<UserActivityListResponse>(`/api/users/${userId}/activity?limit=${limit}`);
  },

  getBookmarks: async (
    userId: number,
    page = 1,
    pageSize = 20
  ): Promise<UserBookmarksListResponse> => {
    return apiRequest<UserBookmarksListResponse>(
      `/api/users/${userId}/bookmarks?page=${page}&page_size=${pageSize}`
    );
  },
};
