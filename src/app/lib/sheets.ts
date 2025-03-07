import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

interface UsedCode {
  code: string;
  deviceId: string;
  browserFingerprint: string;
  fingerprintVerified: boolean;
  subjects: string[];
  lastUsed: string;
  ipAddress: string;
}

// ID de la hoja de cálculo (necesitarás crear una y poner su ID en las variables de entorno)
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;
const USED_CODES_RANGE = "UsedCodes!A2:H"; // Empezamos desde A2 para dejar espacio para los encabezados

// Función para inicializar la hoja de cálculo
async function initializeSpreadsheet(auth: OAuth2Client) {
  const sheets = google.sheets({ version: "v4", auth });

  // Verificar si la hoja "UsedCodes" existe
  try {
    await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
      ranges: ["UsedCodes!A1:A1"],
    });
  } catch (error) {
    // Si la hoja no existe, la creamos con los encabezados
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: "UsedCodes",
              },
            },
          },
        ],
      },
    });

    // Añadir encabezados
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: "UsedCodes!A1:H1",
      valueInputOption: "RAW",
      requestBody: {
        values: [
          [
            "Código",
            "Device ID",
            "Browser Fingerprint",
            "Fingerprint Verified",
            "Subjects",
            "Last Used",
            "IP Address",
            "Created At",
          ],
        ],
      },
    });
  }
}

// Función para obtener todos los códigos utilizados
export async function getUsedCodes(accessToken: string): Promise<UsedCode[]> {
  // Crear cliente OAuth2 con el token de acceso
  const auth = new OAuth2Client();
  auth.setCredentials({ access_token: accessToken });

  const sheets = google.sheets({ version: "v4", auth });

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: USED_CODES_RANGE,
    });

    const rows = response.data.values || [];
    return rows.map((row) => ({
      code: row[0],
      deviceId: row[1],
      browserFingerprint: row[2],
      fingerprintVerified: row[3] === "true",
      subjects: JSON.parse(row[4] || "[]"),
      lastUsed: row[5],
      ipAddress: row[6],
    }));
  } catch (error) {
    console.error("Error al obtener códigos usados de Google Sheets:", error);
    return [];
  }
}

// Función para guardar o actualizar un código utilizado
export async function saveUsedCode(
  accessToken: string,
  data: {
    code: string;
    deviceId: string;
    browserFingerprint: string;
    fingerprintVerified: boolean;
    subjects: string[];
    ipAddress: string;
  }
): Promise<boolean> {
  // Crear cliente OAuth2 con el token de acceso
  const auth = new OAuth2Client();
  auth.setCredentials({ access_token: accessToken });

  const sheets = google.sheets({ version: "v4", auth });
  const now = new Date().toISOString();

  try {
    // Primero, verificar si la hoja existe y crearla si es necesario
    await initializeSpreadsheet(auth);

    // Obtener todos los códigos existentes
    const existingCodes = await getUsedCodes(accessToken);
    const existingIndex = existingCodes.findIndex(
      (code) => code.code === data.code
    );

    const rowData = [
      data.code,
      data.deviceId,
      data.browserFingerprint,
      data.fingerprintVerified.toString(),
      JSON.stringify(data.subjects),
      now,
      data.ipAddress,
      existingIndex === -1 ? now : "", // Created At solo se establece para nuevos registros
    ];

    if (existingIndex === -1) {
      // Añadir nuevo código
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: USED_CODES_RANGE,
        valueInputOption: "RAW",
        requestBody: {
          values: [rowData],
        },
      });
    } else {
      // Actualizar código existente
      const rowNumber = existingIndex + 2; // +2 porque empezamos desde A2
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `UsedCodes!A${rowNumber}:H${rowNumber}`,
        valueInputOption: "RAW",
        requestBody: {
          values: [rowData],
        },
      });
    }

    return true;
  } catch (error) {
    console.error("Error al guardar código en Google Sheets:", error);
    return false;
  }
}

// Función para verificar si un código puede ser usado con un dispositivo específico
export async function verifyDeviceAccess(
  accessToken: string,
  code: string,
  browserFingerprint: string,
  ipAddress: string
): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  try {
    const usedCodes = await getUsedCodes(accessToken);
    const existingCode = usedCodes.find((c) => c.code === code);

    if (!existingCode) {
      return { allowed: true }; // Primer uso del código
    }

    // Verificar si coincide el fingerprint o la IP
    const fingerprintMatch =
      existingCode.browserFingerprint === browserFingerprint;
    const ipMatch = existingCode.ipAddress === ipAddress;

    if (fingerprintMatch || ipMatch) {
      return { allowed: true }; // Mismo dispositivo o IP
    }

    return {
      allowed: false,
      reason:
        "Este código ya está en uso en otro dispositivo. Por razones de seguridad, cada código solo puede ser utilizado en un dispositivo.",
    };
  } catch (error) {
    console.error("Error al verificar acceso:", error);
    return {
      allowed: false,
      reason: "Error al verificar el acceso. Por favor, intente nuevamente.",
    };
  }
}
