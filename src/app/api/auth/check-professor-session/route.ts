import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth } from '../../../lib/firebase-admin';
import { professorServiceClient } from '../../../lib/firebase-client';

export async function GET(request: NextRequest) {
  try {
    // Obtener las cookies
    const cookieStore = cookies();
    const professorToken = cookieStore.get("professor_token")?.value;
    const professorId = cookieStore.get("professor_id")?.value;

    console.log("🔍 Verificando sesión de profesor:", {
      hasProfessorToken: !!professorToken,
      hasProfessorId: !!professorId
    });

    if (!professorToken || !professorId) {
      return NextResponse.json({
        success: false,
        message: "No hay sesión activa",
        authenticated: false
      });
    }

    try {
      // Verificar el token de Firebase
      const decodedToken = await adminAuth.verifyIdToken(professorToken);
      
      if (decodedToken.uid !== professorId) {
        throw new Error('Token no coincide con el ID del profesor');
      }

      // Verificar que el profesor existe en Firestore
      const professor = await professorServiceClient.getById(professorId);
      
      if (!professor) {
        // Limpiar cookies si el profesor no existe
        const response = NextResponse.json({
          success: false,
          message: "Profesor no encontrado",
          authenticated: false
        });
        
        response.cookies.set("professor_token", "", { maxAge: 0, path: "/" });
        response.cookies.set("professor_id", "", { maxAge: 0, path: "/" });
        
        return response;
      }

      if (!professor.isActive) {
        return NextResponse.json({
          success: false,
          message: "Cuenta de profesor desactivada",
          authenticated: false
        });
      }

      console.log("✅ Sesión de profesor válida:", {
        name: professor.name,
        email: professor.email,
        id: professorId
      });

      return NextResponse.json({
        success: true,
        authenticated: true,
        professor: {
          id: professor.id,
          name: professor.name,
          email: professor.email,
          isActive: professor.isActive
        }
      });

    } catch (error) {
      console.error("❌ Error verificando token de profesor:", error);
      
      // Limpiar cookies si el token es inválido
      const response = NextResponse.json({
        success: false,
        message: "Sesión expirada",
        authenticated: false
      });
      
      response.cookies.set("professor_token", "", { maxAge: 0, path: "/" });
      response.cookies.set("professor_id", "", { maxAge: 0, path: "/" });
      
      return response;
    }

  } catch (error) {
    console.error("❌ Error en check-professor-session:", error);
    return NextResponse.json({
      success: false,
      message: "Error interno del servidor",
      authenticated: false
    }, { status: 500 });
  }
} 