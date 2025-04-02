import { Video } from "@/app/types";
import { useEffect, useState } from "react";

interface VideoPlayerProps {
  video: Video | null;
}

export default function VideoPlayer({ video }: VideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);

  // Cargar el video
  useEffect(() => {
    if (video) {
      setIsLoading(true);
      // Simular tiempo de carga con un pequeño delay
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [video?.id]);

  if (!video) {
    return (
      <div className="flex items-center justify-center h-full">
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
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-4 text-xl text-gray-700 font-medium">
            Selecciona una clase
          </h3>
          <p className="mt-2 text-base text-gray-600">
            Elige una clase del menú para comenzar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{video.name}</h1>
        <div className="h-px bg-gray-200 w-full mb-6" />

        <div className="aspect-video w-full max-w-5xl mx-auto bg-black rounded-xl overflow-hidden shadow-lg relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                <p className="text-white mt-4">Cargando video...</p>
              </div>
            </div>
          )}

          <div className="relative w-full h-full">
            {/* Iframe de Google Drive */}
            <iframe
              src={`https://drive.google.com/file/d/${video.id}/preview`}
              className="w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />

            {/* Capa que cubre el botón de Google Drive en la esquina superior derecha */}
            <div className="absolute top-0 right-0 w-12 h-12 bg-black z-20" />

            {/* Capa adicional que cubre todo el banner superior si fuera necesario */}
            <div className="absolute top-0 right-0 h-12 w-24 bg-black z-10 opacity-0 hover:opacity-0" />
          </div>
        </div>
      </div>
    </div>
  );
}
