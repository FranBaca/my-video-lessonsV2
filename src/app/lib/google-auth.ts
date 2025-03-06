import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

// Verificar que las variables de entorno estén disponibles
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const nextAuthUrl = process.env.NEXTAUTH_URL;

// Logs para depuración
console.log("Variables de entorno para OAuth:", {
  NODE_ENV: process.env.NODE_ENV,
  GOOGLE_CLIENT_ID: clientId
    ? `${clientId.substring(0, 10)}...`
    : "No disponible",
  GOOGLE_CLIENT_SECRET: clientSecret ? "Presente" : "No disponible",
  NEXTAUTH_URL: nextAuthUrl || "No disponible",
});

// Asegurarnos de que la URL de callback sea correcta
const redirectUri =
  process.env.NODE_ENV === "production"
    ? `${
        nextAuthUrl || "https://my-video-lessons.vercel.app"
      }/api/auth/callback`
    : "http://localhost:3001/api/auth/callback";

console.log("URL de redirección configurada:", redirectUri);

// Verificar si tenemos las credenciales necesarias
if (!clientId) {
  console.error("ERROR: GOOGLE_CLIENT_ID no está configurado");
}

if (!clientSecret) {
  console.error("ERROR: GOOGLE_CLIENT_SECRET no está configurado");
}

// Crear el cliente OAuth2
const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);

export const scopes = ["https://www.googleapis.com/auth/drive.readonly"];

export function getAuthUrl(): string {
  console.log("Generando URL de autenticación con redirectUri:", redirectUri);

  if (!clientId) {
    throw new Error(
      "GOOGLE_CLIENT_ID no está configurado. No se puede generar la URL de autenticación."
    );
  }

  const scopes = ["https://www.googleapis.com/auth/drive.readonly"];
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
  });

  return url;
}

export async function getTokens(code: string) {
  try {
    console.log("Obteniendo tokens con código de autorización");

    if (!code) {
      throw new Error("No se proporcionó código de autorización");
    }

    console.log(
      "URL de redirección utilizada para obtener tokens:",
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);
    console.log("Tokens obtenidos correctamente");

    return tokens;
  } catch (error: any) {
    console.error("Error al obtener tokens:", error);

    // Proporcionar información más detallada sobre el error
    if (error.message && error.message.includes("redirect_uri_mismatch")) {
      console.error(`
        ERROR DE REDIRECT_URI_MISMATCH:
        La URL de redirección configurada (${redirectUri}) no coincide con las URLs autorizadas en Google Cloud Console.
        Por favor, verifica que esta URL esté exactamente configurada en la consola de Google Cloud.
      `);
    }

    throw error;
  }
}

export function createDriveClient(accessToken: string) {
  console.log(
    `Creando cliente de Drive con token: ${accessToken.substring(0, 10)}...`
  );

  const auth = new OAuth2Client();
  auth.setCredentials({ access_token: accessToken });

  const drive = google.drive({ version: "v3", auth });

  // Verificar que el cliente funciona correctamente
  drive.about
    .get({
      fields: "user",
    })
    .then((response) => {
      console.log(
        `Cliente de Drive creado correctamente. Usuario: ${
          response.data.user?.displayName || "Desconocido"
        }`
      );
    })
    .catch((error) => {
      console.error("Error al verificar el cliente de Drive:", error);
    });

  return drive;
}

export async function findSubfolderByName(
  parentFolderId: string,
  folderName: string,
  driveClient: any
): Promise<string | null> {
  try {
    const response = await driveClient.files.list({
      q: `'${parentFolderId}' in parents and name = '${folderName.toUpperCase()}' and mimeType = 'application/vnd.google-apps.folder'`,
      fields: "files(id, name)",
    });

    const folders = response.data.files || [];
    if (folders.length > 0) {
      return folders[0].id;
    }
    return null;
  } catch (error) {
    console.error("Error finding subfolder:", error);
    return null;
  }
}

export async function listFolderVideos(
  folderId: string,
  driveClient: any
): Promise<any[]> {
  try {
    console.log(`Buscando videos en la carpeta con ID: ${folderId}`);

    // Primero verificamos si la carpeta existe
    try {
      const folderCheck = await driveClient.files.get({
        fileId: folderId,
        fields: "id,name,mimeType",
      });

      console.log(
        `Carpeta encontrada: ${folderCheck.data.name} (${folderCheck.data.id})`
      );
    } catch (folderError) {
      console.error(`Error al verificar la carpeta ${folderId}:`, folderError);
      console.log(
        "Es posible que la carpeta no exista o no tengas permisos para acceder a ella."
      );
      return [];
    }

    // Ahora buscamos los videos en la carpeta
    const query = `'${folderId}' in parents and mimeType contains 'video/'`;
    console.log(`Ejecutando consulta: ${query}`);

    const response = await driveClient.files.list({
      q: query,
      fields: "files(id, name, thumbnailLink, createdTime)",
      orderBy: "createdTime desc",
    });

    const files = response.data.files || [];
    console.log(
      `Se encontraron ${files.length} videos en la carpeta ${folderId}`
    );

    return files;
  } catch (error) {
    console.error("Error listing folder videos:", error);
    return [];
  }
}
