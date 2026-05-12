import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type { FileDocument, FileFolder } from '@/types';

export function useFiles(clientId: string) {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !clientId) return;

    const q = query(
      collection(db, 'users', user.uid, 'clients', clientId, 'files'),
      orderBy('uploadedAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setFiles(snap.docs.map(d => ({ id: d.id, ...d.data() } as FileDocument)));
      setLoading(false);
    });

    return () => unsub();
  }, [user, clientId]);

  // Group by folder
  const filesByFolder: Record<FileFolder, FileDocument[]> = {
    photos: files.filter(f => f.folder === 'photos'),
    documents: files.filter(f => f.folder === 'documents'),
    designs: files.filter(f => f.folder === 'designs'),
  };

  return { files, filesByFolder, loading };
}
