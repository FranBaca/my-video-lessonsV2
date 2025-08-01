import { NextRequest, NextResponse } from "next/server";
import { verifyProfessorAuth } from "@/app/lib/auth-utils";
import { videoService } from "@/app/lib/firebase-services";
import { MuxUploadService } from "@/app/lib/mux-upload-service";

const uploadService = new MuxUploadService();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación del profesor
    const professorId = await verifyProfessorAuth(request);
    const videoId = params.id;

    if (!videoId) {
      return NextResponse.json(
        { success: false, message: "Video ID es requerido" },
        { status: 400 }
      );
    }



    // Buscar el video en todas las materias del profesor
    const subjects = await videoService.getByProfessor(professorId);
    const video = subjects.find(v => v.id === videoId);

    if (!video) {
      return NextResponse.json(
        { success: false, message: "Video no encontrado" },
        { status: 404 }
      );
    }

    // Si el video está procesando, verificar estado en Mux
    if (video.status === 'processing' && video.muxAssetId) {
      try {
        const assetInfo = await uploadService.getAssetInfo(video.muxAssetId);
        
        if (assetInfo.status === 'ready') {
          // Asset está listo, actualizar video
          await videoService.update(
            video.professorId, 
            video.subjectId, 
            video.id!, 
            {
              status: 'ready',
              muxPlaybackId: assetInfo.playback_ids?.[0]?.id || '',
              duration: assetInfo.duration,
              aspectRatio: assetInfo.aspect_ratio,
              isActive: true,
              updatedAt: new Date()
            }
          );
          
          // Actualizar el objeto video local
          video.status = 'ready';
          video.muxPlaybackId = assetInfo.playback_ids?.[0]?.id || '';
          video.duration = assetInfo.duration;
          video.aspectRatio = assetInfo.aspect_ratio;
          video.isActive = true;
          
        } else if (assetInfo.status === 'errored') {
          // Asset falló, marcar como error
          await videoService.update(
            video.professorId, 
            video.subjectId, 
            video.id!, 
            {
              status: 'errored',
              errorMessage: assetInfo.errors?.message || 'Error desconocido',
              isActive: false,
              updatedAt: new Date()
            }
          );
          
          // Actualizar el objeto video local
          video.status = 'errored';
          video.errorMessage = assetInfo.errors?.message || 'Error desconocido';
          video.isActive = false;
        }
        
      } catch (error) {
        // Error handling silently for production
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: video.id,
        name: video.name,
        description: video.description,
        subjectId: video.subjectId,
        status: video.status,
        muxAssetId: video.muxAssetId,
        muxPlaybackId: video.muxPlaybackId,
        uploadConfirmed: video.uploadConfirmed,
        duration: video.duration,
        aspectRatio: video.aspectRatio,
        isActive: video.isActive,
        tags: video.tags,
        createdAt: video.createdAt,
        updatedAt: video.updatedAt,
        errorMessage: video.errorMessage
      }
    });

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: "Error interno del servidor",
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 