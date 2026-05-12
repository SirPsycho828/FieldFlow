import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type { InvoiceDocument } from '@/types';

export function useInvoices(clientId: string) {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !clientId) return;

    const q = query(
      collection(db, 'users', user.uid, 'clients', clientId, 'invoices'),
      orderBy('date', 'desc')
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as InvoiceDocument[];
        setInvoices(docs);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user, clientId]);

  return { invoices, loading };
}
