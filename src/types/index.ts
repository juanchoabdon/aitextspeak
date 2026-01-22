// ===========================================
// CENTRAL TYPE EXPORTS
// ===========================================

export * from './database';

// ===========================================
// AUTH TYPES
// ===========================================

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: {
    id: string;
    email: string;
    role?: string;
  };
  isLegacyMigration?: boolean;
  redirectTo?: string;
  welcomeProjectId?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  deviceId?: string;
}

// ===========================================
// API RESPONSE TYPES
// ===========================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ===========================================
// BLOG TYPES
// ===========================================

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  content: string;
  publishedAt: string;
  updatedAt?: string;
  author?: string;
  tags?: string[];
  image?: string;
}

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  tags?: string[];
  image?: string;
}

