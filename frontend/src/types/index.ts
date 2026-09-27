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
