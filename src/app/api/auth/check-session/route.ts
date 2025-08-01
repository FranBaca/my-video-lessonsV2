import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/app/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Student } from "@/app/types/firebase";

// Función para buscar estudiantes en Firebase
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
    // Obtener las cookies
    const cookieStore = cookies();
    const studentCode = cookieStore.get("student_code")?.value;
    const allowedSubjectsCookie = cookieStore.get("allowed_subjects")?.value;

    console.log("🔍 Verificando sesión de estudiante:", {
      hasStudentCode: !!studentCode,
      hasAllowedSubjects: !!allowedSubjectsCookie
    });

    if (!studentCode) {
      return NextResponse.json({
        success: false,
        message: "No hay sesión activa",
        authenticated: false
      });
    }

    // Buscar el estudiante en Firebase
    const student = await findStudentByCode(studentCode);
    
    if (!student) {
      // Limpiar cookies si el estudiante no existe
      const response = NextResponse.json({
        success: false,
        message: "Estudiante no encontrado",
        authenticated: false
      });
      
      response.cookies.set("student_code", "", { maxAge: 0, path: "/" });
      response.cookies.set("allowed_subjects", "", { maxAge: 0, path: "/" });
      
      return response;
    }

    if (!student.authorized) {
      return NextResponse.json({
        success: false,
        message: "Estudiante no autorizado",
        authenticated: false
      });
    }

    // Parsear las materias permitidas
    let allowedSubjects: string[] = [];
    if (allowedSubjectsCookie) {
      try {
        allowedSubjects = JSON.parse(allowedSubjectsCookie);
      } catch (error) {
        console.error("Error parsing allowed subjects:", error);
        allowedSubjects = student.allowedSubjects || [];
      }
    } else {
      allowedSubjects = student.allowedSubjects || [];
    }

    console.log("✅ Sesión válida:", {
      name: student.name,
      code: student.code,
      allowedSubjects: allowedSubjects.length
    });

    return NextResponse.json({
      success: true,
      authenticated: true,
      student: {
        name: student.name,
        allowedSubjects: allowedSubjects
      }
    });

  } catch (error: any) {
    console.error("❌ Error verificando sesión:", error);
    return NextResponse.json({
      success: false,
      message: "Error interno del servidor",
      authenticated: false
    }, { status: 500 });
  }
} 