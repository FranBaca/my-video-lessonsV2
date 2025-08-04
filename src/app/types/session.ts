import { ProfessorAuthData } from '../lib/auth-service';

export interface SessionState {
  isLoading: boolean;
  isAuthenticated: boolean;
  userType: 'professor' | 'student' | null;
  professor?: ProfessorAuthData;
  student?: StudentAuthData;
  error?: string;
}

export interface StudentAuthData {
  name: string;
  allowedSubjects: string[];
  code: string;
}

export interface SessionContext {
  state: SessionState;
  loginProfessor: (email: string, password: string) => Promise<void>;
  loginStudent: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
} 