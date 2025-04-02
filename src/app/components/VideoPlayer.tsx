import { Video } from "@/app/types";
import { useEffect, useRef, useState } from "react";

interface VideoPlayerProps {
  video: Video | null;
}

export default function VideoPlayer({ video }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [useFallback, setUseFallback] = useState(false);
  const maxRetries = 3;

  // Reiniciar el estado cuando cambia el video
  useEffect(() => {
    if (video) {
      setIsLoading(true);
      setError(null);
      setRetryCount(0);
      setUseFallback(false);

      if (videoRef.current) {
        videoRef.current.load();
      }
    }
  }, [video?.id]);

  // Implementar un timeout para detectar problemas de carga
  useEffect(() => {
    if (video && isLoading && !useFallback) {
      const loadingTimer = setTimeout(() => {
        if (isLoading && retryCount < maxRetries) {
          console.log(`Intento ${retryCount + 1} de cargar el video...`);
          setRetryCount((prev) => prev + 1);

          if (videoRef.current) {
            // Forzar recarga del video
            const currentSrc = videoRef.current.src;
            videoRef.current.src = "";
            setTimeout(() => {
              if (videoRef.current) {
                videoRef.current.src = currentSrc;
                videoRef.current.load();
              }
            }, 1000);
          }
        } else if (isLoading && retryCount >= maxRetries) {
          setIsLoading(false);
          setError(
            "No se pudo cargar el video después de varios intentos. Cambiando a modo alternativo..."
          );
          // Después de mostrar el error brevemente, activar el fallback
          setTimeout(() => {
            setUseFallback(true);
            setError(null);
            setIsLoading(true);
            // Dar tiempo para que cargue el iframe
            setTimeout(() => {
              setIsLoading(false);
            }, 3000);
          }, 2000);
        }
      }, 10000); // 10 segundos de timeout

      return () => clearTimeout(loadingTimer);
    }
  }, [video, isLoading, retryCount, useFallback]);

  // Guardar y restaurar la posición del video
  useEffect(() => {
    if (useFallback) return; // No intentar restaurar posición en modo fallback

    const savedTimes = localStorage.getItem("videoTimes");
    const timesMap = savedTimes ? JSON.parse(savedTimes) : {};

    if (video?.id && timesMap[video.id]) {
      setCurrentTime(timesMap[video.id]);
    } else {
      setCurrentTime(0);
    }
  }, [video?.id, useFallback]);

  const handleTimeUpdate = () => {
    if (videoRef.current && video?.id && !useFallback) {
      const currentVideoTime = videoRef.current.currentTime;
      const savedTimes = localStorage.getItem("videoTimes");
      const timesMap = savedTimes ? JSON.parse(savedTimes) : {};

      // Guardar cada 5 segundos para no sobrecargar localStorage
      if (Math.abs(currentVideoTime - (timesMap[video.id] || 0)) > 5) {
        timesMap[video.id] = currentVideoTime;
        localStorage.setItem("videoTimes", JSON.stringify(timesMap));
      }
    }
  };

  const handleLoadStart = () => {
    setIsLoading(true);
    setError(null);
  };

  const handleCanPlay = () => {
    setIsLoading(false);

    // Restaurar la posición del video
    if (videoRef.current && currentTime > 0 && !useFallback) {
      videoRef.current.currentTime = currentTime;
    }
  };

  const handleError = () => {
    if (retryCount < maxRetries) {
      console.log(`Error en intento ${retryCount + 1}, reintentando...`);
      setRetryCount((prev) => prev + 1);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.load();
        }
      }, 2000);
    } else {
      setIsLoading(false);
      setError(
        "Error al cargar el video. Cambiando a reproductor alternativo..."
      );

      // Activar modo fallback después de mostrar el mensaje
      setTimeout(() => {
        setUseFallback(true);
        setError(null);
        setIsLoading(true);
        // Dar tiempo para que cargue el iframe
        setTimeout(() => {
          setIsLoading(false);
        }, 3000);
      }, 2000);
    }
  };

  const handleRetry = () => {
    if (useFallback) {
      // Si estamos en modo fallback, volver al reproductor normal
      setUseFallback(false);
      setIsLoading(true);
      setError(null);
      setRetryCount(0);

      setTimeout(() => {
        if (videoRef.current && video) {
          // Forzar recarga completa del video
          const videoUrl = `/api/drive/proxy/${video.id}?t=${Date.now()}`; // Añadir timestamp para evitar caché
          videoRef.current.src = videoUrl;
          videoRef.current.load();
        }
      }, 500);
    } else if (videoRef.current && video) {
      setIsLoading(true);
      setError(null);
      setRetryCount(0);

      // Forzar recarga completa del video
      const videoUrl = `/api/drive/proxy/${video.id}?t=${Date.now()}`; // Añadir timestamp para evitar caché
      videoRef.current.src = videoUrl;
      videoRef.current.load();
    }
  };

  const handleFallbackClick = () => {
    setUseFallback(true);
    setError(null);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 3000);
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
        <div className="flex justify-between items-center mb-6">
          <div className="h-px bg-gray-200 flex-grow"></div>
          {useFallback ? (
            <button
              onClick={handleRetry}
              className="ml-4 px-3 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
              title="Usar reproductor nativo"
            >
              Usar reproductor nativo
            </button>
          ) : (
            <button
              onClick={handleFallbackClick}
              className="ml-4 px-3 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
              title="Usar reproductor alternativo"
            >
              Usar reproductor alternativo
            </button>
          )}
        </div>
        <div className="aspect-video w-full max-w-5xl mx-auto bg-black rounded-xl overflow-hidden shadow-lg relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                <p className="text-white mt-4">
                  {useFallback
                    ? "Cargando reproductor alternativo..."
                    : retryCount > 0
                    ? `Reintentando cargar (${retryCount}/${maxRetries})...`
                    : "Cargando video..."}
                </p>
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-10">
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
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={handleRetry}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Intentar de nuevo
                  </button>
                  <button
                    onClick={handleFallbackClick}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Usar reproductor alternativo
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="relative w-full h-full">
            {!useFallback ? (
              <video
                ref={videoRef}
                key={`${video.id}-${retryCount}`}
                className="w-full h-full"
                controls
                controlsList="nodownload"
                playsInline
                preload="metadata"
                onLoadStart={handleLoadStart}
                onCanPlay={handleCanPlay}
                onError={handleError}
                onTimeUpdate={handleTimeUpdate}
              >
                <source
                  src={`/api/drive/proxy/${video.id}`}
                  type={video.mimeType || "video/mp4"}
                />
                Tu navegador no soporta la reproducción de videos.
              </video>
            ) : (
              <div className="relative w-full h-full">
                <iframe
                  src={`https://drive.google.com/file/d/${video.id}/preview`}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
                <div className="absolute bottom-4 left-4 z-20">
                  <div className="bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-md">
                    Modo alternativo de reproducción
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
