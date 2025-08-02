import { NextRequest, NextResponse } from "next/server";
import { MuxUploadService } from "@/app/lib/mux-upload-service";
import { adminDb } from "@/app/lib/firebase-admin";
import { Student } from "@/app/types/firebase";

const uploadService = new MuxUploadService();

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

    const videoId = params.id;

    if (!videoId) {
      return NextResponse.json(
        { success: false, message: "Video ID es requerido" },
        { status: 400 }
      );
    }

    // Buscar el video en las materias permitidas del estudiante
    const allowedSubjects = student.allowedSubjects || [];
    let video = null;
    let foundSubject = null;

    // Extraer el professorId del id del estudiante
    const pathParts = student.id?.split('/') || [];
    const professorId = pathParts[0]; // El primer elemento es el professorId

    for (const subjectId of allowedSubjects) {
      try {
        const videos = await getVideosBySubject(professorId, subjectId);
        const foundVideo = videos.find(v => v.id === videoId);
        
        if (foundVideo) {
          video = foundVideo;
          foundSubject = await getSubjectById(professorId, subjectId);
          break;
        }
      } catch (error) {
        // Error handling silently for production
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
          // Asset está listo, actualizar video usando Admin SDK
          const docRef = adminDb.collection('professors').doc(video.professorId).collection('subjects').doc(video.subjectId).collection('videos').doc(video.id);
          await docRef.update({
            status: 'ready',
            muxPlaybackId: assetInfo.playback_ids?.[0]?.id || '',
            duration: assetInfo.duration,
            aspectRatio: assetInfo.aspect_ratio,
            isActive: true,
            updatedAt: new Date()
          });
          
          // Actualizar el objeto video local
          video.status = 'ready';
          video.muxPlaybackId = assetInfo.playback_ids?.[0]?.id || '';
          video.duration = assetInfo.duration;
          video.aspectRatio = assetInfo.aspect_ratio;
          video.isActive = true;
          
        } else if (assetInfo.status === 'errored') {
          // Asset falló, marcar como error usando Admin SDK
          const docRef = adminDb.collection('professors').doc(video.professorId).collection('subjects').doc(video.subjectId).collection('videos').doc(video.id);
          await docRef.update({
            status: 'errored',
            errorMessage: assetInfo.errors?.message || 'Error desconocido',
            isActive: false,
            updatedAt: new Date()
          });
          
          // Actualizar el objeto video local
          video.status = 'errored';
          video.errorMessage = assetInfo.errors?.message || 'Error desconocido';
          video.isActive = false;
        } else {
          // Asset aún procesándose
        }
        
      } catch (error) {
        console.error('❌ Error verificando asset en Mux:', error);
        // Error handling silently for production
        // No actualizar el video si hay error en la verificación
      }
    }

    // Verificar si el video tiene los datos necesarios para reproducirse
    const hasPlaybackId = video.muxPlaybackId && video.muxPlaybackId.length > 0;
    const isReady = video.status === 'ready';
    const isActive = video.isActive === true;

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
        errorMessage: video.errorMessage,
        // Agregar información de debug
        debug: {
          hasPlaybackId,
          isReady,
          isActive
        }
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