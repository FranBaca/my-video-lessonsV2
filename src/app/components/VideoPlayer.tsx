import { Video } from "@/app/types";

interface VideoPlayerProps {
  video: Video | null;
}

export default function VideoPlayer({ video }: VideoPlayerProps) {
  if (!video) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-4 md:p-8 mt-16 md:mt-0">
        <p className="text-gray-500 text-center">
          Selecciona una clase para comenzar
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8 mt-16 md:mt-0">
      <h1 className="text-xl md:text-2xl font-bold mb-4">{video.name}</h1>
      <div className="aspect-video w-full max-w-4xl mx-auto">
        <iframe
          src={video.link}
          className="w-full h-full rounded-lg shadow-lg"
          allow="autoplay"
          allowFullScreen
        />
      </div>
    </div>
  );
}
