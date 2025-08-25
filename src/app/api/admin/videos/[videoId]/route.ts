import { NextResponse } from "next/server";
import { createAuthMiddleware, AuthenticatedRequest } from "@/app/lib/auth-utils";
import { MuxUploadService } from "@/app/lib/mux-upload-service";
import { videoServiceAdmin } from "@/app/lib/firebase-services";

const uploadService = new MuxUploadService();

// Función principal del endpoint
async function handleDeleteVideo(request: AuthenticatedRequest, context: { params: { videoId: string } }) {
  try {
    if (!context?.params?.videoId) {
      return NextResponse.json(
        {
          success: false,
          message: "ID de video no proporcionado"
        },
        { status: 400 }
      );
    }
    
    const { videoId } = context.params;
    const professorId = request.professorId!;
    
    // Validar que el video existe y pertenece al profesor
    const videos = await videoServiceAdmin.getByProfessor(professorId);
    const existingVideo = videos.find(v => v.id === videoId);

    if (!existingVideo) {
      return NextResponse.json(
        {
          success: false,
          message: "Video no encontrado"
        },
        { status: 404 }
      );
    }
    
    // Verificar que el video no esté procesando
    if (existingVideo.status === 'processing') {
      return NextResponse.json(
        {
          success: false,
          message: "No se puede eliminar un video que está siendo procesado"
        },
        { status: 400 }
      );
    }
    
    // Eliminar video de Firestore
    await videoServiceAdmin.delete(professorId, existingVideo.subjectId, videoId);
    
    // Opcionalmente eliminar de Mux (si tiene muxAssetId)
    if (existingVideo.muxAssetId) {
      try {
        await uploadService.deleteAsset(existingVideo.muxAssetId);
      } catch (error) {
        // No throw error here - we want to continue even if Mux deletion fails
        console.error("❌ Error deleting Mux asset:", error);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: "Video eliminado exitosamente"
    });
    
  } catch (error: any) {
    console.error("❌ Error deleting video:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error al eliminar el video",
        error: error.message
      },
      { status: 500 }
    );
  }
}

// Exportar el endpoint con middleware de autenticación
export const DELETE = createAuthMiddleware(handleDeleteVideo);