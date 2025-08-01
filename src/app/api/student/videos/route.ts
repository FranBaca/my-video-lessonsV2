import { NextRequest, NextResponse } from "next/server";
import { videoService, subjectService } from "@/app/lib/firebase-services";
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

    // Obtener información del estudiante usando la nueva función
    const student = await findStudentByCode(studentCode);
    
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

    // Obtener las materias permitidas del estudiante
    const allowedSubjects = student.allowedSubjects || [];
    
    if (allowedSubjects.length === 0) {
      return NextResponse.json(
        {
          success: true,
          subjects: [],
          message: "No tienes materias asignadas. Contacta a tu profesor.",
        }
      );
    }



    // Obtener videos de todas las materias permitidas
    const allVideos = [];
    const subjectsMap = new Map();

    for (const subjectId of allowedSubjects) {
      try {
        // Extraer el professorId del id del estudiante
        const pathParts = student.id?.split('/') || [];
        const professorId = pathParts[0]; // El primer elemento es el professorId
        
        console.log(`🔍 Buscando videos para materia ${subjectId} en profesor ${professorId}`);
        
        // Obtener información de la materia desde el profesor específico
        const subject = await subjectService.getById(professorId, subjectId);
        const subjectName = subject?.name || subjectId;
        
        console.log(`📚 Materia encontrada:`, { id: subjectId, name: subjectName });
        
        // Obtener videos de esta materia específica usando el método directo
        const videos = await videoService.getBySubject(professorId, subjectId);
        
        console.log(`🎥 Videos encontrados para materia ${subjectId}:`, videos.length);
        

        
        // Incluir la materia incluso si no tiene videos para mostrar en el sidebar
        const subjectVideos = {
          id: subjectId,
          name: subjectName,
          sections: [
            {
              id: `${subjectId}-section`,
              name: "Clases",
              videos: videos.map(video => ({
                id: video.id!,
                name: video.name,
                description: video.description,
                muxPlaybackId: video.muxPlaybackId,
                playbackId: video.muxPlaybackId, // Mantener compatibilidad
                thumbnailUrl: video.thumbnailUrl,
                duration: video.duration,
                status: video.status,
                createdAt: video.createdAt?.toDate?.() || video.createdAt,
                updatedAt: video.updatedAt?.toDate?.() || video.updatedAt
              }))
            }
          ]
        };
        
        subjectsMap.set(subjectId, subjectVideos);
        allVideos.push(...videos);
      } catch (error) {
        console.error(`Error obteniendo videos para materia ${subjectId}:`, error);
      }
    }

    // Convertir el Map a array para la respuesta
    const subjects = Array.from(subjectsMap.values());



    return NextResponse.json({
      success: true,
      subjects,
      message: `Se encontraron ${subjects.length} materias con ${allVideos.length} videos disponibles`
    });

  } catch (error) {
    console.error("Error en /api/student/videos:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}

 