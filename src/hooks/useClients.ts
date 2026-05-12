import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type { ClientDocument, Stage } from '@/types';
import { STAGES } from '@/types';

export function useClients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'users', user.uid, 'clients'),
      where('archived', '==', false)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ClientDocument[];
        setClients(docs);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

  // Group by stage and sort by stageOrder
  const clientsByStage = {} as Record<Stage, ClientDocument[]>;
  for (const stage of STAGES) {
    clientsByStage[stage] = clients
      .filter((c) => c.stage === stage)
      .sort((a, b) => (a.stageOrder || 0) - (b.stageOrder || 0));
  }

  return { clients, clientsByStage, loading, error };
}
