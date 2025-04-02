"use client";

import { useState, useEffect, useRef } from "react";
import LoginForm from "./components/LoginForm";
import VideoPlayer from "./components/VideoPlayer";
import Sidebar from "./components/Sidebar";
import { Subject, Video } from "./types";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Referencia para el intervalo de refresco de sesión
  const sessionRefreshInterval = useRef<NodeJS.Timeout | null>(null);
  const sessionCheckAttempted = useRef(false);

  // Verificar si hay una sesión existente al cargar la página
  useEffect(() => {
    // Prevenir múltiples intentos de verificación de sesión
    if (sessionCheckAttempted.current) return;
    sessionCheckAttempted.current = true;

    const checkExistingSession = async () => {
      try {
        const response = await fetch("/api/auth/refresh", {
          // Usar no-cache para evitar problemas con la caché
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            handleLoginSuccess(data.student.name, data.student.subjects);
          }
        }
      } catch (error) {
        console.error("Error al verificar sesión existente:", error);
      } finally {
        setCheckingSession(false);
      }
    };

    checkExistingSession();
  }, []);

  // Cargar videos cuando el usuario está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      loadVideos();
      startSessionRefresh();
    }

    // Limpiar el intervalo cuando se desmonta el componente o el usuario cierra sesión
    return () => {
      if (sessionRefreshInterval.current) {
        clearInterval(sessionRefreshInterval.current);
        sessionRefreshInterval.current = null;
      }
    };
  }, [isAuthenticated]);

  // Iniciar el mecanismo de refresco de sesión
  const startSessionRefresh = () => {
    // Refrescar la sesión cada 10 minutos (600000 ms)
    sessionRefreshInterval.current = setInterval(refreshSession, 600000);

    // También refrescar cuando el usuario vuelve a la pestaña
    window.addEventListener("focus", refreshSession);

    return () => {
      window.removeEventListener("focus", refreshSession);
    };
  };

  // Función para refrescar la sesión
  const refreshSession = async () => {
    try {
      const response = await fetch("/api/auth/refresh", {
        // Usar no-cache para evitar problemas con la caché
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (!response.ok) {
        throw new Error("Error al refrescar la sesión");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Error al refrescar la sesión");
      }

      console.log("Sesión refrescada correctamente");
    } catch (error) {
      console.error("Error al refrescar la sesión:", error);
      // Si hay un error grave de sesión, podríamos mostrar un mensaje o cerrar sesión
      // pero preferimos mantener la experiencia de usuario sin interrupciones
    }
  };

  // Cargar videos del servidor
  const loadVideos = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/drive/videos");
      const data = await response.json();

      console.log("API Response:", {
        fullData: data,
        success: data.success,
        subjectsType: typeof data.subjects,
        isSubjectsArray: Array.isArray(data.subjects),
        subjects: data.subjects,
      });

      if (!data.success) {
        throw new Error(data.message || "Error al cargar los videos");
      }

      setSubjects(data.subjects);
      if (data.subjects.length > 0) {
        setSelectedSubject(data.subjects[0]);
        if (
          data.subjects[0].sections.length > 0 &&
          data.subjects[0].sections[0].videos.length > 0
        ) {
          setSelectedVideo(data.subjects[0].sections[0].videos[0]);
        }
      }
    } catch (error) {
      console.error("Error loading videos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (name: string, allowedSubjects: string[]) => {
    setStudentName(name);
    setIsAuthenticated(true);
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

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Error al cerrar sesión");
      }

      // Limpiar el estado y redirigir al login
      setIsAuthenticated(false);
      setStudentName("");
      setSubjects([]);
      setSelectedSubject(null);
      setSelectedVideo(null);

      // Limpiar el intervalo de refresco de sesión
      if (sessionRefreshInterval.current) {
        clearInterval(sessionRefreshInterval.current);
        sessionRefreshInterval.current = null;
      }
    } catch (error) {
      console.error("Error durante el logout:", error);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm onSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        subjects={subjects}
        selectedSubject={selectedSubject}
        selectedVideo={selectedVideo}
        onSubjectSelect={handleSubjectSelect}
        onVideoSelect={handleVideoSelect}
        onLogout={handleLogout}
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
                No hay videos disponibles
              </h3>
              <p className="mt-2 text-base text-gray-600">
                Vuelve a intentarlo más tarde
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <VideoPlayer video={selectedVideo} />
          </div>
        )}
      </main>
    </div>
  );
}
