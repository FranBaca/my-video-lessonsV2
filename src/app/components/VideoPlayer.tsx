import { Video } from "@/app/types";
import { useEffect, useRef, useState } from "react";

interface VideoPlayerProps {
  video: Video | null;
}

export default function VideoPlayer({ video }: VideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (video) {
      setIsLoading(true);
      setError(null);
    }
  }, [video?.id]);

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
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
              }
            `}</style>
          </div>
        </div>
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-start">
            <svg
              className="h-6 w-6 text-gray-500 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-gray-900">Aviso Legal</h3>
              <div className="mt-2 text-sm text-gray-600">
                <p>
                  Este contenido está protegido por derechos de autor según la
                  Ley 11.723 de Propiedad Intelectual de la República Argentina.
                  La reproducción, distribución, comunicación pública o
                  cualquier otro uso no autorizado de este material constituye
                  una infracción a los derechos de autor y puede resultar en
                  acciones legales.
                </p>
                <p className="mt-2">
                  El acceso a este contenido es personal e intransferible.
                  Cualquier intento de compartir, grabar, capturar o distribuir
                  este material sin autorización expresa está prohibido y puede
                  ser perseguido legalmente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
