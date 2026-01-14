
export enum StoryStatus {
  PENDING = 'PENDING',
  PUBLISHING = 'PUBLISHING',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED'
}

export interface User {
    id: string;
    username: string;
    role: 'admin' | 'user';
}

export interface Story {
  id: string;
  imagePreview: string; 
  ctaUrl: string;
  whatsappNumber?: string;
  whatsappMessage?: string;
  stickerText?: string;
  schedules: string[]; 
  isRecurring: boolean;
  isShared: boolean; // Library flag
  ownerName?: string; // For library view
  stickerPosition: { x: number; y: number };
  status: StoryStatus;
  caption?: string;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  message: string;
  module: 'API' | 'WORKER' | 'PLAYWRIGHT';
}

export interface Stats {
  pendingCount: number;
  publishedCount: number;
  errorRate: number;
  nextRun: string | null;
}

export interface AppSettings {
  instagram_username?: string;
  instagram_password?: string;
  proxy_server?: string;
  headless_mode?: string;
  gemini_api_key?: string;
}

export type ViewState = 'LOGIN' | 'DASHBOARD' | 'CALENDAR' | 'CREATE' | 'LOGS' | 'HELP' | 'SETTINGS' | 'LIBRARY' | 'ADMIN';

export type Language = 'en' | 'pt';

export interface HelpArticle {
  id: string;
  title: string;
  content: string;
  tags: string[];
}
