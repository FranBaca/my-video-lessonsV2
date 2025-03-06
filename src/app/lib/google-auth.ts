import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

// Asegurarnos de que la URL de callback sea correcta
const redirectUri =
  process.env.NODE_ENV === "production"
    ? process.env.NEXTAUTH_URL + "/api/auth/callback"
    : "http://localhost:3001/api/auth/callback";

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  redirectUri
);

export const scopes = ["https://www.googleapis.com/auth/drive.readonly"];

export function getAuthUrl(): string {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
  });
}

export async function getTokens(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
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
