"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { SessionState, SessionContext, StudentAuthData } from '../types/session';
import { authService, ProfessorAuthData } from '../lib/auth-service';
import { professorServiceClient } from '../lib/firebase-client';
import { v4 as uuidv4 } from 'uuid';

const SessionContext = createContext<SessionContext | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>({
    isLoading: true,
    isAuthenticated: false,
    userType: null,
  });

  // Device ID management for student authentication
  const getOrCreateDeviceId = async (): Promise<string> => {
    let deviceId = localStorage.getItem('deviceId');
    
    // Check if the stored deviceId is corrupted (contains Promise string)
    if (deviceId && (deviceId === '[object Promise]' || deviceId.includes('Promise'))) {
      localStorage.removeItem('deviceId');
      deviceId = null;
    }
    
    if (!deviceId) {
      try {
        deviceId = uuidv4();
        localStorage.setItem('deviceId', deviceId);
      } catch (error) {
        // Use a simple UUID as fallback
        deviceId = uuidv4();
        localStorage.setItem('deviceId', deviceId);
      }
    }
    
    return deviceId;
  };

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange(async (firebaseUser) => {
      if (firebaseUser) {
        // Check if user is a professor
        const isProfessor = await authService.isProfessor(firebaseUser.uid);
        if (isProfessor) {
          const professor = await professorServiceClient.getById(firebaseUser.uid);
          if (professor) {
            setState({
              isLoading: false,
              isAuthenticated: true,
              userType: 'professor',
              professor: {
                user: {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  displayName: firebaseUser.displayName,
                  photoURL: firebaseUser.photoURL
                },
                professor
              }
            });
            return;
          }
        }
      } else {
        // No Firebase user, check student session
        await checkStudentSession();
      }
    });

    return () => unsubscribe();
  }, []);

  const checkStudentSession = async () => {
    try {
      // Check server-side session
      const response = await fetch('/api/auth/check-student-session', {
        method: 'GET',
        credentials: 'include' // Include cookies
      });

      if (response.ok) {
        const data = await response.json();
        setState({
          isLoading: false,
          isAuthenticated: true,
          userType: 'student',
          student: {
            name: data.student.name,
            allowedSubjects: data.student.allowedSubjects,
            code: data.student.code
          }
        });
      } else {
        setState({
          isLoading: false,
          isAuthenticated: false,
          userType: null
        });
      }
    } catch (error) {
      setState({
        isLoading: false,
        isAuthenticated: false,
        userType: null
      });
    }
  };

  const loginProfessor = async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: undefined }));

      // Reuse existing professor login logic
      const authData = await authService.loginProfessor(email, password);
      
      setState({
        isLoading: false,
        isAuthenticated: true,
        userType: 'professor',
        professor: authData
      });

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Login failed'
      }));
      throw error;
    }
  };

  const loginStudent = async (code: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: undefined }));

      const deviceId = await getOrCreateDeviceId();

      // Use existing verification endpoint (sets server cookies)
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, deviceId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Invalid code or device');
      }

      const student = await response.json();

      setState({
        isLoading: false,
        isAuthenticated: true,
        userType: 'student',
        student: {
          name: student.student.name,
          allowedSubjects: student.student.allowedSubjects,
          code
        }
      });

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Login failed'
      }));
      throw error;
    }
  };

  const logout = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      if (state.userType === 'professor') {
        // Clear Firebase Auth
        await authService.logout();
        // Clear any localStorage data for professors
        localStorage.removeItem('professor_token');
        localStorage.removeItem('professor_id');
      } else if (state.userType === 'student') {
        // Clear server-side student session (cookies)
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include'
        });
        // Clear localStorage data for students
        localStorage.removeItem('studentSession');
        localStorage.removeItem('lastLogin');
        localStorage.removeItem('studentCode');
      }

      // Note: We keep deviceId and browser_fingerprint for future device validation
      // These are not session-specific and help with device binding security

      setState({
        isLoading: false,
        isAuthenticated: false,
        userType: null
      });

    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if error
      setState({
        isLoading: false,
        isAuthenticated: false,
        userType: null
      });
    }
  };



  const clearError = () => {
    setState(prev => ({ ...prev, error: undefined }));
  };



  const value: SessionContext = {
    state,
    loginProfessor,
    loginStudent,
    logout,
    clearError
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
} 