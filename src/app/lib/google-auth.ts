import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3000/api/auth/callback'
);

export const scopes = [
  'https://www.googleapis.com/auth/drive.readonly',
];

export function getAuthUrl(): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });
}

export async function getTokens(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export function createDriveClient(accessToken: string) {
  const auth = new OAuth2Client();
  auth.setCredentials({ access_token: accessToken });
  
  return google.drive({ version: 'v3', auth });
}

export async function listFolderVideos(folderId: string, driveClient: any): Promise<any[]> {
  try {
    const response = await driveClient.files.list({
      q: `'${folderId}' in parents and mimeType contains 'video/'`,
      fields: 'files(id, name, thumbnailLink, createdTime)',
      orderBy: 'createdTime desc',
    });

    return response.data.files || [];
  } catch (error) {
    console.error('Error listing folder videos:', error);
    return [];
  }
} 