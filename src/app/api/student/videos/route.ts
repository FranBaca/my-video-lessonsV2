import { NextRequest, NextResponse } from "next/server";
import { publicStudentService, videoService, subjectService } from "@/app/lib/firebase-services";

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
        // Obtener información de la materia desde el profesor específico
        const professorId = 'gaTy3CzW2AdQ8yGP74kUty1cc3K2'; // Profesor del estudiante
        const subject = await subjectService.getById(professorId, subjectId);
        const subjectName = subject?.name || subjectId;
        
        // Obtener videos de esta materia específica usando el método directo
        const videos = await videoService.getBySubject(professorId, subjectId);
        

        
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

 