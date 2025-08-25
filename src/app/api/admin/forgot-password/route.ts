import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/app/lib/firebase-admin";
import { professorService } from "@/app/lib/firebase-services";

import { verifyAdminAuth } from "@/app/lib/auth-utils";

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación de administrador
    const isAdmin = await verifyAdminAuth(request);
    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          message: "No autorizado. Se requieren credenciales de administrador.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { professorId, email } = body;

    // Validaciones básicas
    if (!professorId && !email) {
      return NextResponse.json(
        {
          success: false,
          message: "Se requiere professorId o email",
        },
        { status: 400 }
      );
    }

    let professor = null;
    let firebaseUid = null;

    // Buscar profesor por ID o email
    if (professorId) {
      professor = await professorService.getById(professorId);
      firebaseUid = professorId;
    } else if (email) {
      // Buscar profesor por email
      const professors = await professorService.getAll();
      professor = professors.find(p => p.email === email);
      if (professor) {
        firebaseUid = professor.id;
      }
    }

    if (!professor) {
      return NextResponse.json(
        {
          success: false,
          message: "Profesor no encontrado",
        },
        { status: 404 }
      );
    }

    // Generar nueva contraseña temporal
    const tempPassword = Math.random().toString(36).slice(-8) + 
                        Math.random().toString(36).toUpperCase().slice(-4) + "!1";

    try {
      // Actualizar contraseña en Firebase Auth usando Admin SDK
      await adminAuth.updateUser(firebaseUid, {
        password: tempPassword
      });

      // Registrar el cambio de contraseña en Firestore
      await adminDb.collection('professors').doc(firebaseUid).update({
        passwordResetAt: new Date(),
        passwordResetBy: 'admin'
      });

      return NextResponse.json({
        success: true,
        message: "Contraseña actualizada exitosamente",
        data: {
          professorId: firebaseUid,
          email: professor.email,
          name: professor.name,
          // Removed tempPassword for security - password should not be exposed in API responses
        }
      });

    } catch (error: any) {
      // Si el usuario no existe en Firebase Auth
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json(
          {
            success: false,
            message: "El profesor no tiene una cuenta de Firebase Auth",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "Error al actualizar la contraseña",
          error: error.message,
        },
        { status: 500 }
      );
    }

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación de administrador
    const isAdmin = await verifyAdminAuth(request);
    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          message: "No autorizado. Se requieren credenciales de administrador.",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const professorId = searchParams.get('professorId');
    const email = searchParams.get('email');

    if (!professorId && !email) {
      return NextResponse.json(
        {
          success: false,
          message: "Se requiere professorId o email como parámetro de consulta",
        },
        { status: 400 }
      );
    }

    let professor = null;

    // Buscar profesor por ID o email
    if (professorId) {
      professor = await professorService.getById(professorId);
    } else if (email) {
      const professors = await professorService.getAll();
      professor = professors.find(p => p.email === email);
    }

    if (!professor) {
      return NextResponse.json(
        {
          success: false,
          message: "Profesor no encontrado",
        },
        { status: 404 }
      );
    }

    // Verificar si el profesor tiene cuenta en Firebase Auth
    let hasFirebaseAccount = false;
    try {
      await adminAuth.getUser(professor.id);
      hasFirebaseAccount = true;
    } catch (error) {
      hasFirebaseAccount = false;
    }

    return NextResponse.json({
      success: true,
      data: {
        professorId: professor.id,
        email: professor.email,
        name: professor.name,
        isActive: professor.isActive,
        hasFirebaseAccount: hasFirebaseAccount
      }
    });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error al obtener información del profesor",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
} 