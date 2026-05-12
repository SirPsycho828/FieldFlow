import { useEffect, useState } from 'react';
import {
  collection,
  getCountFromServer,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { format } from 'date-fns';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';
import type { ClientDocument, InvoiceDocument, MilestoneDocument } from '@/types';

interface ClientSummaryStripProps {
  client: ClientDocument;
}

interface StripData {
  noteCount: number;
  fileCount: number;
  invoiceTotal: number;
  nextMilestone: { title: string; date: Date } | null;
}

export function ClientSummaryStrip({ client }: ClientSummaryStripProps) {
  const { user } = useAuth();
  const [data, setData] = useState<StripData | null>(null);

  useEffect(() => {
    if (!user || !client.id) return;

    async function load() {
      if (!user || !client.id) return;

      const basePath = `users/${user.uid}/clients/${client.id}`;

      // Fetch counts and sums in parallel
      const [noteSnap, fileSnap, invoiceSnap, milestoneSnap] = await Promise.all([
        getCountFromServer(collection(db, basePath, 'notes')),
        getCountFromServer(collection(db, basePath, 'files')),
        getDocs(collection(db, basePath, 'invoices')),
        getDocs(
          query(
            collection(db, basePath, 'milestones'),
            where('completed', '==', false),
            orderBy('date', 'asc')
          )
        ),
      ]);

      const invoiceTotal = invoiceSnap.docs.reduce((sum, d) => {
        const inv = d.data() as InvoiceDocument;
        return sum + (inv.total || 0);
      }, 0);

      let nextMilestone: { title: string; date: Date } | null = null;
      const now = new Date();
      for (const d of milestoneSnap.docs) {
        const m = d.data() as MilestoneDocument;
        const mDate = m.date.toDate();
        if (mDate >= now) {
          nextMilestone = { title: m.title, date: mDate };
          break;
        }
      }

      setData({
        noteCount: noteSnap.data().count,
        fileCount: fileSnap.data().count,
        invoiceTotal,
        nextMilestone,
      });
    }

    load().catch(() => {});
  }, [user, client.id]);

  const createdDate = client.createdAt
    ? format(client.createdAt.toDate(), 'MMM d, yyyy')
    : '—';

  const items = [
    `Created: ${createdDate}`,
    `Notes: ${data?.noteCount ?? '…'}`,
    `Files: ${data?.fileCount ?? '…'}`,
    `Invoices: ${data !== null ? formatCurrency(data.invoiceTotal) : '…'}`,
    data?.nextMilestone
      ? `Next: ${data.nextMilestone.title} (${format(data.nextMilestone.date, 'MMM d')})`
      : null,
  ].filter(Boolean) as string[];

  return (
    <div className="flex items-center gap-0 overflow-x-auto whitespace-nowrap py-1">
      {items.map((item, i) => (
        <span key={i} className="flex items-center text-xs text-muted-foreground">
          {i > 0 && <span className="mx-2 select-none">|</span>}
          {item}
        </span>
      ))}
    </div>
  );
}
