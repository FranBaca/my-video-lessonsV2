import { ProfessorAuthData } from '../lib/auth-service';

export interface SessionState {
  isLoading: boolean;
  isAuthenticated: boolean;
  userType: 'professor' | 'student' | null;
  professor?: ProfessorAuthData;
  student?: StudentAuthData;
  error?: string;
  lastActivity?: Date;
}

export interface StudentAuthData {
  name: string;
  allowedSubjects: string[];
  code: string;
  lastAccess?: Date;
  deviceId?: string;
}

export interface SessionContext {
  state: SessionState;
  loginProfessor: (email: string, password: string) => Promise<void>;
  loginStudent: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshSession?: () => Promise<void>;
}

// Enhanced error types for better error handling
export interface AuthError {
  code: string;
  message: string;
  details?: string;
  timestamp: Date;
}

// Session metadata for tracking and debugging
export interface SessionMetadata {
  createdAt: Date;
  lastActivity: Date;
  userAgent: string;
  deviceId: string;
  ipAddress?: string;
} 