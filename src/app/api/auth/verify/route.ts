import { NextRequest, NextResponse } from "next/server";
import { studentServiceAdmin } from "@/app/lib/firebase-services";
import { adminDb } from "@/app/lib/firebase-admin";
import { Student } from "@/app/types/firebase";
import { createErrorResponse, checkRateLimit, isValidDeviceId } from "@/app/lib/server-utils";

export const dynamic = 'force-dynamic';

// Variable para activar/desactivar la validación de dispositivo
const FINGERPRINT_VALIDATION_ENABLED = true; // Device validation enabled

const MAX_REQUESTS_PER_WINDOW = 5;
const MAX_ATTEMPTS_PER_HOUR = 50;

export async function POST(request: NextRequest) {
  try {
    // Check if Admin SDK is available
    if (!adminDb) {
      return createErrorResponse(
        "Error de configuración del servidor. Por favor, contacta al administrador.",
        500
      );
    }
    
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(ip, MAX_REQUESTS_PER_WINDOW, MAX_ATTEMPTS_PER_HOUR)) {
      return createErrorResponse(
        "Demasiadas solicitudes. Límite: 5 por minuto, 50 por hora. Por favor, espera antes de intentar nuevamente.",
        429
      );
    }

    const body = await request.json();
    const { code, deviceId } = body;

    if (!code || !deviceId) {
      return createErrorResponse("Por favor ingresa un código válido");
    }

    // Validate deviceId format
    if (!isValidDeviceId(deviceId)) {
      return createErrorResponse("Device ID inválido", 400);
    }

    // SINGLE STUDENT LOOKUP - Reuse existing function
    const student = await studentServiceAdmin.findByCode(code);
    
    if (!student) {
      return createErrorResponse("El código ingresado no es válido o no existe", 403);
    }

    if (!student.authorized) {
      return createErrorResponse("Tu cuenta no está autorizada. Contacta a tu profesor.", 403);
    }

    // Device validation (true device binding)
    if (FINGERPRINT_VALIDATION_ENABLED) {
      try {
        if (!student.deviceId || student.deviceId === null || student.deviceId === undefined) {
          // First time access - register device
          const pathParts = student.id?.split('/') || [];
          const professorId = pathParts[0];
          const studentId = pathParts[1];
          
          if (professorId && studentId) {
            try {
              const docRef = adminDb.collection('professors').doc(professorId).collection('students').doc(studentId);
              await docRef.update({
                deviceId,
                lastAccess: new Date()
              });
            } catch (updateError) {
              // Continue with login even if update fails
            }
          }
        } else if (student.deviceId !== deviceId) {
          // Device mismatch - reject access from different devices
          return createErrorResponse("Acceso no autorizado desde este dispositivo. Solo puedes acceder desde el dispositivo donde te registraste inicialmente.", 403);
        }
      } catch (deviceValidationError) {
        // Continue with login even if device validation fails
      }
    }

    // Configurar la respuesta con las cookies
    const response = NextResponse.json({
      success: true,
      message: `¡Bienvenido!`,
      student: {
        name: student.name,
        allowedSubjects: student.allowedSubjects || [],
      },
    });

    // Establecer cookies
    const cookieOptions = {
      httpOnly: true,
      secure: true, // Always secure - remove environment check
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
    console.error("❌ Error en verificación:", error);
    return createErrorResponse(
      "Error interno del servidor. Por favor, intenta nuevamente.",
      500
    );
  }
}