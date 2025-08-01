import { NextRequest, NextResponse } from "next/server";
import { verifyProfessorAuth } from "@/app/lib/auth-utils";
import { videoService } from "@/app/lib/firebase-services";
import { db } from "@/app/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Student } from "@/app/types/firebase";

// Función para buscar estudiantes (copiada del verify route)
async function findStudentByCode(code: string): Promise<Student | null> {
  try {
    console.log('🔍 Buscando estudiante con código:', code);
    
    // Obtener todos los profesores
    const professorsSnapshot = await getDocs(collection(db, 'professors'));
    console.log('📋 Profesores encontrados:', professorsSnapshot.size);
    
    // Buscar en cada profesor
    for (const professorDoc of professorsSnapshot.docs) {
      const professorId = professorDoc.id;
      console.log(`🔍 Buscando en profesor: ${professorId}`);
      
      try {
        // Buscar estudiantes en este profesor
        const studentsQuery = query(
          collection(db, 'professors', professorId, 'students'),
          where('code', '==', code)
        );
        
        const studentsSnapshot = await getDocs(studentsQuery);
        
        if (!studentsSnapshot.empty) {
          const studentDoc = studentsSnapshot.docs[0];
          console.log('✅ Estudiante encontrado en profesor:', professorId);
          
          const studentData = {
            id: `${professorId}/${studentDoc.id}`,
            ...studentDoc.data(),
            enrolledAt: studentDoc.data().enrolledAt?.toDate() || new Date(),
            lastAccess: studentDoc.data().lastAccess?.toDate()
          } as Student;
          
          console.log('✅ Datos del estudiante:', {
            id: studentData.id,
            name: studentData.name,
            code: studentData.code,
            authorized: studentData.authorized,
            deviceId: studentData.deviceId,
            allowedSubjects: studentData.allowedSubjects?.length || 0
          });
          
          return studentData;
        }
      } catch (error) {
        console.log(`⚠️ Error buscando en profesor ${professorId}:`, error);
        continue; // Try next professor
      }
    }
    
    console.log('❌ No se encontró estudiante con código:', code);
    return null;
  } catch (error) {
    console.error('❌ Error en findStudentByCode:', error);
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