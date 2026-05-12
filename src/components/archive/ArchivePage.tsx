import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  doc,
  getDocs,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';
import { Archive, ArchiveRestore, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { db } from '@/lib/firebase';
import { deleteStorageFile } from '@/lib/storage';
import { addActivityEntry } from '@/lib/activityLog';
import { useAuth } from '@/contexts/AuthContext';
import { EmptyState } from '@/components/shared/EmptyState';
import type { ClientDocument } from '@/types';
import { STAGE_LABELS } from '@/types';

export function ArchivePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [clients, setClients] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClientDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Real-time listener for archived clients
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'users', user.uid, 'clients'),
      where('archived', '==', true),
      orderBy('updatedAt', 'desc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ClientDocument[];
        setClients(docs);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

  // Restore a client back to the pipeline
  const handleRestore = async (client: ClientDocument) => {
    if (!user || !client.id) return;
    setRestoringId(client.id);

    try {
      // Get max stageOrder in target stage to place restored client at end
      const stageQuery = query(
        collection(db, 'users', user.uid, 'clients'),
        where('stage', '==', client.stage),
        where('archived', '==', false),
        orderBy('stageOrder', 'desc')
      );

      let maxOrder = 0;
      try {
        const snap = await getDocs(stageQuery);
        if (!snap.empty) {
          maxOrder = snap.docs[0].data().stageOrder || 0;
        }
      } catch {
        // Index not ready, default to 0
      }

      const batch = writeBatch(db);
      const clientRef = doc(db, 'users', user.uid, 'clients', client.id);
      batch.update(clientRef, {
        archived: false,
        stageOrder: maxOrder + 1,
        lastActivityAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      addActivityEntry(
        batch,
        user.uid,
        client.id,
        client.name,
        'client_restored',
        'Client restored from archive'
      );
      await batch.commit();
      toast.success(`${client.name} restored to pipeline`);
    } catch {
      toast.error('Failed to restore client');
    } finally {
      setRestoringId(null);
    }
  };

  // Permanently delete a client with full cascade
  const handlePermanentDelete = async () => {
    if (!user || !deleteTarget?.id) return;
    const client = deleteTarget;
    setDeleting(true);

    try {
      const clientId = client.id!;

      // 1. Delete milestones (individual deletes trigger Cloud Function for calendar cleanup)
      const milestonesSnap = await getDocs(
        collection(db, 'users', user.uid, 'clients', clientId, 'milestones')
      );
      for (const milestoneDoc of milestonesSnap.docs) {
        await deleteDoc(milestoneDoc.ref);
      }

      // 2. Delete notes in batches
      const notesSnap = await getDocs(
        collection(db, 'users', user.uid, 'clients', clientId, 'notes')
      );
      if (!notesSnap.empty) {
        const chunks = chunkArray(notesSnap.docs, 500);
        for (const chunk of chunks) {
          const batch = writeBatch(db);
          for (const noteDoc of chunk) {
            batch.delete(noteDoc.ref);
          }
          await batch.commit();
        }
      }

      // 3. Delete files: Storage objects first, then Firestore docs
      const filesSnap = await getDocs(
        collection(db, 'users', user.uid, 'clients', clientId, 'files')
      );
      for (const fileDoc of filesSnap.docs) {
        const fileData = fileDoc.data();
        if (fileData.storagePath) {
          await deleteStorageFile(fileData.storagePath);
        }
        if (fileData.thumbnailPath) {
          await deleteStorageFile(fileData.thumbnailPath);
        }
        await deleteDoc(fileDoc.ref);
      }

      // 4. Delete invoices in batches
      const invoicesSnap = await getDocs(
        collection(db, 'users', user.uid, 'clients', clientId, 'invoices')
      );
      if (!invoicesSnap.empty) {
        const chunks = chunkArray(invoicesSnap.docs, 500);
        for (const chunk of chunks) {
          const batch = writeBatch(db);
          for (const invoiceDoc of chunk) {
            batch.delete(invoiceDoc.ref);
          }
          await batch.commit();
        }
      }

      // 5. Delete activity log entries where clientId matches
      const activitySnap = await getDocs(
        query(
          collection(db, 'users', user.uid, 'activityLog'),
          where('clientId', '==', clientId)
        )
      );
      if (!activitySnap.empty) {
        const chunks = chunkArray(activitySnap.docs, 500);
        for (const chunk of chunks) {
          const batch = writeBatch(db);
          for (const activityDoc of chunk) {
            batch.delete(activityDoc.ref);
          }
          await batch.commit();
        }
      }

      // 6. Delete the client document itself
      await deleteDoc(doc(db, 'users', user.uid, 'clients', clientId));

      toast.success('Client permanently deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete client');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-xl font-semibold">Archive</h1>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">Archive</h1>

      {clients.length === 0 ? (
        <EmptyState
          icon={Archive}
          heading="Archive is empty"
          description="Completed or inactive clients will appear here"
        />
      ) : (
        <Card>
          <CardContent className="p-0 divide-y divide-border">
            {clients.map((client) => (
              <div
                key={client.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                {/* Client info */}
                <div className="flex-1 min-w-0">
                  <button
                    className="text-sm font-medium hover:underline truncate block text-left"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    {client.name}
                  </button>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      Last active:{' '}
                      {client.lastActivityAt
                        ? format(client.lastActivityAt.toDate(), 'MMM d, yyyy')
                        : 'Unknown'}
                      {' · '}
                      Archived:{' '}
                      {client.updatedAt
                        ? format(client.updatedAt.toDate(), 'MMM d, yyyy')
                        : 'Unknown'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      · {STAGE_LABELS[client.stage]}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestore(client)}
                    disabled={restoringId === client.id}
                    className="h-8 gap-1.5"
                  >
                    {restoringId === client.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ArchiveRestore className="h-3.5 w-3.5" />
                    )}
                    Restore
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteTarget(client)}
                    disabled={restoringId === client.id}
                    className="h-8 gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Permanent delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permanently delete {deleteTarget?.name}?</DialogTitle>
            <DialogDescription>
              This will delete all notes, files, invoices, milestones, and calendar events. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handlePermanentDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting…
                </>
              ) : (
                'Delete permanently'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Split an array into chunks of maxSize
function chunkArray<T>(arr: T[], maxSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += maxSize) {
    chunks.push(arr.slice(i, i + maxSize));
  }
  return chunks;
}
