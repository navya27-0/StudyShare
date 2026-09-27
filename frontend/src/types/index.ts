export type UserRole = 'student' | 'admin';

export interface ContributorProfile {
  id: number;
  user_id: number;
  bio: string | null;
  semester: number | null;
  department: string | null;
  reputation_points: number;
  total_uploads: number;
  total_upvotes_received: number;
  created_at: string;
}

export interface User {
  id: number;
  email: string;
  display_name: string;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  contributor_profile?: ContributorProfile | null;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthSuccessResponse {
  user: User;
  tokens: AuthTokens;
}

export interface TopicItem {
  id: number;
  unit_id: number;
  title: string;
  ordering: number;
}

export interface UnitItem {
  id: number;
  subject_id: number;
  unit_number: number;
  title: string;
  ordering: number;
  topics?: TopicItem[];
}

export interface SubjectItem {
  id: number;
  code: string;
  name: string;
  semester: number;
  department?: string | null;
  units?: UnitItem[];
}

export type ResourceType =
  | 'notes'
  | 'pdf'
  | 'paper'
  | 'lab_record'
  | 'question_bank'
  | 'link';

export type SortByOption =
  | 'ranked'
  | 'recent'
  | 'highest_rated'
  | 'most_upvoted'
  | 'most_downloaded';

export interface UploaderBrief {
  id: number;
  display_name: string;
  avatar_url: string | null;
  role: string;
}

export interface BreadcrumbHierarchy {
  subject: {
    id: number;
    code: string;
    name: string;
    semester: number;
  };
  unit: {
    id: number;
    unit_number: number;
    title: string;
    subject_id: number;
  };
  topic: {
    id: number;
    title: string;
    unit_id: number;
  };
}

export interface ResourceListItem {
  id: number;
  topic_id: number;
  type: ResourceType;
  title: string;
  description: string | null;
  file_url: string;
  file_size_bytes: number | null;
  page_count: number | null;
  semester: number;
  current_version_id: number | null;
  upvotes_count: number;
  downvotes_count: number;
  rating_avg: number;
  rating_count: number;
  views_count: number;
  downloads_count: number;
  is_verified: boolean;
  is_deleted: boolean;
  ranking_score: number | null;
  created_at: string;
  updated_at: string;
  uploader: UploaderBrief;
  breadcrumbs?: BreadcrumbHierarchy | null;
  user_vote?: 'up' | 'down' | null;
  is_bookmarked?: boolean;
}

export interface ResourceListResponse {
  items: ResourceListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ResourceFilterParams {
  subject_code?: string;
  subject_id?: number;
  unit_id?: number;
  topic_id?: number;
  semester?: number;
  type?: ResourceType;
  min_rating?: number;
  uploader_id?: number;
  q?: string;
  sort_by?: SortByOption;
  page?: number;
  page_size?: number;
}

export interface VoteResponse {
  user_id: number;
  resource_id: number;
  vote_type: 'up' | 'down' | null;
  upvotes_count: number;
  downvotes_count: number;
}

export interface BookmarkResponse {
  user_id: number;
  resource_id: number;
  bookmarked: boolean;
}

export interface ResourceVersion {
  id: number;
  resource_id: number;
  version_number: number;
  file_url: string;
  changelog: string | null;
  file_size_bytes: number | null;
  page_count: number | null;
  uploaded_by: number;
  created_at: string;
}

export interface ResourceDetail extends ResourceListItem {
  current_version: ResourceVersion | null;
  versions: ResourceVersion[];
}

export interface RatingResponse {
  user_id: number;
  resource_id: number;
  score: number;
  rating_avg: number;
  rating_count: number;
}

export interface ReportResponse {
  id: number;
  resource_id: number;
  reporter_id: number;
  reason: string;
  status: string;
  created_at: string;
}

export interface UserActivityItem {
  id: string;
  action: 'uploaded' | 'rated' | 'bookmarked';
  title: string;
  resource_id: number;
  resource_title: string;
  timestamp: string;
  badge?: string | null;
}

export interface UserActivityListResponse {
  user_id: number;
  items: UserActivityItem[];
}

export interface UserBookmarkItem {
  id: number;
  user_id: number;
  resource_id: number;
  created_at: string;
  resource: ResourceListItem;
}

export interface UserBookmarksListResponse {
  user_id: number;
  total: number;
  page: number;
  page_size: number;
  items: UserBookmarkItem[];
}


