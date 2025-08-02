import { NextRequest, NextResponse } from "next/server";
import { verifyProfessorAuth } from "@/app/lib/auth-utils";
import { videoService } from "@/app/lib/firebase-services";
import { adminDb } from "@/app/lib/firebase-admin";
import { Student } from "@/app/types/firebase";

// Función para buscar estudiantes (copiada del verify route)
async function findStudentByCode(code: string): Promise<Student | null> {
  try {
    // Obtener todos los profesores
    const professorsSnapshot = await adminDb.collection('professors').get();
    
    // Buscar en cada profesor
    for (const professorDoc of professorsSnapshot.docs) {
      const professorId = professorDoc.id;
      
      try {
        // Buscar estudiantes en este profesor
        const studentsQuery = adminDb.collection('professors').doc(professorId).collection('students').where('code', '==', code);
        
        const studentsSnapshot = await studentsQuery.get();
        
        if (!studentsSnapshot.empty) {
          const studentDoc = studentsSnapshot.docs[0];
          
          const studentData = {
            id: `${professorId}/${studentDoc.id}`,
            ...studentDoc.data(),
            enrolledAt: studentDoc.data().enrolledAt?.toDate() || new Date(),
            lastAccess: studentDoc.data().lastAccess?.toDate()
          } as Student;
          
          return studentData;
        }
      } catch (error) {
        continue; // Try next professor
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Obtener el código de estudiante de las cookies si existe
    const studentCode = request.cookies.get("student_code")?.value;
    let allowedSubjects: string[] = [];

    // Si hay un código de estudiante, obtener sus materias permitidas
    if (studentCode) {
      try {
        const student = await findStudentByCode(studentCode);
        if (student && student.allowedSubjects) {
          allowedSubjects = student.allowedSubjects;
        }
      } catch (error) {
        // Error handling silently for production
      }
    }

    // Verificar autenticación del profesor
    const professorId = await verifyProfessorAuth(request);



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