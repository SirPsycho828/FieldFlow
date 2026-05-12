import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { getCalendarClient, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from './googleClient';
import { MilestoneData, UserSettings, TokenDocument } from '../types';

const db = getFirestore();

export const onMilestoneWrite = onDocumentWritten(
  {
    document: 'users/{uid}/clients/{clientId}/milestones/{milestoneId}',
    secrets: [GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET],
    retry: true,
  },
  async (event) => {
    const { uid, clientId } = event.params;
    const before = event.data?.before?.data() as MilestoneData | undefined;
    const after = event.data?.after?.data() as MilestoneData | undefined;

    // Determine change type
    const isCreate = !before && !!after;
    const isUpdate = !!before && !!after;
    const isDelete = !!before && !after;

    // Step 1: Check if calendar sync is enabled
    const userDoc = await db.doc(`users/${uid}`).get();
    const settings = userDoc.data()?.settings as UserSettings | undefined;
    if (!settings?.calendarSyncEnabled) {
      logger.info('Calendar sync disabled, skipping');
      return;
    }

    // Step 2: Get refresh token
    const tokenDoc = await db.doc(`users/${uid}/private/tokens`).get();
    const tokenData = tokenDoc.data() as TokenDocument | undefined;
    if (!tokenData?.googleRefreshToken) {
      logger.warn('No refresh token found, skipping sync');
      return;
    }

    // Step 3: Build calendar client
    let calendar;
    try {
      calendar = getCalendarClient(tokenData.googleRefreshToken);
    } catch (error) {
      logger.error('Failed to create calendar client', error);
      return;
    }

    // Get client name for event summary
    const clientDoc = await db.doc(`users/${uid}/clients/${clientId}`).get();
    const clientName = clientDoc.data()?.name || 'Unknown Client';

    try {
      if (isCreate) {
        // Idempotency: check if calendarEventId already set
        if (after!.calendarEventId) {
          logger.info('Calendar event already exists, skipping create');
          return;
        }

        const calendarEvent = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: {
            summary: `${after!.title} - ${clientName}`,
            start: { date: formatDate(after!.date) },
            end: { date: formatDate(after!.date) },
            description: `FieldFlow - ${clientName}`,
            reminders: { useDefault: true },
          },
        });

        // Write event ID back to milestone
        await event.data?.after?.ref.update({
          calendarEventId: calendarEvent.data.id,
        });
        logger.info(`Created calendar event: ${calendarEvent.data.id}`);
      }

      if (isUpdate) {
        const eventId = before!.calendarEventId;
        if (!eventId) {
          // No existing event — create one
          const calendarEvent = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: {
              summary: `${after!.title} - ${clientName}`,
              start: { date: formatDate(after!.date) },
              end: { date: formatDate(after!.date) },
              description: `FieldFlow - ${clientName}`,
              reminders: { useDefault: true },
            },
          });
          await event.data?.after?.ref.update({
            calendarEventId: calendarEvent.data.id,
          });
          return;
        }

        try {
          await calendar.events.update({
            calendarId: 'primary',
            eventId,
            requestBody: {
              summary: `${after!.title} - ${clientName}`,
              start: { date: formatDate(after!.date) },
              end: { date: formatDate(after!.date) },
              description: `FieldFlow - ${clientName}`,
              reminders: { useDefault: true },
            },
          });
          logger.info(`Updated calendar event: ${eventId}`);
        } catch (error: any) {
          if (error.code === 404) {
            // Event deleted from calendar, create new one
            const calendarEvent = await calendar.events.insert({
              calendarId: 'primary',
              requestBody: {
                summary: `${after!.title} - ${clientName}`,
                start: { date: formatDate(after!.date) },
                end: { date: formatDate(after!.date) },
                description: `FieldFlow - ${clientName}`,
                reminders: { useDefault: true },
              },
            });
            await event.data?.after?.ref.update({
              calendarEventId: calendarEvent.data.id,
            });
          } else {
            throw error;
          }
        }
      }

      if (isDelete) {
        const eventId = before!.calendarEventId;
        if (!eventId) return;

        try {
          await calendar.events.delete({
            calendarId: 'primary',
            eventId,
          });
          logger.info(`Deleted calendar event: ${eventId}`);
        } catch (error: any) {
          if (error.code === 404) {
            logger.info('Calendar event already deleted');
          } else {
            throw error;
          }
        }
      }
    } catch (error: any) {
      // Handle token revocation
      if (error.message?.includes('invalid_grant') || error.code === 401) {
        logger.warn('Token revoked, disabling calendar sync');
        await db.doc(`users/${uid}/private/tokens`).delete();
        await db.doc(`users/${uid}`).update({
          'settings.calendarSyncEnabled': false,
          hasGoogleToken: false,
        });
        return;
      }
      // Let other errors trigger retry
      throw error;
    }
  }
);

function formatDate(timestamp: FirebaseFirestore.Timestamp): string {
  const date = timestamp.toDate();
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}
