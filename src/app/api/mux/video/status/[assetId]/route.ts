import { NextRequest, NextResponse } from "next/server";
import { videoService } from "@/app/lib/firebase-services";
import { MuxUploadService } from "@/app/lib/mux-upload-service";

const uploadService = new MuxUploadService();

export async function GET(
  request: NextRequest,
  { params }: { params: { assetId: string } }
) {
  try {
    const { assetId } = params;

    if (!assetId) {
      return NextResponse.json(
        { success: false, message: "Asset ID es requerido" },
        { status: 400 }
      );
    }

    console.log('Verificando estado del asset:', assetId);

    // Buscar el video en la base de datos
    const videoResult = await videoService.findByAssetId(assetId);
    
    if (!videoResult) {
      console.log('Video no encontrado en la base de datos para assetId:', assetId);
      return NextResponse.json(
        { success: false, message: "Video no encontrado en la base de datos" },
        { status: 404 }
      );
    }

    const { video } = videoResult;
    console.log('Video encontrado:', {
      id: video.id,
      name: video.name,
      status: video.status,
      assetId: video.assetId
    });

    // Si el video ya está listo, devolver su información
    if (video.status === 'ready') {
      return NextResponse.json({
        success: true,
        status: 'ready',
        video: {
          id: video.id,
          name: video.name,
          description: video.description,
          playbackId: video.playbackId,
          assetId: video.assetId,
          duration: video.duration,
          aspectRatio: video.aspectRatio,
          createdAt: video.createdAt,
        }
      });
    }

    // Si el video está en error, devolver el error
    if (video.status === 'errored') {
      return NextResponse.json({
        success: false,
        status: 'errored',
        message: video.errorMessage || 'Error en el procesamiento del video'
      });
    }

    // Si el video está procesándose, verificar el estado actual del asset en Mux
    try {
      console.log('Verificando estado del asset en Mux...');
      const assetInfo = await uploadService.getAssetInfo(assetId);
      console.log('Estado del asset en Mux:', assetInfo.status);
      
      if (assetInfo.status === 'ready') {
        // Actualizar el video en la base de datos
        await videoService.update(videoResult.professorId, videoResult.subjectId, video.id, {
          playbackId: assetInfo.playback_ids?.[0]?.id,
          duration: assetInfo.duration,
          aspectRatio: assetInfo.aspect_ratio,
          status: 'ready'
        });

        return NextResponse.json({
          success: true,
          status: 'ready',
          video: {
            id: video.id,
            name: video.name,
            description: video.description,
            playbackId: assetInfo.playback_ids?.[0]?.id,
            assetId: assetId,
            duration: assetInfo.duration,
            aspectRatio: assetInfo.aspect_ratio,
            createdAt: video.createdAt,
          }
        });
      } else if (assetInfo.status === 'errored') {
        // Actualizar el video como fallido
        await videoService.update(videoResult.professorId, videoResult.subjectId, video.id, {
          status: 'errored',
          errorMessage: 'Error en el procesamiento del video'
        });

        return NextResponse.json({
          success: false,
          status: 'errored',
          message: 'Error en el procesamiento del video'
        });
      } else {
        // Asset aún se está procesando
        return NextResponse.json({
          success: true,
          status: 'processing',
          message: 'El video aún se está procesando',
          assetStatus: assetInfo.status
        });
      }
    } catch (error) {
      console.error('Error checking asset status:', error);
      return NextResponse.json({
        success: true,
        status: 'processing',
        message: 'El video aún se está procesando (error al verificar Mux)'
      });
    }

  } catch (error) {
    console.error('Error checking video status:', error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor", error: error.message },
      { status: 500 }
    );
  }
} 