import { NextRequest, NextResponse } from "next/server";
import students from "@/app/data/students.json";
import { Student } from "@/app/types";

export async function GET(request: NextRequest) {
  try {
    // Obtener el código de estudiante de la cookie
    const studentCode = request.cookies.get("student_code")?.value;
    const deviceId = request.cookies.get("device_id")?.value;
    const browserFingerprint = request.cookies.get(
      "browser_fingerprint"
    )?.value;

    // Si no hay código, devolver error
    if (!studentCode) {
      return NextResponse.json(
        {
          success: false,
          message: "No se encontró una sesión activa",
        },
        { status: 401 }
      );
    }

    // Verificar que el estudiante existe y está autorizado
    const student = (students as Student[]).find((s) => s.code === studentCode);
    if (!student || !student.authorized) {
      return NextResponse.json(
        {
          success: false,
          message: "Estudiante no encontrado o no autorizado",
        },
        { status: 403 }
      );
    }

    // Renovar las cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as "strict",
      maxAge: 30 * 24 * 60 * 60, // 30 días
      path: "/",
    };

    const response = NextResponse.json({
      success: true,
      message: "Sesión renovada correctamente",
      student: {
        name: student.name,
        subjects: student.subjects,
      },
    });

    // Renovar todas las cookies relacionadas con la sesión
    response.cookies.set("student_code", studentCode, cookieOptions);

    if (student.subjects && student.subjects.length > 0) {
      response.cookies.set(
        "allowed_subjects",
        JSON.stringify(student.subjects),
        cookieOptions
      );
    }

    if (deviceId) {
      response.cookies.set("device_id", deviceId, cookieOptions);
    }

    if (browserFingerprint) {
      response.cookies.set("browser_fingerprint", browserFingerprint, {
        ...cookieOptions,
        httpOnly: false, // No es httpOnly para que pueda ser accedido por JavaScript
      });
    }

    return response;
  } catch (error: any) {
    console.error("Error al refrescar la sesión:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error interno al refrescar la sesión",
        details:
          process.env.NODE_ENV === "development" ? error.toString() : undefined,
      },
      { status: 500 }
    );
  }
}
