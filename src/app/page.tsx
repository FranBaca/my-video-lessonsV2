"use client";

import { useEffect, useState } from "react";
import { Subject, Video, Student } from "./types";
import Sidebar from "./components/Sidebar";
import VideoPlayer from "./components/VideoPlayer";
import LoginForm from "./components/LoginForm";
import WelcomeScreen from "./components/WelcomeScreen";
import { Toaster } from "react-hot-toast";

export default function Home() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    // Check if student is already logged in
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/drive/videos");
        const data = await response.json();

        if (data.success) {
          setIsAuthenticated(true);
          setSubjects(data.subjects);
        }
      } catch (err) {
        // Not authenticated, will show login form
        console.log("User not authenticated");
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
      const response = await fetch("/api/drive/videos");
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch videos");
      }

      setSubjects(data.subjects);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
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

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  // Show welcome screen after login
  if (showWelcome && student) {
    return <WelcomeScreen student={student} onContinue={handleContinue} />;
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
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
