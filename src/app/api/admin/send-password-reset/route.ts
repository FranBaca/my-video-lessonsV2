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

    try {
      // Verificar si el usuario existe en Firebase Auth
      const firebaseUser = await adminAuth.getUserByEmail(professor.email);
      
      // Enviar email de reset de contraseña usando Firebase Auth
      // Esto enviará automáticamente el email con la plantilla personalizada
      await adminAuth.generatePasswordResetLink(professor.email, {
        // Configuración adicional para el link
        url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password`,
        handleCodeInApp: false, // Firebase maneja el código automáticamente
      });
      
      // Registrar el intento de reset en Firestore
      await adminDb.collection('professors').doc(firebaseUid).update({
        passwordResetRequestedAt: new Date(),
        passwordResetBy: 'admin',
        passwordResetMethod: 'firebase_email',
        lastResetEmailSent: new Date(),
        firebaseUid: firebaseUser.uid
      });

      return NextResponse.json({
        success: true,
        message: "Email de reset de contraseña enviado exitosamente",
        data: {
          professorId: firebaseUid,
          email: professor.email,
          name: professor.name,
          firebaseUid: firebaseUser.uid,
          method: 'firebase_email',
          note: "El email se envió usando la plantilla personalizada de Firebase"
        }
      });

    } catch (error: any) {
      // Si el usuario no existe en Firebase Auth
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json(
          {
            success: false,
            message: "El profesor no tiene una cuenta de Firebase Auth",
            error: error.message,
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "Error al enviar email de reset de contraseña",
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
