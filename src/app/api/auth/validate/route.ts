import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import students from "@/app/data/students.json";
import { Student } from "@/app/types";
import { saveUsedCode, verifyDeviceAccess } from "@/app/lib/sheets";
import { getServiceAuth } from "@/app/lib/google-auth";

// Función para obtener la IP del cliente
function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return request.ip || "unknown";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      code,
      deviceId: clientDeviceId,
      fingerprintData,
      rememberSession = true,
    } = body;

    // Obtener información del fingerprint y la IP
    const browserFingerprint =
      fingerprintData?.browserFingerprint || clientDeviceId;
    const fingerprintVerified = fingerprintData?.verified || false;
    const ipAddress = getClientIp(request);

    console.log("Validando código con fingerprint:", {
      code,
      browserFingerprint: browserFingerprint
        ? `${browserFingerprint.substring(0, 10)}...`
        : "No disponible",
      fingerprintVerified,
      ipAddress,
      rememberSession,
    });

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          message: "Código no proporcionado",
        },
        { status: 400 }
      );
    }

    // Find student with the provided code
    const student = (students as Student[]).find((s) => s.code === code);

    if (!student) {
      return NextResponse.json(
        {
          success: false,
          message: "Código inválido",
        },
        { status: 401 }
      );
    }

    if (!student.authorized) {
      return NextResponse.json(
        {
          success: false,
          message: "Estudiante no autorizado",
        },
        { status: 403 }
      );
    }

    // Obtener un token de acceso válido para Google Sheets
    let accessToken;
    try {
      const auth = await getServiceAuth();
      const credentials = await auth.getAccessToken();
      accessToken = credentials.token || "";

      if (!accessToken) {
        throw new Error("No se pudo obtener un token de acceso válido");
      }
    } catch (error) {
      console.error("Error al obtener token de servicio:", error);
      return NextResponse.json(
        {
          success: false,
          message:
            "Error al autenticar con Google Sheets. Contacte al administrador.",
        },
        { status: 500 }
      );
    }

    // Verificar si el dispositivo está autorizado
    try {
      const accessVerification = await verifyDeviceAccess(
        accessToken,
        code,
        browserFingerprint,
        ipAddress
      );

      if (!accessVerification.allowed) {
        return NextResponse.json(
          {
            success: false,
            message: accessVerification.reason,
          },
          { status: 403 }
        );
      }

      // Guardar o actualizar la información del código en Google Sheets
      const saveResult = await saveUsedCode(accessToken, {
        code,
        deviceId: clientDeviceId || uuidv4(),
        browserFingerprint,
        fingerprintVerified,
        subjects: student.subjects || [],
        ipAddress,
      });

      if (!saveResult) {
        throw new Error("No se pudo registrar el código en la base de datos");
      }
    } catch (error) {
      console.error("Error en la verificación/registro:", error);
      return NextResponse.json(
        {
          success: false,
          message:
            "Error al verificar o registrar el código. Por favor, intente nuevamente.",
        },
        { status: 500 }
      );
    }

    // Store device ID and student code in cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as "strict",
      maxAge: rememberSession ? 30 * 24 * 60 * 60 : 24 * 60 * 60, // 30 días si se recuerda la sesión, 1 día si no
      path: "/",
    };

    // Configurar la respuesta con las cookies
    const response = NextResponse.json({
      success: true,
      student: {
        ...student,
        deviceId: clientDeviceId,
        browserFingerprint: browserFingerprint
          ? `${browserFingerprint.substring(0, 10)}...`
          : null,
        fingerprintVerified,
      },
    });

    // Establecer las cookies en la respuesta
    response.cookies.set("device_id", clientDeviceId, cookieOptions);
    response.cookies.set("student_code", code, cookieOptions);
    // Establecer el token de acceso como cookie
    response.cookies.set("access_token", accessToken, cookieOptions);

    // Almacenar el fingerprint en una cookie
    if (browserFingerprint) {
      response.cookies.set("browser_fingerprint", browserFingerprint, {
        ...cookieOptions,
        httpOnly: false, // No es httpOnly para que pueda ser accedido por JavaScript para verificación
      });
    }

    // Guardar las materias permitidas en una cookie
    if (student.subjects && student.subjects.length > 0) {
      response.cookies.set(
        "allowed_subjects",
        JSON.stringify(student.subjects),
        cookieOptions
      );
    }

    return response;
  } catch (error) {
    console.error("Validation error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error al validar el código",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}
