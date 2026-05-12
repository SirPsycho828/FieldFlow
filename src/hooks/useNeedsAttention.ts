import { useEffect, useState } from 'react';
import { collectionGroup, query, where, getDocs } from 'firebase/firestore';
import { differenceInDays, differenceInHours, isToday, isTomorrow } from 'date-fns';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type { ClientDocument, MilestoneDocument } from '@/types';

export interface AttentionClient {
  client: ClientDocument;
  reasons: string[];
}

export function useNeedsAttention(
  clients: ClientDocument[],
  stalenessThresholdDays: number
) {
  const { user } = useAuth();
  const [attentionClients, setAttentionClients] = useState<AttentionClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || clients.length === 0) {
      setAttentionClients([]);
      setLoading(false);
      return;
    }

    async function compute() {
      const now = new Date();

      // Build a map of clientId -> reasons
      const reasonsMap = new Map<string, string[]>();

      // 1. Staleness check (pure frontend from the clients array)
      for (const client of clients) {
        if (!client.id) continue;
        if (client.lastActivityAt) {
          const daysSince = differenceInDays(
            now,
            client.lastActivityAt.toDate()
          );
          if (daysSince > stalenessThresholdDays) {
            const existing = reasonsMap.get(client.id) ?? [];
            existing.push(`No activity for ${daysSince} days`);
            reasonsMap.set(client.id, existing);
          }
        }
      }

      // 2. Milestone proximity: collection group query for incomplete milestones
      try {
        const milestonesQuery = query(
          collectionGroup(db, 'milestones'),
          where('completed', '==', false)
        );
        const snap = await getDocs(milestonesQuery);

        snap.docs.forEach((d) => {
          const data = { id: d.id, ...d.data() } as MilestoneDocument;

          // Extract clientId from path: users/{uid}/clients/{clientId}/milestones/{milestoneId}
          const pathSegments = d.ref.path.split('/');
          // pathSegments: ['users', uid, 'clients', clientId, 'milestones', milestoneId]
          const clientId = pathSegments[3];

          // Only care about clients in our current list
          if (!clients.find((c) => c.id === clientId)) return;

          if (!data.date) return;

          const milestoneDate = data.date.toDate();
          const hoursFromNow = differenceInHours(milestoneDate, now);

          // Within 48 hours (past or future)
          if (Math.abs(hoursFromNow) <= 48) {
            let reason: string;
            if (hoursFromNow < 0) {
              // Overdue
              const daysOverdue = Math.abs(
                differenceInDays(milestoneDate, now)
              );
              if (daysOverdue <= 0) {
                // Less than 1 day overdue — treat as overdue by 1 day
                reason = `${data.title} overdue by 1 day`;
              } else {
                reason =
                  daysOverdue === 1
                    ? `${data.title} overdue by 1 day`
                    : `${data.title} overdue by ${daysOverdue} days`;
              }
            } else if (isToday(milestoneDate)) {
              reason = `${data.title} due today`;
            } else if (isTomorrow(milestoneDate)) {
              reason = `${data.title} due tomorrow`;
            } else {
              reason = `${data.title} due in 2 days`;
            }

            const existing = reasonsMap.get(clientId) ?? [];
            existing.push(reason);
            reasonsMap.set(clientId, existing);
          }
        });
      } catch {
        // If the collection group query fails (e.g., index not ready), skip milestone proximity
      }

      // Build the result array
      const result: AttentionClient[] = [];
      for (const client of clients) {
        if (!client.id) continue;
        const reasons = reasonsMap.get(client.id);
        if (reasons && reasons.length > 0) {
          result.push({ client, reasons });
        }
      }

      setAttentionClients(result);
      setLoading(false);
    }

    compute();
  }, [user, clients, stalenessThresholdDays]);

  return { attentionClients, loading };
}
