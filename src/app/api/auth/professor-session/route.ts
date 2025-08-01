import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Obtener las cookies
    const cookieStore = cookies();
    const professorToken = cookieStore.get("professor_token")?.value;
    const professorId = cookieStore.get("professor_id")?.value;

    return NextResponse.json({
      success: true,
      hasSession: !!(professorToken && professorId),
      hasToken: !!professorToken,
      hasId: !!professorId
    });

  } catch (error) {
    console.error("❌ Error en professor-session:", error);
    return NextResponse.json({
      success: false,
      hasSession: false,
      message: "Error interno del servidor"
    }, { status: 500 });
  }
} 