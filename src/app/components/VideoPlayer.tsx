import React, { useState, useRef, useEffect, useCallback } from "react";
import Hls from "hls.js";
import { Video } from "@/app/types";

interface VideoPlayerProps {
  video: Video | null;
  userName: string;
  isStudent?: boolean;
}

export default function VideoPlayer({ video, userName, isStudent = false }: VideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoData, setVideoData] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const fetchVideoData = useCallback(async () => {
    try {
      // Para estudiantes, siempre hacer la llamada API para obtener datos frescos
      if (isStudent) {
        const endpoint = `/api/student/video/${video?.id}`;
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
              streamingUrls,
              videoId: video?.id
            });
          } else {
            // Check video status to provide better error messages
            const videoStatus = videoDataFromApi.status;
            if (videoStatus === 'processing') {
              setError("La clase está siendo procesada. Inténtalo de nuevo en unos minutos.");
            } else if (videoStatus === 'errored') {
              setError("Error en el procesamiento de la clase. Contacta a tu profesor.");
            } else if (videoStatus === 'upload_failed') {
              setError("Error en la carga de la clase. Contacta a tu profesor.");
            } else {
              setError("Clase no disponible para reproducción");
            }
          }
        } else {
          setError(data.message || "Error al cargar la clase");
        }
        return;
      }

      // Para profesores, usar la lógica original
      const playbackId = video?.playbackId || video?.muxPlaybackId;
      
      if (playbackId) {
        setVideoData({
          streamingUrls: {
            hls: `https://stream.mux.com/${playbackId}.m3u8`,
            poster: `https://image.mux.com/${playbackId}/thumbnail.jpg?time=0`
          },
          videoId: video?.id
        });
        setIsLoading(false);
        return;
      }

      // Si no tiene playbackId, intentar obtenerlo del endpoint
      const endpoint = `/api/mux/video/${video?.id}`;
      
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
            streamingUrls,
            videoId: video?.id
          });
        } else {
          // Check video status to provide better error messages
          const videoStatus = videoDataFromApi.status;
          if (videoStatus === 'processing') {
            setError("La clase está siendo procesada. Inténtalo de nuevo en unos minutos.");
          } else if (videoStatus === 'errored') {
            setError("Error en el procesamiento de la clase. Contacta a tu profesor.");
          } else if (videoStatus === 'upload_failed') {
            setError("Error en la carga de la clase. Contacta a tu profesor.");
          } else {
            setError("Clase no disponible para reproducción");
          }
        }
      } else {
        setError(data.message || "Error al cargar la clase");
      }
    } catch (error) {
      setError("Error al cargar la clase");
    } finally {
      setIsLoading(false);
    }
  }, [video?.id, isStudent]);

  useEffect(() => {
    if (video?.id) {
      setIsLoading(true);
      setError(null);
      // Only reset video data if we're switching to a different video
      if (!videoData || videoData.videoId !== video.id) {
        setVideoData(null);
      }
      fetchVideoData();
    }
  }, [video?.id, fetchVideoData]);

  // Cleanup HLS instance only when component unmounts
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);





     // Initialize HLS.js when video data is available
   useEffect(() => {
     if (videoData?.streamingUrls?.hls && videoRef.current) {
       const video = videoRef.current;
       const hlsUrl = videoData.streamingUrls.hls;
       
       // Only clean up if we have a different URL
       if (hlsRef.current && hlsRef.current.url !== hlsUrl) {
         hlsRef.current.destroy();
         hlsRef.current = null;
       }
       
       if (Hls.isSupported()) {
         // Only create new HLS instance if we don't have one or URL changed
         if (!hlsRef.current) {
           const hls = new Hls();
           hlsRef.current = hls;
           hls.attachMedia(video);
           
           hls.on(Hls.Events.MANIFEST_PARSED, () => {
             setIsLoading(false);
           });
           
           hls.on(Hls.Events.ERROR, (event, data) => {
             setError("Error al reproducir la clase HLS");
           });
         }
         
         // Load the new source
         hlsRef.current.loadSource(hlsUrl);
       } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
         // Native HLS support (Safari)
         video.src = hlsUrl;
         setIsLoading(false);
       } else {
         setError("Tu navegador no soporta reproducción HLS");
       }
     }
   }, [videoData]);

  // Prevenir capturas de pantalla y manejar fullscreen
  useEffect(() => {
    const preventScreenCapture = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "s")) {
        e.preventDefault();
      }
    };

    const handleFullscreenChange = () => {
      const isFullscreenNow = !!document.fullscreenElement;
      setIsFullscreen(isFullscreenNow);
    };

    // Interceptar el fullscreen nativo del video
    const handleVideoFullscreen = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      
      const videoContainer = document.getElementById('video-container');
      if (videoContainer && !document.fullscreenElement) {
        videoContainer.requestFullscreen().catch(err => {
          console.error('Error al entrar en fullscreen:', err);
        });
      }
    };

    // También prevenir con teclas
    const preventFullscreenKey = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        const videoContainer = document.getElementById('video-container');
        if (videoContainer && !document.fullscreenElement) {
          videoContainer.requestFullscreen().catch(err => {
            console.error('Error al entrar en fullscreen:', err);
          });
        }
      }
    };

    document.addEventListener("keydown", preventScreenCapture);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    
    // Agregar listener al video para interceptar fullscreen nativo
    if (videoRef.current) {
      videoRef.current.addEventListener('webkitbeginfullscreen', handleVideoFullscreen);
      videoRef.current.addEventListener('webkitendfullscreen', handleVideoFullscreen);
      videoRef.current.addEventListener('mozfullscreenchange', handleVideoFullscreen);
      videoRef.current.addEventListener('fullscreenchange', handleVideoFullscreen);
      videoRef.current.addEventListener('keydown', preventFullscreenKey);
    }
    
    return () => {
      document.removeEventListener("keydown", preventScreenCapture);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      
      if (videoRef.current) {
        videoRef.current.removeEventListener('webkitbeginfullscreen', handleVideoFullscreen);
        videoRef.current.removeEventListener('webkitendfullscreen', handleVideoFullscreen);
        videoRef.current.removeEventListener('mozfullscreenchange', handleVideoFullscreen);
        videoRef.current.removeEventListener('fullscreenchange', handleVideoFullscreen);
        videoRef.current.removeEventListener('keydown', preventFullscreenKey);
      }
    };
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
            Error al cargar la clase
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
        <div id="video-container" className="aspect-video w-full max-w-5xl mx-auto bg-black rounded-xl overflow-hidden shadow-lg relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                <p className="text-white mt-4">Cargando clase...</p>
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
                Tu navegador no soporta la reproducción de clases HLS.
              </video>
            )}

            {/* Marca de agua */}
            <div className="absolute bottom-4 right-4 pointer-events-none z-20">
              <span className="text-white text-lg font-medium opacity-30 drop-shadow-lg">
                {userName}
              </span>
            </div>

            {/* Botón de fullscreen personalizado */}
            <button
              onClick={() => {
                const videoContainer = document.getElementById('video-container');
                if (videoContainer) {
                  if (!document.fullscreenElement) {
                    videoContainer.requestFullscreen().catch(err => {
                      console.error('Error al entrar en fullscreen:', err);
                    });
                  } else {
                    document.exitFullscreen().catch(err => {
                      console.error('Error al salir de fullscreen:', err);
                    });
                  }
                }
              }}
              className="absolute top-4 right-4 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-md transition-all duration-200 z-30"
              title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            >
              {isFullscreen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>

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

              /* Ocultar botón de fullscreen nativo */
              video::-webkit-media-controls-fullscreen-button {
                display: none !important;
              }

              video::-moz-media-controls-fullscreen-button {
                display: none !important;
              }

              video::-ms-media-controls-fullscreen-button {
                display: none !important;
              }

              video::-webkit-media-controls-enclosure {
                overflow: hidden;
              }

              video::-webkit-media-controls-panel {
                width: calc(100% + 30px);
              }

              /* Estilos para fullscreen */
              #video-container:fullscreen {
                background: black;
                display: flex;
                align-items: center;
                justify-content: center;
              }

              #video-container:fullscreen video {
                width: 100%;
                height: 100%;
                object-fit: contain;
              }

              #video-container:fullscreen .absolute {
                position: absolute;
              }

              /* Soporte para webkit (Safari) */
              #video-container:-webkit-full-screen {
                background: black;
                display: flex;
                align-items: center;
                justify-content: center;
              }

              #video-container:-webkit-full-screen video {
                width: 100%;
                height: 100%;
                object-fit: contain;
              }

              #video-container:-webkit-full-screen .absolute {
                position: absolute;
              }

              /* Soporte para Mozilla */
              #video-container:-moz-full-screen {
                background: black;
                display: flex;
                align-items: center;
                justify-content: center;
              }

              #video-container:-moz-full-screen video {
                width: 100%;
                height: 100%;
                object-fit: contain;
              }

              #video-container:-moz-full-screen .absolute {
                position: absolute;
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
