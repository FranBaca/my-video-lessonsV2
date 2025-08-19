"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { SessionState, SessionContext, StudentAuthData } from '../types/session';
import { authService, ProfessorAuthData } from '../lib/auth-service';
import { professorServiceClient } from '../lib/firebase-client';
import { getFirebaseErrorMessage, generateDeviceId, validateDeviceId } from '../lib/auth-utils-client';
import { v4 as uuidv4 } from 'uuid';

const SessionContext = createContext<SessionContext | undefined>(undefined);

// Session storage keys
const SESSION_KEYS = {
  PROFESSOR_TOKEN: 'professor_token',
  PROFESSOR_ID: 'professor_id',
  STUDENT_SESSION: 'studentSession',
  LAST_LOGIN: 'lastLogin',
  STUDENT_CODE: 'studentCode',
  DEVICE_ID: 'deviceId'
} as const;

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>({
    isLoading: true,
    isAuthenticated: false,
    userType: null,
  });

  // Device ID management for student authentication
  const getOrCreateDeviceId = useCallback(async (): Promise<string> => {
    let deviceId = localStorage.getItem(SESSION_KEYS.DEVICE_ID);
    
    // Check if the stored deviceId is corrupted (contains Promise string)
    if (deviceId && (deviceId === '[object Promise]' || deviceId.includes('Promise'))) {
      localStorage.removeItem(SESSION_KEYS.DEVICE_ID);
      deviceId = null;
    }
    
    if (!deviceId) {
      try {
        // Use utility function for device ID generation
        deviceId = generateDeviceId();
        localStorage.setItem(SESSION_KEYS.DEVICE_ID, deviceId);
      } catch (error) {
        // Use UUID as fallback
        deviceId = uuidv4();
        localStorage.setItem(SESSION_KEYS.DEVICE_ID, deviceId);
      }
    }
    
    // Validate the device ID
    if (!validateDeviceId(deviceId)) {
      // Generate a new one if invalid
      deviceId = generateDeviceId();
      localStorage.setItem(SESSION_KEYS.DEVICE_ID, deviceId);
    }
    
    return deviceId;
  }, []);

  // Enhanced error handling using utility functions
  const handleError = useCallback((error: any, context: string) => {
    console.error(`❌ ${context}:`, error);
    
    let errorMessage = 'Ha ocurrido un error inesperado';
    
    if (error.code) {
      errorMessage = getFirebaseErrorMessage(error.code, errorMessage);
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    setState(prev => ({
      ...prev,
      isLoading: false,
      error: errorMessage
    }));
  }, []);

  // Enhanced student session checking
  const checkStudentSession = useCallback(async () => {
    try {
      // Check server-side session
      const response = await fetch('/api/auth/check-student-session', {
        method: 'GET',
        credentials: 'include' // Include cookies
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store session data for persistence
        try {
          localStorage.setItem(SESSION_KEYS.STUDENT_SESSION, JSON.stringify(data.student));
          localStorage.setItem(SESSION_KEYS.STUDENT_CODE, data.student.code);
          localStorage.setItem(SESSION_KEYS.LAST_LOGIN, new Date().toISOString());
        } catch (storageError) {
          console.warn('Could not save session to localStorage:', storageError);
        }
        
        setState({
          isLoading: false,
          isAuthenticated: true,
          userType: 'student',
          student: {
            name: data.student.name,
            allowedSubjects: data.student.allowedSubjects,
            code: data.student.code,
            lastAccess: new Date()
          }
        });
      } else {
        // Clear any stale session data
        try {
          localStorage.removeItem(SESSION_KEYS.STUDENT_SESSION);
          localStorage.removeItem(SESSION_KEYS.STUDENT_CODE);
          localStorage.removeItem(SESSION_KEYS.LAST_LOGIN);
        } catch (storageError) {
          console.warn('Could not clear localStorage:', storageError);
        }
        
        setState({
          isLoading: false,
          isAuthenticated: false,
          userType: null
        });
      }
    } catch (error) {
      console.error('Error checking student session:', error);
      setState({
        isLoading: false,
        isAuthenticated: false,
        userType: null
      });
    }
  }, []);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Check if user is a professor
          const isProfessor = await authService.isProfessor(firebaseUser.uid);
          if (isProfessor) {
            const professor = await professorServiceClient.getById(firebaseUser.uid);
            if (professor) {
              // Store professor data for persistence
              try {
                const token = await firebaseUser.getIdToken();
                localStorage.setItem(SESSION_KEYS.PROFESSOR_TOKEN, token);
                localStorage.setItem(SESSION_KEYS.PROFESSOR_ID, firebaseUser.uid);
              } catch (storageError) {
                console.warn('Could not save professor data to localStorage:', storageError);
              }
              
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
                },
                lastActivity: new Date()
              });
              return;
            }
          }
        } catch (error) {
          handleError(error, 'Professor authentication check');
        }
      } else {
        // No Firebase user, check student session
        await checkStudentSession();
      }
    });

    return () => unsubscribe();
  }, [checkStudentSession, handleError]);

  const loginProfessor = async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: undefined }));

      const authData = await authService.loginProfessor(email, password);
      
      // Store professor data for persistence
      try {
        if (authData.token) {
          localStorage.setItem(SESSION_KEYS.PROFESSOR_TOKEN, authData.token);
        }
        localStorage.setItem(SESSION_KEYS.PROFESSOR_ID, authData.user.uid);
      } catch (storageError) {
        console.warn('Could not save professor data to localStorage:', storageError);
      }
      
      setState({
        isLoading: false,
        isAuthenticated: true,
        userType: 'professor',
        professor: authData,
        lastActivity: new Date()
      });

    } catch (error: any) {
      handleError(error, 'Professor login');
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

      // Store session data for persistence
      try {
        localStorage.setItem(SESSION_KEYS.STUDENT_SESSION, JSON.stringify(student.student));
        localStorage.setItem(SESSION_KEYS.STUDENT_CODE, code);
        localStorage.setItem(SESSION_KEYS.LAST_LOGIN, new Date().toISOString());
      } catch (storageError) {
        console.warn('Could not save student session to localStorage:', storageError);
      }

      setState({
        isLoading: false,
        isAuthenticated: true,
        userType: 'student',
        student: {
          name: student.student.name,
          allowedSubjects: student.student.allowedSubjects,
          code,
          lastAccess: new Date(),
          deviceId
        },
        lastActivity: new Date()
      });

    } catch (error: any) {
      handleError(error, 'Student login');
      throw error;
    }
  };

  const logout = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      if (state.userType === 'professor') {
        // Clear Firebase Auth
        await authService.logout();
        // Clear localStorage data for professors
        try {
          localStorage.removeItem(SESSION_KEYS.PROFESSOR_TOKEN);
          localStorage.removeItem(SESSION_KEYS.PROFESSOR_ID);
        } catch (storageError) {
          console.warn('Could not clear professor localStorage:', storageError);
        }
      } else if (state.userType === 'student') {
        // Clear server-side student session (cookies)
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
          });
        } catch (fetchError) {
          console.warn('Could not clear server session:', fetchError);
        }
        
        // Clear localStorage data for students
        try {
          localStorage.removeItem(SESSION_KEYS.STUDENT_SESSION);
          localStorage.removeItem(SESSION_KEYS.LAST_LOGIN);
          localStorage.removeItem(SESSION_KEYS.STUDENT_CODE);
        } catch (storageError) {
          console.warn('Could not clear student localStorage:', storageError);
        }
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