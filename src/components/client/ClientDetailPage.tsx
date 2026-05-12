import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import {
  ArrowLeft,
  MoreVertical,
  Pencil,
  Archive,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
import { addActivityEntry } from '@/lib/activityLog';
import { useAuth } from '@/contexts/AuthContext';
import { useClient } from '@/hooks/useClient';
import { StageSelector } from '@/components/shared/StageSelector';
import { ClientSummaryStrip } from '@/components/client/ClientSummaryStrip';
import { OverviewTab } from '@/components/client/OverviewTab';
import { NotesTab } from '@/components/client/NotesTab';
import { FilesTab } from '@/components/client/FilesTab';
import { InvoicesTab } from '@/components/client/InvoicesTab';

export function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { client, loading, error } = useClient(clientId ?? '');

  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [editMode, setEditMode] = useState(false);

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
      navigate('/');
    } catch {
      toast.error('Failed to archive client');
      setArchiving(false);
    }
    setArchiveDialogOpen(false);
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

  return (
    <div className="max-w-4xl space-y-4">
      {/* Back link */}
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-1.5" />
        Back
      </Button>

      {/* Header row */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-semibold flex-1 min-w-0 truncate">{client.name}</h1>
        <StageSelector
          clientId={client.id!}
          clientName={client.name}
          currentStage={client.stage}
        />
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
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setArchiveDialogOpen(true)}
            >
              <Archive className="h-3.5 w-3.5 mr-2" />
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
          <p className="text-sm text-muted-foreground italic">Milestones coming soon.</p>
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
    </div>
  );
}
