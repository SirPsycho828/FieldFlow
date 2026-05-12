import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type { MilestoneDocument } from '@/types';

export function useMilestones(clientId: string) {
  const { user } = useAuth();
  const [milestones, setMilestones] = useState<MilestoneDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !clientId) return;

    const q = query(
      collection(db, 'users', user.uid, 'clients', clientId, 'milestones'),
      orderBy('date', 'asc')
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as MilestoneDocument[];
        setMilestones(docs);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user, clientId]);

  return { milestones, loading };
}
