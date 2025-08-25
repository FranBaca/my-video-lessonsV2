import { NextResponse } from "next/server";
import { adminDb } from "@/app/lib/firebase-admin";
import { createAuthMiddleware, AuthenticatedRequest } from "@/app/lib/auth-utils";
import { studentServiceAdmin, professorServiceAdmin } from "@/app/lib/firebase-services";

async function handleCreateStudent(request: AuthenticatedRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      email,
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
    const professorExists = await professorServiceAdmin.getById(professorId);
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
    const code = await studentServiceAdmin.generateUniqueCode(professorId);

    // Crear el estudiante
    const studentData: any = {
      code,
      name: name.trim(),
      authorized,
      allowedSubjects,
      allowedVideos: [],
      enrolledAt: new Date(),
      lastAccess: new Date()
    };

    // Solo agregar email si está presente y no está vacío
    if (email && email.trim()) {
      studentData.email = email.trim();
    }

    const docRef = await adminDb.collection('professors').doc(professorId).collection('students').add({
      ...studentData,
      enrolledAt: new Date(),
      lastAccess: new Date()
    });

    return NextResponse.json({
      success: true,
      message: "Estudiante creado exitosamente",
      student: {
        id: `${professorId}/${docRef.id}`,
        ...studentData
      }
    });

  } catch (error: any) {
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