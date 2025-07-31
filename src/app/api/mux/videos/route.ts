import { NextRequest, NextResponse } from "next/server";
import { verifyProfessorAuth } from "@/app/lib/auth-utils";
import { videoService, publicStudentService } from "@/app/lib/firebase-services";

export async function GET(request: NextRequest) {
  try {
    // Obtener el código de estudiante de las cookies si existe
    const studentCode = request.cookies.get("student_code")?.value;
    let allowedSubjects: string[] = [];

    // Si hay un código de estudiante, obtener sus materias permitidas
    if (studentCode) {
      try {
        const student = await publicStudentService.getByCode(studentCode);
        if (student && student.allowedSubjects) {
          allowedSubjects = student.allowedSubjects;
        }
      } catch (error) {
        console.error("Error getting student allowed subjects:", error);
      }
    }

    // Verificar autenticación del profesor
    const professorId = await verifyProfessorAuth(request);

    console.log(`📋 Obteniendo videos del profesor ${professorId}`);

    // Obtener todos los videos del profesor con información de materias
    const videosWithSubjects = await videoService.getByProfessorWithSubjects(professorId);

    // Agrupar videos por estado para estadísticas
    const stats = {
      total: videosWithSubjects.length,
      ready: videosWithSubjects.filter(v => v.status === 'ready').length,
      processing: videosWithSubjects.filter(v => v.status === 'processing').length,
      errored: videosWithSubjects.filter(v => v.status === 'errored').length,
      upload_failed: videosWithSubjects.filter(v => v.status === 'upload_failed').length,
      no_confirm: videosWithSubjects.filter(v => v.status === 'no_confirm').length,
    };

    // Formatear respuesta
    const videos = videosWithSubjects.map(video => ({
      id: video.id,
      name: video.name,
      description: video.description,
      subjectId: video.subjectId,
      subjectName: video.subject.name,
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
    }));

    return NextResponse.json({
      success: true,
      data: {
        videos,
        stats
      },
      message: `Se encontraron ${videosWithSubjects.length} videos`
    });

  } catch (error) {
    console.error('❌ Error obteniendo videos:', error);
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