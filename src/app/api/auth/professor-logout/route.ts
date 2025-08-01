import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log("🔓 Logout de profesor solicitado");

    // Configurar la respuesta
    const response = NextResponse.json({
      success: true,
      message: "Logout exitoso"
    });

    // Limpiar cookies de sesión
    response.cookies.set("professor_token", "", { 
      maxAge: 0, 
      path: "/" 
    });
    response.cookies.set("professor_id", "", { 
      maxAge: 0, 
      path: "/" 
    });

    console.log("✅ Cookies de profesor limpiadas");

    return response;

  } catch (error) {
    console.error("❌ Error en professor-logout:", error);
    return NextResponse.json({
      success: false,
      message: "Error interno del servidor"
    }, { status: 500 });
  }
} 