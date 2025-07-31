import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/firebase";
import { publicStudentService } from "@/app/lib/firebase-services";
import { Student } from "@/app/types/firebase";

// Variable para activar/desactivar la validación de dispositivo
const FINGERPRINT_VALIDATION_ENABLED =
  process.env.FINGERPRINT_VALIDATION_ENABLED === "true";

// Rate limiting
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const MAX_REQUESTS_PER_WINDOW = 5;
const requestCounts = new Map<string, { count: number; timestamp: number }>();

// Validar formato del deviceId
function isValidDeviceId(deviceId: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(deviceId);
}

// Rate limiting
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const requestData = requestCounts.get(ip);

  if (!requestData || now - requestData.timestamp > RATE_LIMIT_WINDOW) {
    requestCounts.set(ip, { count: 1, timestamp: now });
    return true;
  }

  if (requestData.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  requestData.count++;
  return true;
}

async function checkStudentAccess(code: string, deviceId: string) {
  if (!FINGERPRINT_VALIDATION_ENABLED) {
    return { valid: true, firstTime: true };
  }

  try {


    // Obtener el estudiante desde Firestore usando el servicio público
    const student = await publicStudentService.getByCode(code);
    
    if (!student) {
      console.log("Estudiante no encontrado en Firestore");
      return { valid: false, firstTime: false };
    }

    if (!student.authorized) {
      console.log("Estudiante no autorizado");
      return { valid: false, firstTime: false };
    }

    // Verificar si es la primera vez que accede
    if (!student.deviceId) {
      console.log("Primera vez accediendo, registrando deviceId");
      // Actualizar el deviceId del estudiante usando el servicio público
      // Extraer el professorId del id que ahora incluye el path completo
      const pathParts = student.id?.split('/') || [];
      const professorId = pathParts[0]; // El primer elemento es el professorId
      const studentId = pathParts[1]; // El segundo elemento es el studentId
      

      
      if (professorId && studentId) {
        await publicStudentService.updateDeviceId(studentId, professorId, deviceId);
      }
      return { valid: true, firstTime: true };
    }

    // Verificar si el deviceId coincide
    if (student.deviceId === deviceId) {
      console.log("DeviceId coincide, acceso permitido");
      return { valid: true, firstTime: false };
    }

    console.log("DeviceId no coincide, acceso denegado");
    return { valid: false, firstTime: false };

  } catch (error) {
    console.error("Error checking student access:", error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Demasiadas solicitudes. Por favor, espera un momento antes de intentar nuevamente.",
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { code, deviceId } = body;

    console.log("Recibida solicitud de verificación:", {
      code,
      deviceId: deviceId
        ? deviceId.substring(0, 10) + "..."
        : "no proporcionado",
      deviceValidationEnabled: FINGERPRINT_VALIDATION_ENABLED,
    });

    if (!code || !deviceId) {
      return NextResponse.json(
        { success: false, message: "Por favor ingresa un código válido" },
        { status: 400 }
      );
    }

    // Verificar acceso del estudiante
    const result = await checkStudentAccess(code, deviceId);
    
    if (!result.valid) {
      console.log("Acceso denegado para código:", code);
      return NextResponse.json(
        {
          success: false,
          message:
            "Este código ya está siendo usado en otro dispositivo. Por favor, utiliza el mismo dispositivo que usaste para ingresar por primera vez.",
        },
        { status: 403 }
      );
    }

    // Obtener información del estudiante usando el servicio público
    const student = await publicStudentService.getByCode(code);
    
    if (!student) {
      return NextResponse.json(
        {
          success: false,
          message: "El código ingresado no es válido o no existe",
        },
        { status: 403 }
      );
    }

    if (!student.authorized) {
      return NextResponse.json(
        {
          success: false,
          message: "Tu cuenta no está autorizada. Contacta a tu profesor.",
        },
        { status: 403 }
      );
    }

    console.log(
      `Verificación exitosa (${
        FINGERPRINT_VALIDATION_ENABLED ? "Validación activa" : "Modo temporal"
      }):`,
      {
        code,
        name: student.name,
        authorized: student.authorized,
        allowedVideos: student.allowedVideos?.length || 0,
        allowedSubjects: student.allowedSubjects?.length || 0,
        firstTime: result.firstTime,
        deviceId: deviceId.substring(0, 10) + "...",
      }
    );

    // Configurar la respuesta con las cookies
    const response = NextResponse.json({
      success: true,
      firstTime: result.firstTime,
      message: `¡Bienvenido! (${
        FINGERPRINT_VALIDATION_ENABLED
          ? "Verificación completa"
          : "Verificación temporal"
      })`,
      student: {
        name: student.name,
        allowedSubjects: student.allowedSubjects || [],
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
      JSON.stringify(student.allowedSubjects || []),
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
