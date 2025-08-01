import { NextRequest, NextResponse } from "next/server";
import { verifyProfessorAuth } from "@/app/lib/auth-utils";
import { videoService } from "@/app/lib/firebase-services";
import { MuxUploadService } from "@/app/lib/mux-upload-service";

const uploadService = new MuxUploadService();

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación del profesor
    const professorId = await verifyProfessorAuth(request);

    const { videoId, assetId } = await request.json();

    if (!videoId || !assetId) {
      return NextResponse.json(
        { success: false, message: "Video ID y Asset ID son requeridos" },
        { status: 400 }
      );
    }

    // Buscar el video en Firebase
    const videoResult = await videoService.findByMuxAssetId(assetId);
    
    if (!videoResult) {
      return NextResponse.json(
        { success: false, message: "Video no encontrado" },
        { status: 404 }
      );
    }

    const { video, professorId: videoProfessorId, subjectId, videoId: foundVideoId } = videoResult;

    // Verificar que el profesor tiene permisos para este video
    if (videoProfessorId !== professorId) {
      return NextResponse.json(
        { success: false, message: "No tienes permisos para este video" },
        { status: 403 }
      );
    }

    // Verificar el estado del asset en Mux
    console.log(`Verificando estado del asset ${assetId}...`);
    const assetInfo = await uploadService.getAssetInfo(assetId);
    
    console.log(`Asset ${assetId} - Estado: ${assetInfo.status}`);

    // Si el asset está listo y el video no lo está, actualizar
    if (assetInfo.status === 'ready' && video.status !== 'ready') {
      console.log(`Actualizando video ${foundVideoId} como listo`);
      
      const playbackId = assetInfo.playback_ids?.[0]?.id;
      
      if (!playbackId) {
        return NextResponse.json(
          { success: false, message: "Asset listo pero sin playback ID" },
          { status: 500 }
        );
      }

      // Actualizar el video en Firebase
      await videoService.update(videoProfessorId, subjectId, foundVideoId, {
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
          id: foundVideoId,
          status: 'ready',
          playbackId: playbackId,
          duration: assetInfo.duration,
          aspectRatio: assetInfo.aspect_ratio,
        }
      });

    } else if (assetInfo.status === 'errored') {
      console.log(`Marcando video ${foundVideoId} como fallido`);
      
      // Marcar el video como fallido
      await videoService.update(videoProfessorId, subjectId, foundVideoId, {
        status: 'errored',
        isActive: false,
        errorMessage: assetInfo.errors?.message || 'Error desconocido en el procesamiento',
        updatedAt: new Date()
      });

      return NextResponse.json({
        success: false,
        message: "Video falló en el procesamiento",
        data: {
          id: foundVideoId,
          status: 'errored',
          error: assetInfo.errors?.message || 'Error desconocido'
        }
      });

    } else {
      // El asset aún se está procesando
      return NextResponse.json({
        success: true,
        message: "Video aún se está procesando",
        data: {
          id: foundVideoId,
          status: assetInfo.status,
          currentStatus: video.status
        }
      });
    }

  } catch (error) {
    console.error("Error verificando video:", error);
    
    if (error instanceof Error) {
      if (error.message.includes('Asset not found')) {
        return NextResponse.json(
          { success: false, message: "Asset no encontrado en Mux" },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
} 