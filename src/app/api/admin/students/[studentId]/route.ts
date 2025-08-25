import { NextResponse } from "next/server";
import { adminDb } from "@/app/lib/firebase-admin";
import { Student } from "@/app/types/firebase";
import { createAuthMiddleware, AuthenticatedRequest } from "@/app/lib/auth-utils";
import { studentServiceAdmin } from "@/app/lib/firebase-services";
import { validateSubjectsArray, removeDuplicateSubjects } from "@/app/lib/utils";

// Función para actualizar materias del estudiante
async function updateStudentSubjects(studentId: string, professorId: string, newSubjects: string[]): Promise<Student> {
  try {
    // Obtener estudiante actual
    const currentStudent = await studentServiceAdmin.findStudentByIdInProfessor(studentId, professorId);
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
    const existingStudent = await studentServiceAdmin.findStudentByIdInProfessor(studentId, professorId);
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