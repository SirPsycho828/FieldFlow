import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type { NoteDocument } from '@/types';

export function useNotes(clientId: string) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<NoteDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !clientId) return;

    const q = query(
      collection(db, 'users', user.uid, 'clients', clientId, 'notes'),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as NoteDocument[];
        setNotes(docs);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user, clientId]);

  return { notes, loading };
}
