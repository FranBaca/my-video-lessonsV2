import { NextRequest, NextResponse } from "next/server";
import { verifyProfessorAuth } from "@/app/lib/auth-utils";
import { MuxUploadService } from "@/app/lib/mux-upload-service";
import { videoService } from "@/app/lib/firebase-services";

const uploadService = new MuxUploadService();

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación del profesor
    const professorId = await verifyProfessorAuth(request);

    // Obtener todos los videos del profesor
    const videos = await videoService.getByProfessor(professorId);
    
    // Agrupar por estado
    const videoStats = {
      total: videos.length,
      ready: videos.filter(v => v.status === 'ready').length,
      processing: videos.filter(v => v.status === 'processing').length,
      errored: videos.filter(v => v.status === 'errored').length,
      withAssetId: videos.filter(v => v.muxAssetId).length,
      withoutAssetId: videos.filter(v => !v.muxAssetId).length,
    };

    return NextResponse.json({
      success: true,
      stats: videoStats,
      videos: videos.map(v => ({
        id: v.id,
        name: v.name,
        assetId: v.muxAssetId,
        status: v.status,
        createdAt: v.createdAt,
        subjectId: v.subjectId
      }))
    });

  } catch (error) {
    console.error('Error getting video stats:', error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verificar autenticación del profesor
    const professorId = await verifyProfessorAuth(request);
    
    const { videoId, subjectId, assetId } = await request.json();

    if (!videoId || !subjectId) {
      return NextResponse.json(
        { success: false, message: "Video ID y Subject ID son requeridos" },
        { status: 400 }
      );
    }

    // Verificar que el video pertenece al profesor
    const video = await videoService.getById(professorId, subjectId, videoId);
    if (!video) {
      return NextResponse.json(
        { success: false, message: "Video no encontrado" },
        { status: 404 }
      );
    }

    // Si se proporciona assetId, intentar eliminar el asset de Mux
    if (assetId) {
      try {
        // Nota: La eliminación de assets requiere permisos específicos en Mux
        // TODO: Implementar eliminación de asset en Mux si es necesario
      } catch (error) {
        // Error handling silently for production
      }
    }

    // Eliminar el video de la base de datos
    await videoService.delete(professorId, subjectId, videoId);

    return NextResponse.json({
      success: true,
      message: "Video eliminado exitosamente"
    });

  } catch (error) {
    console.error('Error deleting video:', error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
} 