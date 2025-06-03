import { NextRequest, NextResponse } from "next/server";
import { google, sheets_v4 } from "googleapis";
import { JWT } from "google-auth-library";
import students from "@/app/data/students.json";
import studentsBenjaYSonia from "@/app/data/studentsBenjaYSonia.json";
import { Student } from "@/app/types";
import { toast } from "react-hot-toast";

// ID de la hoja de cálculo
const SPREADSHEET_ID = "16coLs8qv4BU_CwphqlvE_LWNEAV50nIQ8VaM2SdsuRs";
const SHEET_NAME = "UsedCodes";

// Configuración de la cuenta de servicio
const SERVICE_ACCOUNT_EMAIL =
  "my-lessons@fluted-arch-452901-d1.iam.gserviceaccount.com";
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

// Variable para activar/desactivar la validación de dispositivo
const FINGERPRINT_VALIDATION_ENABLED =
  process.env.FINGERPRINT_VALIDATION_ENABLED === "true";

// Rate limiting
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const MAX_REQUESTS_PER_WINDOW = 5;
const requestCounts = new Map<string, { count: number; timestamp: number }>();

// Crear cliente JWT para la cuenta de servicio
const privateKey = process.env.GOOGLE_SERVICE_PRIVATE_KEY?.replace(
  /\\n/g,
  "\n"
);

// Crear cliente JWT y Sheets solo si la validación está activada
let auth: JWT | undefined;
let sheets: sheets_v4.Sheets | undefined;

if (FINGERPRINT_VALIDATION_ENABLED) {
  try {
    auth = new JWT({
      email: SERVICE_ACCOUNT_EMAIL,
      key: privateKey,
      scopes: SCOPES,
    });

    sheets = google.sheets({ version: "v4", auth });
  } catch (error) {
    console.error("Error al inicializar Google Sheets:", error);
    // Si hay error en la inicialización, desactivar la validación
    console.log(
      "Desactivando validación de dispositivo debido a error de inicialización"
    );
  }
}

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

async function checkCodeInSheet(code: string, deviceId: string) {
  if (!FINGERPRINT_VALIDATION_ENABLED || !sheets) {
    return { valid: true, firstTime: true };
  }

  try {
    console.log("=== DEBUG: Iniciando verificación de código ===");
    console.log("Usando hoja de cálculo:", SPREADSHEET_ID);

    // Verificar si la hoja existe
    try {
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
      });
      console.log("Hoja de cálculo encontrada:", {
        title: spreadsheet.data.properties?.title,
        id: SPREADSHEET_ID,
        sheets: spreadsheet.data.sheets?.map((sheet: any) => ({
          title: sheet.properties?.title,
          sheetId: sheet.properties?.sheetId,
        })),
      });
    } catch (error: any) {
      console.error("Error detallado al acceder a la hoja:", {
        message: error.message,
        code: error.code,
        status: error.status,
        details: error.errors,
      });

      if (error.message.includes("permission")) {
        throw new Error(
          "No tienes permisos para acceder a la hoja de control de acceso"
        );
      }
      // Si hay error al acceder a la hoja, permitir el acceso
      console.log("Error al acceder a la hoja, permitiendo acceso");
      return { valid: true, firstTime: true };
    }

    // Buscar el código en la hoja
    console.log("Intentando leer valores de la hoja...");
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "'Hoja 1'!A:B",
    });

    const rows = response.data.values || [];
    console.log("Filas encontradas:", rows.length);

    const codeRow = rows.find((row: any) => row[0] === code);

    if (!codeRow) {
      console.log("Código no encontrado, registrando primera vez");
      // Código no usado, registrarlo
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "'Hoja 1'!A:D",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[code, deviceId, new Date().toISOString(), "Primera vez"]],
        },
      });
      return { valid: true, firstTime: true };
    }

    // Código ya usado, verificar deviceId
    const savedDeviceId = codeRow[1];
    console.log("Comparando deviceIds:", {
      saved: savedDeviceId,
      current: deviceId,
    });

    if (savedDeviceId === deviceId) {
      console.log("DeviceId coincide");
      return { valid: true, firstTime: false };
    }

    console.log("DeviceId no coincide, registrando intento fallido");

    // DeviceId diferente, registrar intento fallido
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "'Hoja 1'!A:D",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            code,
            deviceId,
            new Date().toISOString(),
            "Intento fallido - DeviceId diferente",
          ],
        ],
      },
    });

    return { valid: false, firstTime: false };
  } catch (error) {
    console.error("Error checking code in sheet:", error);
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



    // Verificar que el código existe y está autorizado
    const student =
      (students as Student[]).find((s) => s.code === code) ||
      (studentsBenjaYSonia as Student[]).find((s) => s.code === code);
    if (!student || !student.authorized) {
      console.log("Código inválido o no autorizado:", code);
      return NextResponse.json(
        {
          success: false,
          message: "El código ingresado no es válido o no está autorizado",
        },
        { status: 403 }
      );
    }

    let valid = true;
    let firstTime = true;

    if (FINGERPRINT_VALIDATION_ENABLED) {
      // Verificar el código en la hoja de cálculo si la validación está activada
      const result = await checkCodeInSheet(code, deviceId);
      valid = result.valid;
      firstTime = result.firstTime;

      if (!valid) {
        console.log("Código ya en uso en otro dispositivo:", code);
        return NextResponse.json(
          {
            success: false,
            message:
              "Este código ya está siendo usado en otro dispositivo. Por favor, utiliza el mismo dispositivo que usaste para ingresar por primera vez.",
          },
          { status: 403 }
        );
      }
    } else {
      console.log("Validación de dispositivo desactivada, acceso concedido");
    }

    console.log(
      `Verificación exitosa (${
        FINGERPRINT_VALIDATION_ENABLED ? "Validación activa" : "Modo temporal"
      }):`,
      {
        code,
        name: student.name,
        subjects: student.subjects,
        firstTime,
      }
    );

    // Configurar la respuesta con las cookies
    const response = NextResponse.json({
      success: true,
      firstTime,
      message: `¡Bienvenido! (${
        FINGERPRINT_VALIDATION_ENABLED
          ? "Verificación completa"
          : "Verificación temporal"
      })`,
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
