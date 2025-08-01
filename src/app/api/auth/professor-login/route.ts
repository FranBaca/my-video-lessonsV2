import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '../../../lib/firebase-admin';
import { professorServiceClient } from '../../../lib/firebase-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json({
        success: false,
        message: "Token de autenticación requerido"
      }, { status: 400 });
    }

    try {
      // Verificar el token de Firebase
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      
      // Verificar que el usuario es un profesor
      const professor = await professorServiceClient.getById(decodedToken.uid);
      
      if (!professor) {
        return NextResponse.json({
          success: false,
          message: "Usuario no es un profesor registrado"
        }, { status: 403 });
      }

      if (!professor.isActive) {
        return NextResponse.json({
          success: false,
          message: "Cuenta de profesor desactivada"
        }, { status: 403 });
      }

      console.log("✅ Login exitoso de profesor:", {
        name: professor.name,
        email: professor.email,
        id: professor.id
      });

      // Configurar la respuesta con las cookies
      const response = NextResponse.json({
        success: true,
        message: "Login exitoso",
        professor: {
          id: professor.id,
          name: professor.name,
          email: professor.email,
          isActive: professor.isActive
        }
      });

      // Establecer cookies de sesión
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict" as "strict",
        maxAge: 7 * 24 * 60 * 60, // 7 días
        path: "/",
      };

      response.cookies.set("professor_token", idToken, cookieOptions);
      response.cookies.set("professor_id", professor.id, cookieOptions);

      return response;

    } catch (error) {
      console.error("❌ Error verificando token:", error);
      return NextResponse.json({
        success: false,
        message: "Token de autenticación inválido"
      }, { status: 401 });
    }

  } catch (error) {
    console.error("❌ Error en professor-login:", error);
    return NextResponse.json({
      success: false,
      message: "Error interno del servidor"
    }, { status: 500 });
  }
} 