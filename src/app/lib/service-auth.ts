import { google } from "googleapis";
import { OAuth2Client, JWT } from "google-auth-library";

// Cliente OAuth2 para la cuenta de servicio
let serviceAuth: JWT | OAuth2Client | null = null;

// Función para obtener o crear el cliente de autenticación de servicio
export async function getServiceAuth(): Promise<JWT | OAuth2Client> {
  if (serviceAuth) {
    return serviceAuth;
  }

  try {
    // Usar el método JWT que parece estar funcionando en verify/route.ts
    const privateKey = process.env.GOOGLE_SERVICE_PRIVATE_KEY?.replace(
      /\\n/g,
      "\n"
    );

    if (!privateKey) {
      throw new Error("GOOGLE_SERVICE_PRIVATE_KEY no está configurado");
    }

    const SERVICE_ACCOUNT_EMAIL =
      "my-lessons@fluted-arch-452901-d1.iam.gserviceaccount.com";
    const SCOPES = [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.readonly",
    ];

    console.log("Inicializando JWT con cuenta de servicio:", {
      email: SERVICE_ACCOUNT_EMAIL,
      keyLength: privateKey.length,
      hasBeginMarker: privateKey.includes("-----BEGIN PRIVATE KEY-----"),
      hasEndMarker: privateKey.includes("-----END PRIVATE KEY-----"),
    });

    const auth = new JWT({
      email: SERVICE_ACCOUNT_EMAIL,
      key: privateKey,
      scopes: SCOPES,
    });

    // Verificamos que la autenticación funcione
    await auth.authorize();

    serviceAuth = auth;
    return auth;
  } catch (error) {
    console.error("Error al autenticar con JWT:", error);

    // Como fallback, intentamos con OAuth2Client
    console.log("Intentando autenticación con OAuth2Client como fallback");

    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: process.env.GOOGLE_SERVICE_ACCESS_TOKEN,
      refresh_token: process.env.GOOGLE_SERVICE_REFRESH_TOKEN,
    });

    serviceAuth = oauth2Client;
    return oauth2Client;
  }
}

// Función para obtener el cliente de Sheets
export async function getSheetsClient() {
  const auth = await getServiceAuth();
  return google.sheets({ version: "v4", auth });
}
