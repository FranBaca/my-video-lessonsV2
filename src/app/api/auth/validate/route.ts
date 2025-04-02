import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import students from "@/app/data/students.json";
import { Student } from "@/app/types";
import { google } from "googleapis";
import { JWT } from "google-auth-library";

// Función para obtener la IP del cliente
function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return request.ip || "unknown";
}

// Configuración de la cuenta de servicio para Google Sheets
const SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_ID ||
  "16coLs8qv4BU_CwphqlvE_LWNEAV50nIQ8VaM2SdsuRs";
const SERVICE_ACCOUNT_EMAIL =
  "my-lessons@fluted-arch-452901-d1.iam.gserviceaccount.com";
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

// Inicializar cliente de Google Sheets con autenticación JWT
async function getAuthClient() {
  const privateKey = process.env.GOOGLE_SERVICE_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n"
  );

  if (!privateKey) {
    throw new Error("GOOGLE_SERVICE_PRIVATE_KEY no está configurado");
  }

  const auth = new JWT({
    email: SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: SCOPES,
  });

  await auth.authorize();
  return auth;
}

// Verificar si el código ya está en uso y validar el fingerprint
async function verifyCodeFingerprint(code: string, fingerprint: string) {
  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: "v4", auth });

    // Obtener datos de la hoja
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "UsedCodes!A2:C",
    });

    const rows = response.data.values || [];
    const existingCode = rows.find((row) => row[0] === code);

    if (!existingCode) {
      // Código no usado, registrarlo
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "UsedCodes!A:C",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[code, fingerprint, new Date().toISOString()]],
        },
      });
      return { valid: true, firstTime: true };
    }

    // Código ya usado, verificar fingerprint
    const savedFingerprint = existingCode[1];

    if (savedFingerprint === fingerprint) {
      // Actualizar fecha de último acceso
      const rowIndex = rows.findIndex((row) => row[0] === code) + 2; // +2 porque empezamos desde A2

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `UsedCodes!C${rowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[new Date().toISOString()]],
        },
      });

      return { valid: true, firstTime: false };
    }

    // Fingerprint diferente, acceso no permitido
    return {
      valid: false,
      reason:
        "Este código ya está en uso en otro dispositivo. Por razones de seguridad, cada código solo puede ser utilizado en un dispositivo.",
    };
  } catch (error) {
    console.error("Error verificando código en Google Sheets:", error);
    // Si hay error de verificación, permitimos el acceso pero registramos el error
    return { valid: true, firstTime: true, error: true };
  }
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

    // Buscar estudiante con el código proporcionado
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

    // Verificar si el código ya está en uso en otro dispositivo
    const verification = await verifyCodeFingerprint(code, browserFingerprint);

    if (!verification.valid) {
      return NextResponse.json(
        {
          success: false,
          message: verification.reason || "No autorizado para usar este código",
        },
        { status: 403 }
      );
    }

    // Si llegamos aquí, la autenticación es exitosa
    // Configurar cookies para mantener la sesión
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as "strict",
      maxAge: rememberSession ? 30 * 24 * 60 * 60 : 24 * 60 * 60, // 30 días o 1 día
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

    // Almacenar el fingerprint en una cookie
    if (browserFingerprint) {
      response.cookies.set("browser_fingerprint", browserFingerprint, {
        ...cookieOptions,
        httpOnly: false, // No es httpOnly para acceso JavaScript
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
