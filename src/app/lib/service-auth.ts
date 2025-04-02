import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

// Cliente OAuth2 para la cuenta de servicio
let serviceAuth: OAuth2Client | null = null;

// Función para obtener o crear el cliente de autenticación de servicio
export async function getServiceAuth(): Promise<OAuth2Client> {
  if (serviceAuth) {
    return serviceAuth;
  }

  // Usar las mismas credenciales que usamos para Drive
  serviceAuth = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  // Configurar las credenciales
  serviceAuth.setCredentials({
    access_token: process.env.GOOGLE_SERVICE_ACCESS_TOKEN,
    refresh_token: process.env.GOOGLE_SERVICE_REFRESH_TOKEN,
  });

  return serviceAuth;
}

// Función para obtener el cliente de Sheets
export async function getSheetsClient() {
  const auth = await getServiceAuth();
  return google.sheets({ version: "v4", auth });
}
