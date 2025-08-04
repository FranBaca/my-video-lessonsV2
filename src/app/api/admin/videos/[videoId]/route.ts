import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/app/lib/firebase-admin";
import { Video } from "@/app/types/firebase";
import { createAuthMiddleware, AuthenticatedRequest } from "@/app/lib/auth-utils";
import { MuxUploadService } from "@/app/lib/mux-upload-service";

const uploadService = new MuxUploadService();

// Función para buscar video por ID en todas las materias del profesor
async function findVideoByIdInProfessor(videoId: string, professorId: string): Promise<Video | null> {
  try {
    // Obtener todas las materias del profesor
    const subjectsSnapshot = await adminDb.collection('professors').doc(professorId).collection('subjects').get();
    
    // Buscar en cada materia
    for (const subjectDoc of subjectsSnapshot.docs) {
      const subjectId = subjectDoc.id;
      
      try {
        // Buscar video en esta materia
        const videoDoc = await adminDb.collection('professors').doc(professorId).collection('subjects').doc(subjectId).collection('videos').doc(videoId).get();
        
        if (videoDoc.exists) {
          const videoData = {
            id: videoDoc.id,
            ...videoDoc.data(),
            createdAt: videoDoc.data().createdAt?.toDate() || new Date(),
            updatedAt: videoDoc.data().updatedAt?.toDate()
          } as Video;
          
          return videoData;
        }
      } catch (error) {
        continue; // Try next subject
      }
    }
    
    return null;
  } catch (error) {
    console.error("❌ Error finding video by ID:", error);
    return null;
  }
}

// Función para eliminar video de Firestore
async function deleteVideoFromFirestore(videoId: string, professorId: string, subjectId: string): Promise<void> {
  try {
    await adminDb.collection('professors').doc(professorId).collection('subjects').doc(subjectId).collection('videos').doc(videoId).delete();
  } catch (error) {
    console.error("❌ Error deleting video from Firestore:", error);
    throw error;
  }
}

// Función para eliminar asset de Mux (opcional)
async function deleteMuxAsset(muxAssetId: string): Promise<void> {
  try {
    if (muxAssetId) {
      await uploadService.deleteAsset(muxAssetId);
    }
  } catch (error) {
    console.error("❌ Error deleting Mux asset:", error);
    // No throw error here - we want to continue even if Mux deletion fails
  }
}

// Función principal del endpoint
async function handleDeleteVideo(request: AuthenticatedRequest, context: { params: { videoId: string } }) {
  try {
    console.log("🔍 Context received:", context);
    console.log("🔍 Params received:", context?.params);
    
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
    const existingVideo = await findVideoByIdInProfessor(videoId, professorId);
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
    await deleteVideoFromFirestore(videoId, professorId, existingVideo.subjectId);
    
    // Opcionalmente eliminar de Mux (si tiene muxAssetId)
    if (existingVideo.muxAssetId) {
      await deleteMuxAsset(existingVideo.muxAssetId);
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