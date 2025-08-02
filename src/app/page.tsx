"use client";

import { useState, useEffect } from "react";
import LoginForm from "./components/LoginForm";
import ProfessorLogin from "./components/ProfessorLogin";
import ProfessorDashboard from "./components/ProfessorDashboard";
import VideoPlayer from "./components/VideoPlayer";
import Sidebar from "./components/Sidebar";
import { Subject, Video } from "./types";
import { authService } from "./lib/auth-service";
import { ProfessorAuthData } from "./lib/auth-service";
import { professorServiceClient } from "./lib/firebase-client";

type AuthState = "selecting" | "professor-login" | "student-login" | "professor-dashboard" | "student-dashboard";

export default function Home() {
  // Estados para estudiantes (mantener funcionalidad actual)
  const [isStudentAuthenticated, setIsStudentAuthenticated] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(false);

  // Estados para profesores
  const [authState, setAuthState] = useState<AuthState>("selecting");
  const [professorAuthData, setProfessorAuthData] = useState<ProfessorAuthData | null>(null);

  // Verificar sesión unificada al cargar
  useEffect(() => {
    const checkUnifiedSession = async () => {
      try {
        const response = await fetch("/api/auth/check-session");
        const data = await response.json();

        if (data.success && data.authenticated) {
          if (data.type === 'professor') {
            // Profesor autenticado
            setProfessorAuthData({
              user: {
                uid: data.professor.id,
                email: data.professor.email,
                displayName: data.professor.name,
                photoURL: undefined
              },
              professor: data.professor
            });
            setAuthState("professor-dashboard");
          } else if (data.type === 'student') {
            // Estudiante autenticado
            setStudentName(data.student.name);
            setIsStudentAuthenticated(true);
            setAuthState("student-dashboard");
          }
        } else {
          // No hay sesión válida, verificar Firebase Auth como fallback
          const unsubscribe = authService.onAuthStateChange((user) => {
            if (user) {
              // Usuario autenticado, verificar si es profesor
              authService.isProfessor(user.uid).then((isProfessor) => {
                if (isProfessor) {
                  // Es profesor, cargar datos del profesor
                  loadProfessorData(user.uid);
                }
              });
            } else {
              // No hay sesión, volver al selector
              setAuthState("selecting");
              setProfessorAuthData(null);
            }
          });

          return () => unsubscribe();
        }
      } catch (error) {
        setAuthState("selecting");
      }
    };

    checkUnifiedSession();
  }, []);

  // Cargar datos del profesor
  const loadProfessorData = async (professorId: string) => {
    try {
      const professor = await professorServiceClient.getById(professorId);
      
      if (professor) {
        setProfessorAuthData({
          user: {
            uid: professorId,
            email: professor.email,
            displayName: professor.name,
            photoURL: undefined // Removido profileImage que no existe en el tipo
          },
          professor
        });
        setAuthState("professor-dashboard");
      }
    } catch (error) {
      setAuthState("selecting");
    }
  };

  // Cargar videos cuando el estudiante está autenticado
  useEffect(() => {
    if (isStudentAuthenticated) {
      loadVideos();
    }
  }, [isStudentAuthenticated]);

  // Cargar videos del servidor
  const loadVideos = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/student/videos");
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Error al cargar las clases");
      }

      setSubjects(data.subjects);
      
      if (data.subjects.length > 0) {
        const firstSubject = data.subjects[0];
        setSelectedSubject(firstSubject);
        
        if (
          firstSubject.sections.length > 0 &&
          firstSubject.sections[0].videos.length > 0
        ) {
          const firstVideo = firstSubject.sections[0].videos[0];
          setSelectedVideo(firstVideo);
        }
      }
    } catch (error) {
      // Error handling silently for production
    } finally {
      setLoading(false);
    }
  };

  // Handlers para estudiantes
  const handleStudentLoginSuccess = (name: string, allowedSubjects: string[]) => {
    setStudentName(name);
    setIsStudentAuthenticated(true);
    setAuthState("student-dashboard");
  };

  const handleSubjectSelect = (subject: Subject) => {
    setSelectedSubject(subject);
    if (subject.sections.length > 0 && subject.sections[0].videos.length > 0) {
      setSelectedVideo(subject.sections[0].videos[0]);
    } else {
      setSelectedVideo(null);
    }
  };

  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video);
  };

  const handleStudentLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Error al cerrar sesión");
      }

      // Limpiar el estado y redirigir al selector
      setIsStudentAuthenticated(false);
      setStudentName("");
      setSubjects([]);
      setSelectedSubject(null);
      setSelectedVideo(null);
      setAuthState("selecting");
    } catch (error) {
      // Error handling silently for production
    }
  };

  // Handlers para profesores
  const handleProfessorLoginSuccess = (authData: ProfessorAuthData) => {
    setProfessorAuthData(authData);
    setAuthState("professor-dashboard");
  };

  const handleProfessorLogout = async () => {
    try {
      await authService.logout();
      setProfessorAuthData(null);
      setAuthState("selecting");
    } catch (error) {
      // Aún así, limpiar el estado local
      setProfessorAuthData(null);
      setAuthState("selecting");
    }
  };

  // Selector de tipo de usuario
  if (authState === "selecting") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Bienvenido a Video Lessons
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Selecciona tu tipo de usuario
            </p>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={() => setAuthState("professor-login")}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Acceso para Profesores
            </button>
            
            <button
              onClick={() => setAuthState("student-login")}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
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

  // Login de profesores
  if (authState === "professor-login") {
    return (
      <ProfessorLogin
        onLoginSuccess={handleProfessorLoginSuccess}
        onSwitchToStudent={() => setAuthState("student-login")}
      />
    );
  }

  // Login de estudiantes
  if (authState === "student-login") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Acceso para Estudiantes
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Ingresa tu código de estudiante
            </p>
          </div>
          
          <LoginForm onSuccess={handleStudentLoginSuccess} />
          
          <div className="text-center">
            <button
              onClick={() => setAuthState("professor-login")}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              ¿Eres profesor? Accede aquí
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard de profesores
  if (authState === "professor-dashboard" && professorAuthData) {
    return (
      <ProfessorDashboard
        professorId={professorAuthData.user.uid}
        professor={professorAuthData.professor}
        onLogout={handleProfessorLogout}
      />
    );
  }

  // Vista de estudiantes (mantener funcionalidad actual)
  if (authState === "student-dashboard" && isStudentAuthenticated) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar
          subjects={subjects}
          selectedSubject={selectedSubject}
          selectedVideo={selectedVideo}
          onSubjectSelect={handleSubjectSelect}
          onVideoSelect={handleVideoSelect}
          onLogout={handleStudentLogout}
          studentName={studentName}
        />

        <main className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-base text-gray-700 font-medium">
                  Cargando videos...
                </p>
              </div>
            </div>
          ) : subjects.length === 0 ? (
            <div className="flex items-center justify-center h-full p-6">
              <div className="text-center max-w-md bg-white rounded-xl shadow-sm p-8">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                  />
                </svg>
                <h3 className="mt-4 text-xl text-gray-700 font-medium">
                  No hay clases disponibles
                </h3>
                <p className="mt-2 text-base text-gray-600">
                  Vuelve a intentarlo más tarde
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <VideoPlayer video={selectedVideo} userName={studentName} isStudent={true} />
            </div>
          )}
        </main>
      </div>
    );
  }

  // Estado de carga por defecto
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Cargando...</p>
      </div>
    </div>
  );
}
