import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  writeBatch,
  doc,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import {
  ArrowLeft,
  MoreVertical,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useClient } from '@/hooks/useClient';
import { StageSelector } from '@/components/shared/StageSelector';
import { ClientSummaryStrip } from '@/components/client/ClientSummaryStrip';
import { OverviewTab } from '@/components/client/OverviewTab';
import { NotesTab } from '@/components/client/NotesTab';
import { FilesTab } from '@/components/client/FilesTab';
import { InvoicesTab } from '@/components/client/InvoicesTab';
import { MilestonesTab } from '@/components/client/MilestonesTab';

function chunkArray<T>(arr: T[], maxSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += maxSize) {
    chunks.push(arr.slice(i, i + maxSize));
  }
  return chunks;
}

export function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { client, loading, error } = useClient(clientId ?? '');

  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Archived-client actions
  const [restoring, setRestoring] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleArchive = async () => {
    if (!user || !client?.id) return;
    setArchiving(true);
    try {
      const batch = writeBatch(db);
      const clientRef = doc(db, 'users', user.uid, 'clients', client.id);
      batch.update(clientRef, {
        archived: true,
        lastActivityAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      addActivityEntry(batch, user.uid, client.id, client.name, 'client_archived', 'Client archived');
      await batch.commit();
      toast.success('Client archived');
      navigate('/pipeline');
    } catch {
      toast.error('Failed to archive client');
      setArchiving(false);
    }
    setArchiveDialogOpen(false);
  };

  const handleRestore = async () => {
    if (!user || !client?.id) return;
    setRestoring(true);
    try {
      // Get max stageOrder in target stage
      const stageQuery = query(
        collection(db, 'users', user.uid, 'clients'),
        where('stage', '==', client.stage),
        where('archived', '==', false),
        orderBy('stageOrder', 'desc')
      );
      let maxOrder = 0;
      try {
        const snap = await getDocs(stageQuery);
        if (!snap.empty) maxOrder = snap.docs[0].data().stageOrder || 0;
      } catch {
        // Index not ready
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
      navigate('/pipeline');
    } catch {
      toast.error('Failed to restore client');
      setRestoring(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!user || !client?.id) return;
    setDeleting(true);
    const clientId = client.id;

    try {
      // 1. Delete milestones individually (triggers Cloud Function for calendar cleanup)
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
      for (const chunk of chunkArray(notesSnap.docs, 500)) {
        const batch = writeBatch(db);
        chunk.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }

      // 3. Delete files: Storage first, then Firestore
      const filesSnap = await getDocs(
        collection(db, 'users', user.uid, 'clients', clientId, 'files')
      );
      for (const fileDoc of filesSnap.docs) {
        const data = fileDoc.data();
        if (data.storagePath) await deleteStorageFile(data.storagePath);
        if (data.thumbnailPath) await deleteStorageFile(data.thumbnailPath);
        await deleteDoc(fileDoc.ref);
      }

      // 4. Delete invoices in batches
      const invoicesSnap = await getDocs(
        collection(db, 'users', user.uid, 'clients', clientId, 'invoices')
      );
      for (const chunk of chunkArray(invoicesSnap.docs, 500)) {
        const batch = writeBatch(db);
        chunk.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }

      // 5. Delete activity log entries for this client
      const activitySnap = await getDocs(
        query(
          collection(db, 'users', user.uid, 'activityLog'),
          where('clientId', '==', clientId)
        )
      );
      for (const chunk of chunkArray(activitySnap.docs, 500)) {
        const batch = writeBatch(db);
        chunk.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }

      // 6. Delete the client document itself
      await deleteDoc(doc(db, 'users', user.uid, 'clients', clientId));

      toast.success('Client permanently deleted');
      navigate('/archive');
    } catch {
      toast.error('Failed to delete client');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="max-w-4xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back
        </Button>
        <p className="text-destructive">{error ?? 'Client not found'}</p>
      </div>
    );
  }

  const isArchived = client.archived;

  return (
    <div className="max-w-4xl space-y-4">
      {/* Back link */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(isArchived ? '/archive' : -1 as unknown as string)}
        className="-ml-2"
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" />
        {isArchived ? 'Back to Archive' : 'Back'}
      </Button>

      {/* Header row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h1 className="font-heading text-2xl font-bold tracking-tight truncate">{client.name}</h1>
          {isArchived && (
            <Badge variant="secondary" className="shrink-0">Archived</Badge>
          )}
        </div>

        {!isArchived && (
          <StageSelector
            clientId={client.id!}
            clientName={client.name}
            currentStage={client.stage}
          />
        )}

        {isArchived ? (
          /* Archived client actions: Restore + Delete */
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestore}
              disabled={restoring}
              className="gap-1.5"
            >
              {restoring ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ArchiveRestore className="h-3.5 w-3.5" />
              )}
              Restore
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={restoring}
              className="gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        ) : (
          /* Active client actions dropdown */
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditMode(true)}>
                <Pencil className="h-3.5 w-3.5 mr-2" />
                Edit Client
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setArchiveDialogOpen(true)}
              >
                <Archive className="h-3.5 w-3.5 mr-2" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Archived banner */}
      {isArchived && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          This client is archived and hidden from the pipeline. Restore them to resume working on their project.
        </div>
      )}

      {/* Summary strip */}
      <ClientSummaryStrip client={client} />

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab client={client} key={editMode ? 'edit' : 'view'} />
        </TabsContent>

        <TabsContent value="notes">
          <NotesTab client={client} />
        </TabsContent>

        <TabsContent value="files">
          <FilesTab clientId={client.id!} clientName={client.name} />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoicesTab clientId={client.id!} clientName={client.name} />
        </TabsContent>

        <TabsContent value="milestones">
          <MilestonesTab clientId={client.id!} clientName={client.name} />
        </TabsContent>
      </Tabs>

      {/* Archive confirmation dialog */}
      <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive {client.name}?</DialogTitle>
            <DialogDescription>
              This client will be moved to the archive and hidden from the pipeline. You can restore them later from the Archive page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveDialogOpen(false)} disabled={archiving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleArchive} disabled={archiving}>
              {archiving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Archive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => !open && !deleting && setDeleteDialogOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permanently delete {client.name}?</DialogTitle>
            <DialogDescription>
              This will delete all notes, files, invoices, milestones, and calendar events. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
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
