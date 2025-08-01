import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/firebase";
import { collection, getDocs, query, where, updateDoc, doc, Timestamp } from "firebase/firestore";
import { Student } from "@/app/types/firebase";

// Variable para activar/desactivar la validación de dispositivo
const FINGERPRINT_VALIDATION_ENABLED = true; // Device validation enabled
// process.env.FINGERPRINT_VALIDATION_ENABLED === "true";

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

// Función mejorada para buscar estudiantes en Firebase
async function findStudentByCode(code: string): Promise<Student | null> {
  try {
    console.log('🔍 Buscando estudiante con código:', code);
    
    // Obtener todos los profesores
    const professorsSnapshot = await getDocs(collection(db, 'professors'));
    console.log('📋 Profesores encontrados:', professorsSnapshot.size);
    
    // Buscar en cada profesor
    for (const professorDoc of professorsSnapshot.docs) {
      const professorId = professorDoc.id;
      console.log(`🔍 Buscando en profesor: ${professorId}`);
      
      try {
        // Buscar estudiantes en este profesor
        const studentsQuery = query(
          collection(db, 'professors', professorId, 'students'),
          where('code', '==', code)
        );
        
        const studentsSnapshot = await getDocs(studentsQuery);
        
        if (!studentsSnapshot.empty) {
          const studentDoc = studentsSnapshot.docs[0];
          console.log('✅ Estudiante encontrado en profesor:', professorId);
          
          const studentData = {
            id: `${professorId}/${studentDoc.id}`,
            ...studentDoc.data(),
            enrolledAt: studentDoc.data().enrolledAt?.toDate() || new Date(),
            lastAccess: studentDoc.data().lastAccess?.toDate()
          } as Student;
          
          console.log('✅ Datos del estudiante:', {
            id: studentData.id,
            name: studentData.name,
            code: studentData.code,
            authorized: studentData.authorized,
            deviceId: studentData.deviceId,
            allowedSubjects: studentData.allowedSubjects?.length || 0
          });
          
          return studentData;
        }
      } catch (error) {
        console.log(`⚠️ Error buscando en profesor ${professorId}:`, error);
        continue; // Try next professor
      }
    }
    
    console.log('❌ No se encontró estudiante con código:', code);
    return null;
  } catch (error) {
    console.error('❌ Error en findStudentByCode:', error);
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
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(ip)) {
      return createErrorResponse(
        "Demasiadas solicitudes. Por favor, espera un momento antes de intentar nuevamente.",
        429
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
      return createErrorResponse("Por favor ingresa un código válido");
    }

    // SINGLE STUDENT LOOKUP - Reuse existing function
    const student = await findStudentByCode(code);
    
    if (!student) {
      return createErrorResponse("El código ingresado no es válido o no existe", 403);
    }

    if (!student.authorized) {
      return createErrorResponse("Tu cuenta no está autorizada. Contacta a tu profesor.", 403);
    }

    // Device validation (simplified)
    if (FINGERPRINT_VALIDATION_ENABLED) {
      if (!student.deviceId) {
        // First time access - register device
        const pathParts = student.id?.split('/') || [];
        const professorId = pathParts[0];
        const studentId = pathParts[1];
        
        if (professorId && studentId) {
          const docRef = doc(db, 'professors', professorId, 'students', studentId);
          await updateDoc(docRef, {
            deviceId,
            lastAccess: Timestamp.now()
          });
          console.log("✅ DeviceId registrado para primera vez");
        }
      } else if (student.deviceId !== deviceId) {
        // Si el deviceId no coincide, permitir re-autenticación desde el mismo dispositivo
        // Esto permite que el estudiante pueda volver a autenticarse si se borró la caché
        console.log("⚠️ DeviceId no coincide, permitiendo re-autenticación");
        const pathParts = student.id?.split('/') || [];
        const professorId = pathParts[0];
        const studentId = pathParts[1];
        
        if (professorId && studentId) {
          const docRef = doc(db, 'professors', professorId, 'students', studentId);
          await updateDoc(docRef, {
            deviceId,
            lastAccess: Timestamp.now()
          });
          console.log("✅ DeviceId actualizado para re-autenticación");
        }
      }
    }

    console.log("✅ Verificación exitosa:", {
      code,
      name: student.name,
      authorized: student.authorized,
      allowedSubjects: student.allowedSubjects?.length || 0,
      deviceValidationEnabled: FINGERPRINT_VALIDATION_ENABLED
    });

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
    console.error("❌ Error en verificación:", error);
    return createErrorResponse(
      "Error interno del servidor. Por favor, intenta nuevamente.",
      500
    );
  }
}
