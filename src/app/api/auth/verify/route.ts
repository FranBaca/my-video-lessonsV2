import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { JWT } from "google-auth-library";
import students from "@/app/data/students.json";
import { Student } from "@/app/types";

// ID de la hoja de cálculo
const SPREADSHEET_ID = "16coLs8qv4BU_CwphqlvE_LWNEAV50nIQ8VaM2SdsuRs";
const SHEET_NAME = "UsedCodes";

// Configuración de la cuenta de servicio
const SERVICE_ACCOUNT_EMAIL =
  "my-lessons@fluted-arch-452901-d1.iam.gserviceaccount.com";
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

// Crear cliente JWT para la cuenta de servicio
const privateKey = process.env.GOOGLE_SERVICE_PRIVATE_KEY?.replace(
  /\\n/g,
  "\n"
);
console.log("DEBUG - Private key processing:", {
  originalLength: process.env.GOOGLE_SERVICE_PRIVATE_KEY?.length || 0,
  processedLength: privateKey?.length || 0,
  hasBeginMarker: privateKey?.includes("-----BEGIN PRIVATE KEY-----"),
  hasEndMarker: privateKey?.includes("-----END PRIVATE KEY-----"),
});

const auth = new JWT({
  email: SERVICE_ACCOUNT_EMAIL,
  key: privateKey,
  scopes: SCOPES,
});

// Para debugging
console.log("DEBUG - Service account configuration:", {
  email: SERVICE_ACCOUNT_EMAIL,
  keyLength: process.env.GOOGLE_SERVICE_PRIVATE_KEY?.length || 0,
  scopes: SCOPES,
});

// Crear cliente de Sheets
const sheets = google.sheets({ version: "v4", auth });

async function checkCodeInSheet(code: string, fingerprint: string) {
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
        sheets: spreadsheet.data.sheets?.map((sheet) => ({
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
      throw new Error("No se pudo acceder a la hoja de control de acceso");
    }

    // Buscar el código en la hoja
    console.log("Intentando leer valores de la hoja...");
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "'Hoja 1'!A:B", // Usando el nombre correcto de la hoja
    });

    const rows = response.data.values || [];
    console.log("Filas encontradas:", rows.length);

    const codeRow = rows.find((row) => row[0] === code);

    if (!codeRow) {
      console.log("Código no encontrado, registrando primera vez");
      // Código no usado, registrarlo
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "'Hoja 1'!A:D",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [
            [code, fingerprint, new Date().toISOString(), "Primera vez"],
          ],
        },
      });
      return { valid: true, firstTime: true };
    }

    // Código ya usado, verificar fingerprint
    const savedFingerprint = codeRow[1];
    console.log("Comparando fingerprints:", {
      saved: savedFingerprint.substring(0, 10) + "...",
      current: fingerprint.substring(0, 10) + "...",
    });

    if (savedFingerprint === fingerprint) {
      console.log("Fingerprint coincide");
      return { valid: true, firstTime: false };
    }

    console.log("Fingerprint no coincide, registrando intento fallido");
    // Fingerprint diferente, registrar intento fallido
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "'Hoja 1'!A:D",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            code,
            fingerprint,
            new Date().toISOString(),
            "Intento fallido - Fingerprint diferente",
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

    // Verificar que el código existe y está autorizado
    const student = (students as Student[]).find((s) => s.code === code);
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

    // Verificar el código en la hoja de cálculo
    const { valid, firstTime } = await checkCodeInSheet(code, fingerprint);

    if (!valid) {
      console.log("Código ya en uso en otro dispositivo:", code);
      return NextResponse.json(
        {
          success: false,
          message: "Este código ya está siendo usado en otro dispositivo",
        },
        { status: 403 }
      );
    }

    console.log("Verificación exitosa:", {
      code,
      name: student.name,
      subjects: student.subjects,
      firstTime,
    });

    // Configurar la respuesta con las cookies
    const response = NextResponse.json({
      success: true,
      firstTime,
      message: firstTime ? "¡Bienvenido!" : "¡Bienvenido de nuevo!",
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
