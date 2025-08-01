import { Video } from "@/app/types";
import { useEffect, useRef, useState } from "react";
import Hls from 'hls.js';

interface VideoPlayerProps {
  video: Video | null;
  userName: string;
  isStudent?: boolean;
}

export default function VideoPlayer({ video, userName, isStudent = false }: VideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoData, setVideoData] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    console.log("🎬 VideoPlayer - video prop changed:", video);
    if (video) {
      setIsLoading(true);
      setError(null);
      fetchVideoData();
    }
  }, [video?.id]);

     const fetchVideoData = async () => {
     try {
       // Si el video ya tiene playbackId o muxPlaybackId, usarlo directamente
       const playbackId = video?.playbackId || video?.muxPlaybackId;
       
       if (playbackId) {
         setVideoData({
           streamingUrls: {
             hls: `https://stream.mux.com/${playbackId}.m3u8`,
             poster: `https://image.mux.com/${playbackId}/thumbnail.jpg?time=0`
           }
         });
         setIsLoading(false);
         return;
       }

       // Si no tiene playbackId, intentar obtenerlo del endpoint
       const endpoint = isStudent ? `/api/student/video/${video?.id}` : `/api/mux/video/${video?.id}`;
       
       const response = await fetch(endpoint);
       const data = await response.json();
       
       if (data.success) {
         // Construir las URLs de streaming desde los datos del video
         const videoDataFromApi = data.data;
         const playbackId = videoDataFromApi.muxPlaybackId || videoDataFromApi.playbackId;
         
         if (playbackId) {
           const streamingUrls = {
             hls: `https://stream.mux.com/${playbackId}.m3u8`,
             poster: `https://image.mux.com/${playbackId}/thumbnail.jpg?time=0`
           };
           setVideoData({
             streamingUrls
           });
         } else {
           // Check video status to provide better error messages
           const videoStatus = videoDataFromApi.status;
           if (videoStatus === 'processing') {
             setError("El video está siendo procesado. Inténtalo de nuevo en unos minutos.");
           } else if (videoStatus === 'errored') {
             setError("Error en el procesamiento del video. Contacta a tu profesor.");
           } else if (videoStatus === 'upload_failed') {
             setError("Error en la carga del video. Contacta a tu profesor.");
           } else {
             setError("Video no disponible para reproducción");
           }
         }
       } else {
         setError(data.message || "Error al cargar el video");
       }
     } catch (error) {
       console.error('🎬 VideoPlayer - fetchVideoData error:', error);
       setError("Error al cargar el video");
     } finally {
       setIsLoading(false);
     }
   };

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

     // Initialize HLS.js when video data is available
   useEffect(() => {
     if (videoData?.streamingUrls?.hls && videoRef.current) {
       const video = videoRef.current;
       const hlsUrl = videoData.streamingUrls.hls;
       
       if (Hls.isSupported()) {
         const hls = new Hls();
         hls.loadSource(hlsUrl);
         hls.attachMedia(video);
         
         hls.on(Hls.Events.MANIFEST_PARSED, () => {
           setIsLoading(false);
         });
         
         hls.on(Hls.Events.ERROR, (event, data) => {
           setError("Error al reproducir el video HLS");
         });
       } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
         // Native HLS support (Safari)
         video.src = hlsUrl;
         setIsLoading(false);
       } else {
         setError("Tu navegador no soporta reproducción HLS");
       }
     }
   }, [videoData]);

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

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md bg-white rounded-xl shadow-sm p-8">
          <svg
            className="mx-auto h-12 w-12 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <h3 className="mt-4 text-xl text-gray-700 font-medium">
            Error al cargar el video
          </h3>
          <p className="mt-2 text-base text-gray-600">{error}</p>
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
                         {videoData && (
               <video
                 ref={videoRef}
                 className="w-full h-full"
                 controls
                 poster={videoData.streamingUrls?.poster}
                 style={{
                   userSelect: "none",
                   WebkitUserSelect: "none",
                   MozUserSelect: "none",
                   msUserSelect: "none",
                 }}
               >
                 <source src={videoData.streamingUrls?.hls} type="application/x-mpegURL" />
                 Tu navegador no soporta la reproducción de videos HLS.
               </video>
             )}

            {/* Marca de agua */}
            <div className="absolute bottom-4 right-4 pointer-events-none z-20">
              <span className="text-white text-lg font-medium opacity-30 drop-shadow-lg">
                {userName}
              </span>
            </div>

            <style jsx>{`
              video {
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
              }

              /* Prevenir descarga de video */
              video::-webkit-media-controls-download-button {
                display: none;
              }

              video::-webkit-media-controls-enclosure {
                overflow: hidden;
              }

              video::-webkit-media-controls-panel {
                width: calc(100% + 30px);
              }
            `}</style>
          </div>
        </div>
        {/* Versión mobile */}
        <div className="md:hidden mt-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600">
          <p>
            Contenido protegido por Ley 11.723. Prohibida su reproducción y
            distribución sin autorización.
          </p>
        </div>
        {/* Versión desktop */}
        <div className="hidden md:block mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
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
