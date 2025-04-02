import { Video } from "@/app/types";
import { useEffect, useState, useRef } from "react";

interface VideoPlayerProps {
  video: Video | null;
}

export default function VideoPlayer({ video }: VideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Cargar el video
  useEffect(() => {
    if (video) {
      setIsLoading(true);
      setError(null);

      // Simular tiempo de carga
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [video?.id]);

  // Función para manejar errores
  const handleError = () => {
    setError("Error al cargar el video. Por favor, intenta de nuevo.");
    setIsLoading(false);
  };

  // Función para reintentar
  const handleRetry = () => {
    if (video) {
      setIsLoading(true);
      setError(null);

      if (iframeRef.current) {
        // Recargar el iframe forzando un cambio en la URL
        const currentSrc = iframeRef.current.src;
        iframeRef.current.src = "";

        setTimeout(() => {
          if (iframeRef.current) {
            iframeRef.current.src = `${currentSrc}?t=${Date.now()}`;
          }
        }, 500);
      }

      setTimeout(() => {
        setIsLoading(false);
      }, 2000);
    }
  };

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
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-30">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                <p className="text-white mt-4">Cargando video...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-30">
              <div className="text-center p-6 max-w-md">
                <svg
                  className="mx-auto h-12 w-12 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p className="text-white mb-4 mt-2">{error}</p>
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Intentar de nuevo
                </button>
              </div>
            </div>
          )}

          <div className="relative w-full h-full">
            <iframe
              ref={iframeRef}
              src={`/api/video-proxy/${video.id}`}
              className="w-full h-full border-0"
              allow="autoplay; encrypted-media"
              allowFullScreen
              onError={handleError}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
