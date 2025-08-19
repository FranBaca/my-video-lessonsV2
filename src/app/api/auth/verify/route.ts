import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/app/lib/firebase-admin";
import { Student } from "@/app/types/firebase";

export const dynamic = 'force-dynamic';

// Variable para activar/desactivar la validación de dispositivo
const FINGERPRINT_VALIDATION_ENABLED = true; // Device validation enabled
// process.env.FINGERPRINT_VALIDATION_ENABLED === "true";

// Rate limiting
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const MAX_REQUESTS_PER_WINDOW = 5;
const MAX_ATTEMPTS_PER_HOUR = 50; // Added hourly limit
const requestCounts = new Map<string, { count: number; timestamp: number; hourlyCount: number; hourlyTimestamp: number }>();

// Validar formato del deviceId
function isValidDeviceId(deviceId: string): boolean {
  // Accept both UUID format and fingerprint format (hash-uuid)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const fingerprintRegex = /^[0-9a-f]+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  return uuidRegex.test(deviceId) || fingerprintRegex.test(deviceId);
}

// Enhanced rate limiting
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const requestData = requestCounts.get(ip);

  if (!requestData || now - requestData.timestamp > RATE_LIMIT_WINDOW) {
    // Reset per-minute counter
    const hourlyCount = requestData ? requestData.hourlyCount : 0;
    const hourlyTimestamp = requestData ? requestData.hourlyTimestamp : now;
    
    requestCounts.set(ip, { 
      count: 1, 
      timestamp: now,
      hourlyCount: hourlyCount + 1,
      hourlyTimestamp: hourlyTimestamp
    });
    
    // Check hourly limit
    if (now - hourlyTimestamp > 60 * 60 * 1000) {
      // Reset hourly counter
      requestCounts.set(ip, { 
        count: 1, 
        timestamp: now,
        hourlyCount: 1,
        hourlyTimestamp: now
      });
    } else if (hourlyCount >= MAX_ATTEMPTS_PER_HOUR) {
      return false; // Hourly limit exceeded
    }
    
    return true;
  }

  if (requestData.count >= MAX_REQUESTS_PER_WINDOW) {
    return false; // Per-minute limit exceeded
  }

  requestData.count++;
  requestData.hourlyCount++;
  return true;
}

// Función mejorada para buscar estudiantes en Firebase
async function findStudentByCode(code: string): Promise<Student | null> {
  try {
    // Obtener todos los profesores
    const professorsSnapshot = await adminDb.collection('professors').get();
    
    // Buscar en cada profesor
    for (const professorDoc of professorsSnapshot.docs) {
      const professorId = professorDoc.id;
      
      try {
        // Buscar estudiantes en este profesor
        const studentsQuery = adminDb.collection('professors').doc(professorId).collection('students').where('code', '==', code);
        
        const studentsSnapshot = await studentsQuery.get();
        
        if (!studentsSnapshot.empty) {
          const studentDoc = studentsSnapshot.docs[0];
          
          const studentData = {
            id: `${professorId}/${studentDoc.id}`,
            ...studentDoc.data(),
            enrolledAt: studentDoc.data().enrolledAt?.toDate() || new Date(),
            lastAccess: studentDoc.data().lastAccess?.toDate()
          } as Student;
          
          return studentData;
        }
      } catch (error) {
        continue; // Try next professor
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// Centralized error handling
function createErrorResponse(message: string, status: number = 400) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

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
    if (!checkRateLimit(ip)) {
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
    const student = await findStudentByCode(code);
    
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
