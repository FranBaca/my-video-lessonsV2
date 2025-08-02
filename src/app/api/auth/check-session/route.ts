import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/app/lib/firebase-admin";
import { adminDb } from "@/app/lib/firebase-admin";
import { Student } from "@/app/types/firebase";

export const dynamic = 'force-dynamic';

// Helper function to find student by code
async function findStudentByCode(code: string): Promise<Student | null> {
  try {
    // Buscar en todas las colecciones de profesores
    const professorsSnapshot = await adminDb.collection('professors').get();
    
    for (const professorDoc of professorsSnapshot.docs) {
      const studentsSnapshot = await adminDb
        .collection('professors')
        .doc(professorDoc.id)
        .collection('students')
        .where('code', '==', code)
        .get();
      
      if (!studentsSnapshot.empty) {
        const studentDoc = studentsSnapshot.docs[0];
        return {
          id: `${professorDoc.id}/students/${studentDoc.id}`,
          ...studentDoc.data()
        } as Student;
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Obtener las cookies
    const cookieStore = cookies();
    
    // Check professor session first
    const professorToken = cookieStore.get("professor_token")?.value;
    const professorId = cookieStore.get("professor_id")?.value;

    if (professorToken && professorId) {
      try {
        // Verificar el token de Firebase
        const decodedToken = await adminAuth.verifyIdToken(professorToken);
        
        if (decodedToken.uid !== professorId) {
          throw new Error('Token no coincide con el ID del profesor');
        }

        // Verificar que el profesor existe en Firestore
        const professorDoc = await adminDb.collection('professors').doc(professorId).get();
        
        if (!professorDoc.exists) {
          // Limpiar cookies si el profesor no existe
          const response = NextResponse.json({
            success: false,
            message: "Profesor no encontrado",
            authenticated: false,
            type: 'none'
          });
          
          response.cookies.set("professor_token", "", { maxAge: 0, path: "/" });
          response.cookies.set("professor_id", "", { maxAge: 0, path: "/" });
          
          return response;
        }

        const professor = professorDoc.data();
        
        if (!professor?.isActive) {
          return NextResponse.json({
            success: false,
            message: "Cuenta de profesor desactivada",
            authenticated: false,
            type: 'none'
          });
        }

        return NextResponse.json({
          success: true,
          authenticated: true,
          type: 'professor',
          professor: {
            id: professorId,
            name: professor.name,
            email: professor.email,
            isActive: professor.isActive
          }
        });

      } catch (error) {
        console.error("❌ Error verificando token de profesor:", error);
        // Limpiar cookies inválidas
        const response = NextResponse.json({
          success: false,
          message: "Sesión de profesor inválida",
          authenticated: false,
          type: 'none'
        });
        
        response.cookies.set("professor_token", "", { maxAge: 0, path: "/" });
        response.cookies.set("professor_id", "", { maxAge: 0, path: "/" });
        
        return response;
      }
    }

    // Check student session if no professor session
    const studentCode = cookieStore.get("student_code")?.value;
    const allowedSubjectsCookie = cookieStore.get("allowed_subjects")?.value;

    if (studentCode) {
      // Buscar el estudiante en Firebase
      const student = await findStudentByCode(studentCode);
      
      if (!student) {
        // Limpiar cookies si el estudiante no existe
        const response = NextResponse.json({
          success: false,
          message: "Estudiante no encontrado",
          authenticated: false,
          type: 'none'
        });
        
        response.cookies.set("student_code", "", { maxAge: 0, path: "/" });
        response.cookies.set("allowed_subjects", "", { maxAge: 0, path: "/" });
        
        return response;
      }

      if (!student.authorized) {
        return NextResponse.json({
          success: false,
          message: "Estudiante no autorizado",
          authenticated: false,
          type: 'none'
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

      return NextResponse.json({
        success: true,
        authenticated: true,
        type: 'student',
        student: {
          name: student.name,
          allowedSubjects: allowedSubjects
        }
      });
    }

    // No session found
    return NextResponse.json({
      success: false,
      message: "No hay sesión activa",
      authenticated: false,
      type: 'none'
    });

  } catch (error: any) {
    console.error("❌ Error verificando sesión:", error);
    return NextResponse.json({
      success: false,
      message: "Error interno del servidor",
      authenticated: false,
      type: 'none'
    }, { status: 500 });
  }
} 