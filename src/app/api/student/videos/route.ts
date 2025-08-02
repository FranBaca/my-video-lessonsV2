import { NextRequest, NextResponse } from "next/server";
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

// Función para obtener materia usando Admin SDK
async function getSubjectById(professorId: string, subjectId: string) {
  try {
    const subjectDoc = await adminDb.collection('professors').doc(professorId).collection('subjects').doc(subjectId).get();
    if (subjectDoc.exists) {
      return {
        id: subjectDoc.id,
        ...subjectDoc.data(),
        createdAt: subjectDoc.data().createdAt?.toDate() || new Date(),
        updatedAt: subjectDoc.data().updatedAt?.toDate()
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Función para obtener videos de una materia usando Admin SDK
async function getVideosBySubject(professorId: string, subjectId: string) {
  try {
    const videosQuery = adminDb.collection('professors').doc(professorId).collection('subjects').doc(subjectId).collection('videos').where('isActive', '==', true);
    const videosSnapshot = await videosQuery.get();
    
    return videosSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));
  } catch (error) {
    return [];
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
        
        // Obtener información de la materia usando Admin SDK
        const subject = await getSubjectById(professorId, subjectId);
        const subjectName = subject?.name || subjectId;
        
        // Obtener videos de esta materia específica usando Admin SDK
        const videos = await getVideosBySubject(professorId, subjectId);
        
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
                createdAt: video.createdAt,
                updatedAt: video.updatedAt
              }))
            }
          ]
        };
        
        subjectsMap.set(subjectId, subjectVideos);
        allVideos.push(...videos);
      } catch (error) {
        // Error handling silently for production
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
    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}

 