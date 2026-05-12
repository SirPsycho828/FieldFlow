import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type { ClientDocument } from '@/types';

export function useClient(clientId: string) {
  const { user } = useAuth();
  const [client, setClient] = useState<ClientDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !clientId) return;

    const clientRef = doc(db, 'users', user.uid, 'clients', clientId);

    const unsub = onSnapshot(
      clientRef,
      (snap) => {
        if (!snap.exists()) {
          setError('Client not found');
          setClient(null);
        } else {
          setClient({ id: snap.id, ...snap.data() } as ClientDocument);
          setError(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user, clientId]);

  return { client, loading, error };
}
