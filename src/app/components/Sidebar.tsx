import { useState } from "react";
import { Subject, Video } from "@/app/types";

interface SidebarProps {
  subjects: Subject[];
  selectedSubject: string | null;
  selectedVideo: Video | null;
  onSubjectSelect: (subject: Subject) => void;
  onVideoSelect: (video: Video) => void;
}

export default function Sidebar({
  subjects,
  selectedSubject,
  selectedVideo,
  onSubjectSelect,
  onVideoSelect,
}: SidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="md:hidden fixed top-0 left-0 z-40 p-4">
        <button
          onClick={toggleMobileMenu}
          className="bg-blue-500 text-black p-2 rounded-md"
          aria-label="Toggle menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
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
      </div>

      {/* Sidebar for desktop */}
      <div
        className={`
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} 
        md:translate-x-0
        fixed md:static top-0 left-0 z-30
        w-64 h-screen bg-gray-100 p-4 overflow-y-auto
        transition-transform duration-300 ease-in-out
        md:transition-none text-black
      `}
      >
        <div className="pt-16 md:pt-0">
          <h2 className="text-xl font-bold mb-4">Asignaturas</h2>

          <div className="space-y-4">
            {subjects.map((subject) => (
              <div key={subject.id}>
                <button
                  onClick={() => {
                    onSubjectSelect(subject);
                    if (window.innerWidth < 768) {
                      setIsMobileMenuOpen(false);
                    }
                  }}
                  className={`w-full text-left p-2 rounded ${
                    selectedSubject === subject.id
                      ? "bg-blue-500 text-black"
                      : "hover:bg-gray-200"
                  }`}
                >
                  {subject.name}
                </button>

                {selectedSubject === subject.id && (
                  <div className="ml-4 mt-2 space-y-2">
                    {subject.videos.map((video) => (
                      <button
                        key={video.id}
                        onClick={() => {
                          onVideoSelect(video);
                          if (window.innerWidth < 768) {
                            setIsMobileMenuOpen(false);
                          }
                        }}
                        className={`w-full text-left p-2 rounded text-sm ${
                          selectedVideo?.id === video.id
                            ? "bg-blue-200"
                            : "hover:bg-gray-200"
                        }`}
                      >
                        {video.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={toggleMobileMenu}
        />
      )}
    </>
  );
}
