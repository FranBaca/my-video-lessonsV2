import { NextRequest, NextResponse } from "next/server";
import { MuxUploadService } from "@/app/lib/mux-upload-service";
import { videoService } from "@/app/lib/firebase-services";

const uploadService = new MuxUploadService();

export async function POST(request: NextRequest) {
  try {
    const { assetId } = await request.json();

    if (!assetId) {
      return NextResponse.json(
        { success: false, message: "Asset ID es requerido" },
        { status: 400 }
      );
    }

    // Verificar estado en Mux
    const assetInfo = await uploadService.getAssetInfo(assetId);

    // Buscar video en Firebase
    const videoResult = await videoService.findByMuxAssetId(assetId);
    
    if (!videoResult) {
      return NextResponse.json(
        { success: false, message: "Video no encontrado en Firebase" },
        { status: 404 }
      );
    }

    const { video, professorId, subjectId, videoId } = videoResult;

    // Actualizar según el estado del asset
    if (assetInfo.status === 'ready') {
      const playbackId = assetInfo.playback_ids?.[0]?.id;
      
      if (!playbackId) {
        return NextResponse.json(
          { success: false, message: "Asset listo pero sin playback ID" },
          { status: 500 }
        );
      }

      // Actualizar el video como listo
      await videoService.update(professorId, subjectId, videoId, {
        muxPlaybackId: playbackId,
        status: 'ready',
        isActive: true,
        duration: assetInfo.duration,
        aspectRatio: assetInfo.aspect_ratio,
        updatedAt: new Date()
      });



      return NextResponse.json({
        success: true,
        message: "Video actualizado como listo",
        data: {
          id: videoId,
          status: 'ready',
          playbackId: playbackId,
          duration: assetInfo.duration,
          aspectRatio: assetInfo.aspect_ratio,
        }
      });

    } else if (assetInfo.status === 'errored') {
      // Marcar como error
      await videoService.update(professorId, subjectId, videoId, {
        status: 'errored',
        isActive: false,
        errorMessage: assetInfo.errors?.message || 'Error desconocido en el procesamiento',
        updatedAt: new Date()
      });



      return NextResponse.json({
        success: false,
        message: "Video marcado como error",
        data: {
          id: videoId,
          status: 'errored',
          error: assetInfo.errors?.message || 'Error desconocido'
        }
      });

    } else {
      // Aún procesándose
      return NextResponse.json({
        success: true,
        message: "Video aún se está procesando",
        data: {
          id: videoId,
          status: assetInfo.status,
          currentStatus: video.status
        }
      });
    }

  } catch (error) {
    console.error("Error forzando actualización:", error);
    
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
} 