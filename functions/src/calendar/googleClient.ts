import { google } from 'googleapis';
import { defineSecret } from 'firebase-functions/params';

export const GOOGLE_CLIENT_ID = defineSecret('GOOGLE_CLIENT_ID');
export const GOOGLE_CLIENT_SECRET = defineSecret('GOOGLE_CLIENT_SECRET');

export function createOAuth2Client(refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID.value(),
    GOOGLE_CLIENT_SECRET.value(),
    'https://fieldflow-app.web.app' // redirect URI placeholder
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

export function getCalendarClient(refreshToken: string) {
  const auth = createOAuth2Client(refreshToken);
  return google.calendar({ version: 'v3', auth });
}
