"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from '../providers/SessionProvider';
import LoginForm from "./LoginForm";
import ProfessorLogin from "./ProfessorLogin";
import ProfessorDashboard from "./ProfessorDashboard";
import VideoPlayer from "./VideoPlayer";
import Sidebar from "./Sidebar";
import { Subject, Video } from "../types";

type AuthState = "selecting" | "professor-login" | "student-login";

export default function ClientHomePage() {
  const { state, loginStudent, loginProfessor, logout, clearError } = useSession();
  const [authState, setAuthState] = useState<AuthState>("selecting");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Load videos when student is authenticated
  useEffect(() => {
    if (state.userType === 'student' && state.isAuthenticated) {
      loadVideos();
    }
  }, [state.userType, state.isAuthenticated]);

  // Enhanced video loading with retry logic
  const loadVideos = useCallback(async (isRetry: boolean = false) => {
    if (isRetry) {
      setRetryCount(prev => prev + 1);
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/student/videos", {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Session expired, redirect to login
          await logout();
          return;
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Error al cargar las clases");
      }

      setSubjects(data.subjects);
      
      if (data.subjects.length > 0) {
        const firstSubject = data.subjects[0];
        setSelectedSubject(firstSubject);
        
        if (firstSubject.sections.length > 0 && firstSubject.sections[0].videos.length > 0) {
          setSelectedVideo(firstSubject.sections[0].videos[0]);
        }
      }
      
      // Reset retry count on success
      setRetryCount(0);
    } catch (error) {
      console.error('Error loading videos:', error);
      const errorMessage = error instanceof Error ? error.message : "Error al cargar las clases";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [logout]);

  const handleStudentLoginSuccess = async (code: string) => {
    try {
      await loginStudent(code);
    } catch (error) {
      // Error is handled by SessionProvider
      console.error('Student login failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      // Reset local state
      setSubjects([]);
      setSelectedSubject(null);
      setSelectedVideo(null);
      setError(null);
      setRetryCount(0);
      setAuthState("selecting");
    } catch (error) {
      console.error('Logout error:', error);
      // Force reset even if logout fails
      setSubjects([]);
      setSelectedSubject(null);
      setSelectedVideo(null);
      setError(null);
      setRetryCount(0);
      setAuthState("selecting");
    }
  };

  const handleRetry = () => {
    loadVideos(true);
  };

  const handleErrorDismiss = () => {
    setError(null);
    clearError();
  };

  // Loading state with better UX
  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-6 text-lg text-gray-700 font-medium">Cargando aplicación...</p>
          <p className="mt-2 text-sm text-gray-500">Verificando tu sesión</p>
        </div>
      </div>
    );
  }

  // Error state with recovery options
  if (state.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 shadow-sm">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-red-800 mb-2">
              Ha ocurrido un error
            </h3>
            <p className="text-red-700 mb-6">{state.error}</p>
            <div className="space-y-3">
              <button
                onClick={handleErrorDismiss}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Intentar nuevamente
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Recargar página
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated - show login options or login forms
  if (!state.isAuthenticated) {
    // Show login forms if authState is set
    if (authState === "professor-login") {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <ProfessorLogin
              onSwitchToStudent={() => setAuthState("student-login")}
            />
          </div>
        </div>
      );
    }

    if (authState === "student-login") {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <LoginForm onSuccess={handleStudentLoginSuccess} />
            
            <div className="text-center">
              <button
                onClick={() => setAuthState("professor-login")}
                className="text-sm text-blue-600 hover:text-blue-500 transition-colors"
              >
                ¿Eres profesor? Accede aquí
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Show main login options with enhanced UI
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900">
              Bienvenido a Video Lessons
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Selecciona tu tipo de usuario para continuar
            </p>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={() => setAuthState("professor-login")}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Acceso para Profesores
            </button>
            
            <button
              onClick={() => setAuthState("student-login")}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors shadow-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Acceso para Estudiantes
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Professor dashboard
  if (state.userType === 'professor' && state.professor) {
    return (
      <ProfessorDashboard
        professorId={state.professor.user.uid}
        professor={state.professor.professor}
        onLogout={handleLogout}
      />
    );
  }

  // Student dashboard with enhanced error handling
  if (state.userType === 'student' && state.student) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar
          subjects={subjects}
          selectedSubject={selectedSubject}
          selectedVideo={selectedVideo}
          onSubjectSelect={setSelectedSubject}
          onVideoSelect={setSelectedVideo}
          onLogout={handleLogout}
          studentName={state.student.name}
        />

        <main className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-base text-gray-700 font-medium">
                  Cargando videos...
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  {retryCount > 0 ? `Intento ${retryCount + 1}` : 'Preparando tu contenido'}
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full p-6">
              <div className="text-center max-w-md bg-white rounded-xl shadow-sm p-8">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-xl text-gray-700 font-medium">
                  Error al cargar las clases
                </h3>
                <p className="mt-2 text-base text-gray-600">
                  {error}
                </p>
                <div className="mt-6 space-y-3">
                  <button
                    onClick={handleRetry}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? "Cargando..." : "Reintentar"}
                  </button>
                  {retryCount > 0 && (
                    <button
                      onClick={() => window.location.reload()}
                      className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Recargar página
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : subjects.length === 0 ? (
            <div className="flex items-center justify-center h-full p-6">
              <div className="text-center max-w-md bg-white rounded-xl shadow-sm p-8">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4">
                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                  </svg>
                </div>
                <h3 className="text-xl text-gray-700 font-medium">
                  No hay clases disponibles
                </h3>
                <p className="mt-2 text-base text-gray-600">
                  Vuelve a intentarlo más tarde
                </p>
                <button
                  onClick={handleRetry}
                  disabled={loading}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Cargando..." : "Reintentar"}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <VideoPlayer video={selectedVideo} userName={state.student.name} isStudent={true} />
            </div>
          )}
        </main>
      </div>
    );
  }

  return null;
}
