import { useState, useEffect } from "react";
import { Subject, Video } from "@/app/types";

interface SidebarProps {
  subjects: Subject[];
  selectedSubject: Subject | null;
  selectedVideo: Video | null;
  onSubjectSelect: (subject: Subject) => void;
  onVideoSelect: (video: Video) => void;
  onLogout: () => void;
  studentName: string;
}

export default function Sidebar({
  subjects,
  selectedSubject,
  selectedVideo,
  onSubjectSelect,
  onVideoSelect,
  onLogout,
  studentName,
}: SidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);



  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 1024);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  return (
    <>
      {/* Botón de menú móvil */}
      {isSmallScreen && (
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg hover:bg-gray-50 lg:hidden"
          aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
        >
          <svg
            className="w-6 h-6 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={
                isMobileMenuOpen
                  ? "M6 18L18 6M6 6l12 12"
                  : "M4 6h16M4 12h16M4 18h16"
              }
            />
          </svg>
        </button>
      )}

      {/* Overlay para móvil */}
      {isSmallScreen && isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-80 bg-white transform transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen || !isSmallScreen
            ? "translate-x-0"
            : "-translate-x-full"
        } lg:translate-x-0 border-r border-gray-200`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 mt-10 md:mt-0 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 truncate">
              {studentName}
            </h2>
            <p className="mt-1 text-sm text-gray-500">Selecciona una materia</p>
          </div>

          {/* Lista de materias */}
          <div className="flex-1 overflow-y-auto">
            <nav className="p-4 space-y-1">
              {Array.isArray(subjects) &&
                subjects.map((subject) => (
                  <div key={subject.id} className="space-y-1">
                    <button
                      onClick={() => {
                        onSubjectSelect(subject);
                        if (isSmallScreen) setIsMobileMenuOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-colors duration-200 ${
                        selectedSubject?.id === subject.id
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{subject.name}</span>
                        <svg
                          className={`w-5 h-5 transition-transform duration-200 ${
                            selectedSubject?.id === subject.id
                              ? "rotate-180"
                              : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </button>

                    {selectedSubject?.id === subject.id && (
                      <div className="ml-4 space-y-1">
                        {subject.sections.map((section) => (
                          <div key={section.id} className="mb-4">
                            <div className="text-sm font-medium text-gray-900 mb-2">
                              {section.name}
                            </div>
                            <div className="space-y-1">
                              {section.videos.map((video) => (
                                <button
                                  key={video.id}
                                  onClick={() => {
                                    onVideoSelect(video);
                                    if (isSmallScreen)
                                      setIsMobileMenuOpen(false);
                                  }}
                                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors duration-200 ${
                                    selectedVideo?.id === video.id
                                      ? "bg-gray-100 text-blue-700"
                                      : "text-gray-600 hover:bg-gray-50"
                                  }`}
                                >
                                  <div className="flex items-center">
                                    <svg
                                      className="w-4 h-4 mr-2"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                      />
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                      />
                                    </svg>
                                    <span className="text-sm truncate">
                                      {video.name}
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </nav>
          </div>

          {/* Footer con botón de logout */}
          {/* <div className="p-4 border-t border-gray-200">
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors duration-200"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Cerrar Sesión
            </button>
          </div> */}
        </div>
      </aside>
    </>
  );
}
