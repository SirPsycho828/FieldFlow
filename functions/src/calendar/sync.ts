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

    const isCreate = !before && !!after;
    const isUpdate = !!before && !!after;
    const isDelete = !!before && !after;

    // Check if calendar sync is enabled
    const userDoc = await db.doc(`users/${uid}`).get();
    const settings = userDoc.data()?.settings as UserSettings | undefined;
    if (!settings?.calendarSyncEnabled) {
      logger.info('Calendar sync disabled, skipping');
      return;
    }

    // Get refresh token
    const tokenDoc = await db.doc(`users/${uid}/private/tokens`).get();
    const tokenData = tokenDoc.data() as TokenDocument | undefined;
    if (!tokenData?.googleRefreshToken) {
      logger.warn('No refresh token found, skipping sync');
      return;
    }

    const calendar = getCalendarClient(tokenData.googleRefreshToken);

    // Get client name for event summary
    const clientDoc = await db.doc(`users/${uid}/clients/${clientId}`).get();
    const clientName = clientDoc.data()?.name || 'Unknown Client';

    function buildEvent(milestone: MilestoneData) {
      return {
        summary: `${milestone.title} - ${clientName}`,
        start: { date: formatDate(milestone.date) },
        end: { date: formatDate(milestone.date) },
        description: `FieldFlow - ${clientName}`,
        reminders: { useDefault: true },
      };
    }

    try {
      if (isCreate) {
        if (after!.calendarEventId) {
          logger.info('Calendar event already exists, skipping create');
          return;
        }

        const result = await calendar.insertEvent(buildEvent(after!));
        await event.data?.after?.ref.update({ calendarEventId: result.id });
        logger.info(`Created calendar event: ${result.id}`);
      }

      if (isUpdate) {
        const eventId = before!.calendarEventId;
        if (!eventId) {
          const result = await calendar.insertEvent(buildEvent(after!));
          await event.data?.after?.ref.update({ calendarEventId: result.id });
          return;
        }

        try {
          await calendar.updateEvent(eventId, buildEvent(after!));
          logger.info(`Updated calendar event: ${eventId}`);
        } catch (error: any) {
          if (error.code === 404) {
            const result = await calendar.insertEvent(buildEvent(after!));
            await event.data?.after?.ref.update({ calendarEventId: result.id });
          } else {
            throw error;
          }
        }
      }

      if (isDelete) {
        const eventId = before!.calendarEventId;
        if (!eventId) return;

        try {
          await calendar.deleteEvent(eventId);
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
      if (error.message?.includes('invalid_grant') || error.code === 401) {
        logger.warn('Token revoked, disabling calendar sync');
        await db.doc(`users/${uid}/private/tokens`).delete();
        await db.doc(`users/${uid}`).update({
          'settings.calendarSyncEnabled': false,
          hasGoogleToken: false,
        });
        return;
      }
      throw error;
    }
  }
);

function formatDate(timestamp: FirebaseFirestore.Timestamp): string {
  const date = timestamp.toDate();
  return date.toISOString().split('T')[0];
}
