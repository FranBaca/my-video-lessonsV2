import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/firebase";
import { collection, getDocs, query, where, addDoc, Timestamp, doc, getDoc } from "firebase/firestore";
import { Student } from "@/app/types/firebase";
import { createAuthMiddleware, AuthenticatedRequest } from "@/app/lib/auth-utils";

// Función optimizada para buscar estudiantes solo en el profesor actual
async function findStudentByCodeInProfessor(code: string, professorId: string): Promise<Student | null> {
  try {
    console.log(`🔍 Buscando estudiante con código '${code}' en profesor: ${professorId}`);
    
    const studentsQuery = query(
      collection(db, 'professors', professorId, 'students'),
      where('code', '==', code)
    );
    
    const studentsSnapshot = await getDocs(studentsQuery);
    
    if (!studentsSnapshot.empty) {
      const studentDoc = studentsSnapshot.docs[0];
      console.log('✅ Estudiante encontrado:', studentDoc.id);
      
      const studentData = {
        id: `${professorId}/${studentDoc.id}`,
        ...studentDoc.data(),
        enrolledAt: studentDoc.data().enrolledAt?.toDate() || new Date(),
        lastAccess: studentDoc.data().lastAccess?.toDate()
      } as Student;
      
      return studentData;
    }
    
    console.log('❌ No se encontró estudiante con código:', code);
    return null;
  } catch (error) {
    console.error('❌ Error buscando estudiante:', error);
    return null;
  }
}

// Función para verificar que el profesor existe
async function verifyProfessorExists(professorId: string): Promise<boolean> {
  try {
    const professorDoc = await getDoc(doc(db, 'professors', professorId));
    return professorDoc.exists();
  } catch (error) {
    console.error('❌ Error verificando profesor:', error);
    return false;
  }
}

// Función para generar código único de estudiante
function generateStudentCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function handleCreateStudent(request: AuthenticatedRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      allowedSubjects = [],
      authorized = true 
    } = body;

    // Validaciones básicas
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "El nombre del estudiante es obligatorio"
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(allowedSubjects)) {
      return NextResponse.json(
        {
          success: false,
          message: "allowedSubjects debe ser un array"
        },
        { status: 400 }
      );
    }

    // Verificar que el profesor existe
    const professorId = request.professorId!;
    const professorExists = await verifyProfessorExists(professorId);
    if (!professorExists) {
      return NextResponse.json(
        {
          success: false,
          message: "Profesor no encontrado"
        },
        { status: 404 }
      );
    }

    // Generar código único para el estudiante (solo verificar en este profesor)
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      code = generateStudentCode();
      attempts++;
      
      if (attempts > maxAttempts) {
        return NextResponse.json(
          {
            success: false,
            message: "No se pudo generar un código único para el estudiante"
          },
          { status: 500 }
        );
      }
    } while (await findStudentByCodeInProfessor(code, professorId));

    console.log("🔧 Creating student:", { 
      code, 
      name, 
      professorId, 
      allowedSubjects,
      authorized 
    });

    // Crear el estudiante
    const studentData = {
      code,
      name: name.trim(),
      authorized,
      allowedSubjects,
      allowedVideos: [],
      enrolledAt: new Date(),
      lastAccess: new Date()
    };

    const docRef = await addDoc(
      collection(db, 'professors', professorId, 'students'),
      {
        ...studentData,
        enrolledAt: Timestamp.now(),
        lastAccess: Timestamp.now()
      }
    );

    console.log("✅ Student created successfully:", docRef.id);

    return NextResponse.json({
      success: true,
      message: "Estudiante creado exitosamente",
      student: {
        id: `${professorId}/${docRef.id}`,
        ...studentData
      }
    });

  } catch (error: any) {
    console.error("❌ Error creating student:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error al crear el estudiante",
        error: error.message
      },
      { status: 500 }
    );
  }
}

// Exportar el endpoint con middleware de autenticación
export const POST = createAuthMiddleware(handleCreateStudent); 