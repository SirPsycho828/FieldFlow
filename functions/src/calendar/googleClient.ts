import { OAuth2Client } from 'google-auth-library';
import { defineSecret } from 'firebase-functions/params';

export const GOOGLE_CLIENT_ID = defineSecret('GOOGLE_CLIENT_ID');
export const GOOGLE_CLIENT_SECRET = defineSecret('GOOGLE_CLIENT_SECRET');

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

export function createOAuth2Client(refreshToken: string): OAuth2Client {
  const client = new OAuth2Client(
    GOOGLE_CLIENT_ID.value(),
    GOOGLE_CLIENT_SECRET.value(),
    'https://fieldflow-crm-app.web.app'
  );
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

export interface CalendarEvent {
  summary: string;
  start: { date: string };
  end: { date: string };
  description: string;
  reminders: { useDefault: boolean };
}

export interface CalendarClient {
  insertEvent(event: CalendarEvent): Promise<{ id: string }>;
  updateEvent(eventId: string, event: CalendarEvent): Promise<void>;
  deleteEvent(eventId: string): Promise<void>;
}

export function getCalendarClient(refreshToken: string): CalendarClient {
  const auth = createOAuth2Client(refreshToken);

  async function getHeaders() {
    const token = await auth.getAccessToken();
    return {
      Authorization: `Bearer ${token.token}`,
      'Content-Type': 'application/json',
    };
  }

  return {
    async insertEvent(event: CalendarEvent) {
      const headers = await getHeaders();
      const res = await fetch(`${CALENDAR_API}/calendars/primary/events`, {
        method: 'POST',
        headers,
        body: JSON.stringify(event),
      });
      if (!res.ok) {
        const err: any = new Error(`Calendar API insert failed: ${res.status}`);
        err.code = res.status;
        throw err;
      }
      const data = await res.json();
      return { id: data.id };
    },

    async updateEvent(eventId: string, event: CalendarEvent) {
      const headers = await getHeaders();
      const res = await fetch(`${CALENDAR_API}/calendars/primary/events/${encodeURIComponent(eventId)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(event),
      });
      if (!res.ok) {
        const err: any = new Error(`Calendar API update failed: ${res.status}`);
        err.code = res.status;
        throw err;
      }
    },

    async deleteEvent(eventId: string) {
      const headers = await getHeaders();
      const res = await fetch(`${CALENDAR_API}/calendars/primary/events/${encodeURIComponent(eventId)}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok && res.status !== 404) {
        const err: any = new Error(`Calendar API delete failed: ${res.status}`);
        err.code = res.status;
        throw err;
      }
      if (res.status === 404) {
        const err: any = new Error('Not Found');
        err.code = 404;
        throw err;
      }
    },
  };
}
