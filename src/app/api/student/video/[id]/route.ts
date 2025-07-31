import { NextRequest, NextResponse } from "next/server";
import { publicStudentService, videoService, subjectService } from "@/app/lib/firebase-services";
import { MuxUploadService } from "@/app/lib/mux-upload-service";

const uploadService = new MuxUploadService();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Obtener el código de estudiante de las cookies
    const studentCode = request.cookies.get("student_code")?.value;
    
    if (!studentCode) {
      return NextResponse.json(
        {
          success: false,
          message: "No se encontró código de estudiante en la sesión",
        },
        { status: 401 }
      );
    }

    // Obtener información del estudiante
    const student = await publicStudentService.getByCode(studentCode);
    
    if (!student) {
      return NextResponse.json(
        {
          success: false,
          message: "Estudiante no encontrado",
        },
        { status: 404 }
      );
    }

    if (!student.authorized) {
      return NextResponse.json(
        {
          success: false,
          message: "Tu cuenta no está autorizada. Contacta a tu profesor.",
        },
        { status: 403 }
      );
    }

    const videoId = params.id;

    if (!videoId) {
      return NextResponse.json(
        { success: false, message: "Video ID es requerido" },
        { status: 400 }
      );
    }

    console.log(`🔍 Estudiante ${student.name} solicitando video ${videoId}`);

    // Buscar el video en las materias permitidas del estudiante
    const allowedSubjects = student.allowedSubjects || [];
    let video = null;
    let foundSubject = null;

    // Profesor del estudiante (hardcoded por ahora)
    const professorId = 'gaTy3CzW2AdQ8yGP74kUty1cc3K2';

    for (const subjectId of allowedSubjects) {
      try {
        const videos = await videoService.getBySubject(professorId, subjectId);
        const foundVideo = videos.find(v => v.id === videoId);
        
        if (foundVideo) {
          video = foundVideo;
          foundSubject = await subjectService.getById(professorId, subjectId);
          break;
        }
      } catch (error) {
        console.error(`Error buscando video en materia ${subjectId}:`, error);
      }
    }

    if (!video) {
      return NextResponse.json(
        { success: false, message: "Video no encontrado o no tienes acceso" },
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
        console.error(`❌ Error verificando asset ${video.muxAssetId}:`, error);
        // No actualizar el video si hay error en la verificación
      }
    }

    const responseData = {
      success: true,
      data: {
        id: video.id,
        name: video.name,
        description: video.description,
        subjectId: video.subjectId,
        subjectName: foundSubject?.name || 'Materia desconocida',
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
    };
    
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('❌ Error obteniendo estado del video para estudiante:', error);
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