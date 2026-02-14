export type Level = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

export interface Question {
  id: number;
  level: Level;
  text: string;
  created_at: string;
}

export interface QuestionWithFeedback extends Question {
  thumbs_up: number;
  thumbs_down: number;
}

export interface QuestionTemplate {
  id: number;
  level: 'L3' | 'L4';
  pre_text: string;
  post_text: string;
  variables: string; // JSON array stored as string
  created_at: string;
}

export interface GeneratedQuestion {
  type: 'simple' | 'template';
  id: number;
  text: string;
  templateId?: number;
  variableUsed?: string;
}

export interface User {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

export interface NumberInput {
  id: number;
  number: number;
  level: Level;
  created_at: string;
}

export interface SiteAccessLog {
  id: number;
  ip_address: string;
  user_agent: string | null;
  device_info: string | null;
  location: string | null;
  success: number; // 0 or 1
  created_at: string;
}

export interface EmailUser {
  id: number;
  username: string;
  approved: number; // 0 or 1
  is_admin: number; // 0 or 1
  created_at: string;
}

export interface UserActivity {
  id: number;
  email_user_id: number;
  question_type: 'simple' | 'template';
  question_id: number | null;
  template_id: number | null;
  variable_used: string | null;
  level: Level;
  created_at: string;
}
