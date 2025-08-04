import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/app/lib/firebase-admin";
import { Student } from "@/app/types/firebase";
import { createAuthMiddleware, AuthenticatedRequest } from "@/app/lib/auth-utils";

// Función para buscar estudiante por ID dentro del profesor
async function findStudentByIdInProfessor(studentId: string, professorId: string): Promise<Student | null> {
  try {
    const studentDoc = await adminDb.collection('professors').doc(professorId).collection('students').doc(studentId).get();
    
    if (!studentDoc.exists) {
      return null;
    }
    
    const studentData = {
      id: `${professorId}/${studentDoc.id}`,
      ...studentDoc.data(),
      enrolledAt: studentDoc.data().enrolledAt?.toDate() || new Date(),
      lastAccess: studentDoc.data().lastAccess?.toDate()
    } as Student;
    
    return studentData;
  } catch (error) {
    console.error("❌ Error finding student by ID:", error);
    return null;
  }
}

// Función para validar array de materias
function validateSubjectsArray(subjects: any): boolean {
  if (!Array.isArray(subjects)) {
    return false;
  }
  
  return subjects.every(subject => typeof subject === 'string' && subject.trim().length > 0);
}

// Función para remover materias duplicadas
function removeDuplicateSubjects(existingSubjects: string[], newSubjects: string[]): string[] {
  const existingSet = new Set(existingSubjects);
  const uniqueNewSubjects = newSubjects.filter(subject => !existingSet.has(subject));
  return [...existingSubjects, ...uniqueNewSubjects];
}

// Función para actualizar materias del estudiante
async function updateStudentSubjects(studentId: string, professorId: string, newSubjects: string[]): Promise<Student> {
  try {
    // Obtener estudiante actual
    const currentStudent = await findStudentByIdInProfessor(studentId, professorId);
    if (!currentStudent) {
      throw new Error("Estudiante no encontrado");
    }
    
    // Obtener materias existentes
    const existingSubjects = currentStudent.allowedSubjects || [];
    
    // Combinar y remover duplicados
    const updatedSubjects = removeDuplicateSubjects(existingSubjects, newSubjects);
    
    // Actualizar documento en Firestore
    await adminDb.collection('professors').doc(professorId).collection('students').doc(studentId).update({
      allowedSubjects: updatedSubjects,
      lastAccess: new Date()
    });
    
    // Retornar estudiante actualizado
    return {
      ...currentStudent,
      allowedSubjects: updatedSubjects,
      lastAccess: new Date()
    };
  } catch (error) {
    console.error("❌ Error updating student subjects:", error);
    throw error;
  }
}

// Función principal del endpoint
async function handleUpdateStudent(request: AuthenticatedRequest, context: { params: { studentId: string } }) {
  try {
    if (!context?.params?.studentId) {
      return NextResponse.json(
        {
          success: false,
          message: "ID de estudiante no proporcionado"
        },
        { status: 400 }
      );
    }
    
    const { studentId } = context.params;
    const professorId = request.professorId!;
    
    // Validar que el estudiante existe y pertenece al profesor
    const existingStudent = await findStudentByIdInProfessor(studentId, professorId);
    if (!existingStudent) {
      return NextResponse.json(
        {
          success: false,
          message: "Estudiante no encontrado"
        },
        { status: 404 }
      );
    }
    
    // Obtener y validar el cuerpo de la petición
    const body = await request.json();
    const { subjectsToAdd } = body;
    
    // Validar que subjectsToAdd es un array válido
    if (!validateSubjectsArray(subjectsToAdd)) {
      return NextResponse.json(
        {
          success: false,
          message: "subjectsToAdd debe ser un array válido"
        },
        { status: 400 }
      );
    }
    
    // Actualizar materias del estudiante
    const updatedStudent = await updateStudentSubjects(studentId, professorId, subjectsToAdd);
    
    return NextResponse.json({
      success: true,
      message: "Estudiante actualizado exitosamente",
      student: updatedStudent
    });
    
  } catch (error: any) {
    console.error("❌ Error updating student:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error al actualizar el estudiante",
        error: error.message
      },
      { status: 500 }
    );
  }
}

// Exportar el endpoint con middleware de autenticación
export const PUT = createAuthMiddleware(handleUpdateStudent); 