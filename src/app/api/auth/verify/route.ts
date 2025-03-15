import { NextRequest, NextResponse } from "next/server";
import { verifyStudentCode, verifyDeviceAccess } from "@/app/lib/sheets";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, fingerprint } = body;

    console.log("Recibida solicitud de verificación:", {
      code,
      fingerprint: fingerprint
        ? fingerprint.substring(0, 10) + "..."
        : "no proporcionado",
    });

    if (!code || !fingerprint) {
      return NextResponse.json(
        { success: false, message: "Por favor ingresa un código válido" },
        { status: 400 }
      );
    }

    // Verificar que el código existe y está autorizado usando Google Sheets
    const student = await verifyStudentCode(
      process.env.GOOGLE_SERVICE_ACCESS_TOKEN!,
      code
    );

    if (!student.exists || !student.authorized) {
      console.log("Código inválido o no autorizado:", code);
      return NextResponse.json(
        {
          success: false,
          message: "El código ingresado no es válido o no está autorizado",
        },
        { status: 403 }
      );
    }

    // Verificar el acceso del dispositivo
    const accessVerification = await verifyDeviceAccess(
      process.env.GOOGLE_SERVICE_ACCESS_TOKEN!,
      code,
      fingerprint,
      request.ip || "unknown"
    );

    if (!accessVerification.allowed) {
      console.log("Código ya en uso en otro dispositivo:", code);
      return NextResponse.json(
        {
          success: false,
          message: accessVerification.reason || "Acceso denegado",
        },
        { status: 403 }
      );
    }

    console.log("Verificación exitosa:", {
      code,
      name: student.name,
      subjects: student.subjects,
      fingerprintVerified: student.fingerprintVerified,
    });

    // Configurar la respuesta con las cookies
    const response = NextResponse.json({
      success: true,
      firstTime: !student.fingerprintVerified,
      message: student.fingerprintVerified
        ? "¡Bienvenido de nuevo!"
        : "¡Bienvenido!",
      student: {
        name: student.name,
        subjects: student.subjects,
      },
    });

    // Establecer cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as "strict",
      maxAge: 30 * 24 * 60 * 60, // 30 días
      path: "/",
    };

    response.cookies.set("student_code", code, cookieOptions);
    response.cookies.set(
      "allowed_subjects",
      JSON.stringify(student.subjects),
      cookieOptions
    );

    return response;
  } catch (error: any) {
    console.error("Verification error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Internal server error",
        details:
          process.env.NODE_ENV === "development" ? error.toString() : undefined,
      },
      { status: 500 }
    );
  }
}
