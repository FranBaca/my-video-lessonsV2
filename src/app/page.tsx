"use client";

import { useEffect, useState } from "react";
import { Subject, Video, Student } from "./types";
import Sidebar from "./components/Sidebar";
import VideoPlayer from "./components/VideoPlayer";
import LoginForm from "./components/LoginForm";
import WelcomeScreen from "./components/WelcomeScreen";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";

export default function Home() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Iniciar como true para mostrar carga inicial
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    // Check if student is already logged in
    const checkAuth = async () => {
      try {
        // Primero verificamos si hay información en localStorage
        const storedCode = localStorage.getItem("student_code");
        const storedDeviceId = localStorage.getItem("device_id");
        const storedSubjects = localStorage.getItem("allowed_subjects");

        // Preparar los headers
        const headers: HeadersInit = {};
        if (storedDeviceId) headers["X-Device-Id"] = storedDeviceId;
        if (storedCode) headers["X-Student-Code"] = storedCode;
        if (storedSubjects) headers["X-Allowed-Subjects"] = storedSubjects;

        // Si tenemos información en localStorage, intentamos usarla
        if (storedCode && storedDeviceId && storedSubjects) {
          try {
            // Intentar obtener los videos usando las credenciales almacenadas
            const response = await fetch("/api/drive/videos", { headers });
            const data = await response.json();

            if (data.success) {
              setIsAuthenticated(true);
              setSubjects(data.subjects);

              // Reconstruir la información del estudiante desde localStorage
              const parsedSubjects = JSON.parse(storedSubjects);
              setStudent({
                code: storedCode,
                name: "Usuario",
                authorized: true,
                deviceId: storedDeviceId,
                subjects: parsedSubjects,
              });

              setIsLoading(false);
              return;
            }
          } catch (err) {
            console.log(
              "Error al verificar autenticación con localStorage:",
              err
            );
            // Continuamos con la verificación normal si falla
          }
        }

        // Si no hay información en localStorage o falló la verificación, intentamos con la API
        const response = await fetch("/api/drive/videos", { headers });
        const data = await response.json();

        if (data.success) {
          setIsAuthenticated(true);
          setSubjects(data.subjects);
        }
      } catch (err) {
        // Not authenticated, will show login form
        console.log("User not authenticated");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = async (student: Student) => {
    setStudent(student);
    setIsAuthenticated(true);
    setShowWelcome(true);
  };

  const handleContinue = async () => {
    setShowWelcome(false);
    await fetchVideos();
  };

  const fetchVideos = async () => {
    setIsLoading(true);
    try {
      // Obtener información de localStorage
      const deviceId = localStorage.getItem("device_id");
      const studentCode = localStorage.getItem("student_code");
      const allowedSubjects = localStorage.getItem("allowed_subjects");

      // Preparar los headers
      const headers: HeadersInit = {};
      if (deviceId) headers["X-Device-Id"] = deviceId;
      if (studentCode) headers["X-Student-Code"] = studentCode;
      if (allowedSubjects) headers["X-Allowed-Subjects"] = allowedSubjects;

      const response = await fetch("/api/drive/videos", { headers });
      const data = await response.json();

      if (!data.success) {
        // Si falla la API, intentamos usar los datos almacenados en localStorage
        const storedSubjects = localStorage.getItem("allowed_subjects");
        if (storedSubjects) {
          const parsedSubjects = JSON.parse(storedSubjects);
          // Aquí deberíamos tener una lógica para cargar videos desde localStorage si es posible
          // Por ahora, solo mostramos un mensaje
          toast.error(
            "No se pudieron cargar los videos desde el servidor. Intente recargar la página."
          );
        } else {
          throw new Error(data.message || "Failed to fetch videos");
        }
      } else {
        setSubjects(data.subjects);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      toast.error("Error al cargar los videos. Por favor, intente nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubjectSelect = (subject: Subject) => {
    setSelectedSubject(subject.id);
    setSelectedVideo(null);
  };

  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video);
  };

  // Mostrar spinner mientras se carga
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  // Show welcome screen after login
  if (showWelcome && student) {
    return <WelcomeScreen student={student} onContinue={handleContinue} />;
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <div className="text-red-500 text-center">
          {error === "Not authenticated" ? (
            <button
              onClick={() => (window.location.href = "/api/auth")}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Iniciar sesión con Google
            </button>
          ) : (
            error
          )}
        </div>
      </div>
    );
  }

  return (
    <main className="flex flex-col md:flex-row h-screen overflow-hidden">
      <Sidebar
        subjects={subjects}
        selectedSubject={selectedSubject}
        selectedVideo={selectedVideo}
        onSubjectSelect={handleSubjectSelect}
        onVideoSelect={handleVideoSelect}
      />
      <VideoPlayer video={selectedVideo} />
      <Toaster position="top-center" />
    </main>
  );
}
