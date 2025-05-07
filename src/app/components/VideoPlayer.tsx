import { Video } from "@/app/types";
import { useEffect, useRef, useState } from "react";

interface VideoPlayerProps {
  video: Video | null;
}

export default function VideoPlayer({ video }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isScreenRecording, setIsScreenRecording] = useState(false);

  useEffect(() => {
    if (video) {
      setIsLoading(true);
      setError(null);
    }
  }, [video?.id]);

  useEffect(() => {
    // Detectar grabación de pantalla
    const checkScreenRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia();
        if (stream) {
          setIsScreenRecording(true);
          stream.getTracks().forEach((track) => track.stop());
        }
      } catch (err) {
        // Si el usuario cancela la selección de pantalla, no es una grabación
        setIsScreenRecording(false);
      }
    };

    // Verificar cada 5 segundos
    const interval = setInterval(checkScreenRecording, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  // Prevenir capturas de pantalla
  useEffect(() => {
    const preventScreenCapture = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "s")) {
        e.preventDefault();
      }
    };

    document.addEventListener("keydown", preventScreenCapture);
    return () => document.removeEventListener("keydown", preventScreenCapture);
  }, []);

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

  if (isScreenRecording) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md bg-white rounded-xl shadow-sm p-8">
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
          <h3 className="mt-4 text-xl text-gray-700 font-medium">
            Grabación de pantalla detectada
          </h3>
          <p className="mt-2 text-base text-gray-600">
            Por favor, detén la grabación de pantalla para continuar viendo el
            contenido.
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
            <div className="embed-container">
              <iframe
                src={`https://drive.google.com/file/d/${video.id}/preview`}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
                onLoad={handleLoadingComplete}
                style={{
                  pointerEvents: isScreenRecording ? "none" : "auto",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                  MozUserSelect: "none",
                  msUserSelect: "none",
                }}
              />
            </div>

            <style jsx>{`
              .embed-container {
                position: relative;
                width: 100%;
                height: 100%;
                overflow: hidden;
              }

              .embed-container iframe {
                position: absolute;
                top: -60px;
                left: 0;
                width: 100%;
                height: calc(100% + 60px);
                border: 0;
              }

              /* Prevenir capturas de pantalla */
              .embed-container {
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
              }

              /* Agregar marca de agua */
              .embed-container::after {
                content: "${video.name}";
                position: absolute;
                bottom: 20px;
                right: 20px;
                color: rgba(255, 255, 255, 0.3);
                font-size: 24px;
                pointer-events: none;
                z-index: 1000;
              }
            `}</style>
          </div>
        </div>
      </div>
    </div>
  );
}
