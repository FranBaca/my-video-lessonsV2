"use client";

import { useState, useEffect } from "react";
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

  // Cargar videos cuando el usuario está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      loadVideos();
    }
  }, [isAuthenticated]);

  // Cargar videos del servidor
  const loadVideos = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/drive/videos");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al cargar los videos");
      }

      setSubjects(data.subjects);

      // Seleccionar automáticamente el primer subject y video si están disponibles
      if (data.subjects.length > 0) {
        const firstSubject = data.subjects[0];
        setSelectedSubject(firstSubject);
        if (firstSubject.videos.length > 0) {
          setSelectedVideo(firstSubject.videos[0]);
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
    if (subject.videos.length > 0) {
      setSelectedVideo(subject.videos[0]);
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
    } catch (error) {
      console.error("Error durante el logout:", error);
    }
  };

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
