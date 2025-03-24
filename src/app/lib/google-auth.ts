import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

// Verificar que las variables de entorno estén disponibles
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const nextAuthUrl = process.env.NEXTAUTH_URL;

// Asegurarnos de que la URL de callback sea correcta
const redirectUri =
  process.env.NODE_ENV === "production"
    ? `${
        nextAuthUrl || "https://my-video-lessons.vercel.app"
      }/api/auth/callback`
    : "http://localhost:3002/api/auth/callback";

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
  if (!clientId) {
    throw new Error(
      "GOOGLE_CLIENT_ID no está configurado. No se puede generar la URL de autenticación."
    );
  }

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
  });
}

export async function getTokens(code: string) {
  try {
    if (!code) {
      throw new Error("No se proporcionó código de autorización");
    }

    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  } catch (error: any) {
    console.error("Error al obtener tokens:", error);

    if (error.message && error.message.includes("redirect_uri_mismatch")) {
      console.error(
        "Error: La URL de redirección no coincide con las URLs autorizadas en Google Cloud Console."
      );
    }

    throw error;
  }
}

export function createDriveClient(accessToken: string) {
  const auth = new OAuth2Client();
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: "v3", auth });
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
    console.error("Error al buscar subcarpeta:", error);
    return null;
  }
}

// Cliente OAuth2 para la cuenta de servicio (solo para uso del servidor)
let serviceAuth: OAuth2Client | null = null;

// Función para obtener o crear el cliente de autenticación de servicio
export async function getServiceAuth(): Promise<OAuth2Client> {
  if (serviceAuth) {
    return serviceAuth;
  }

  const privateKey = process.env.GOOGLE_SERVICE_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n"
  );
  const serviceAccountEmail =
    "my-lessons@fluted-arch-452901-d1.iam.gserviceaccount.com";

  if (!privateKey) {
    throw new Error("GOOGLE_SERVICE_PRIVATE_KEY no está configurada");
  }

  // Crear un cliente JWT con la cuenta de servicio
  const auth = new google.auth.JWT({
    email: serviceAccountEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });

  // Autenticar el cliente
  await auth.authorize();
  serviceAuth = auth;

  return auth;
}

// Función para obtener los videos de una carpeta usando la cuenta de servicio
export async function listFolderVideos(folderId: string): Promise<any[]> {
  try {
    const auth = await getServiceAuth();
    const drive = google.drive({ version: "v3", auth });

    // Verificar que la carpeta existe y tenemos acceso
    try {
      await drive.files.get({
        fileId: folderId,
        fields: "id,name",
      });
    } catch (error) {
      console.error("Error al acceder a la carpeta:", error);
      return [];
    }

    // Obtener todas las subcarpetas de la carpeta principal
    const foldersResponse = await drive.files.list({
      q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder'`,
      fields: "files(id, name)",
      orderBy: "name",
    });

    const subfolders = foldersResponse.data.files || [];

    // Si no hay subcarpetas, buscar videos directamente en la carpeta principal
    if (subfolders.length === 0) {
      const videosResponse = await drive.files.list({
        q: `'${folderId}' in parents and mimeType contains 'video/'`,
        fields: "files(id, name, thumbnailLink, createdTime, mimeType)",
        orderBy: "name",
      });

      return [
        {
          id: folderId,
          name: "Videos",
          videos: videosResponse.data.files || [],
        },
      ];
    }

    // Si hay subcarpetas, obtener los videos de cada una
    const sections = await Promise.all(
      subfolders.map(async (folder) => {
        const videosResponse = await drive.files.list({
          q: `'${folder.id}' in parents and mimeType contains 'video/'`,
          fields: "files(id, name, thumbnailLink, createdTime, mimeType)",
          orderBy: "name",
        });

        return {
          id: folder.id,
          name: folder.name,
          videos: videosResponse.data.files || [],
        };
      })
    );

    // Filtrar secciones que tienen videos
    return sections.filter((section) => section.videos.length > 0);
  } catch (error) {
    console.error("Error al listar videos:", error);
    return [];
  }
}
