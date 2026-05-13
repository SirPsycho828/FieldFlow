import { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PipelineBoard } from '@/components/pipeline/PipelineBoard';
import { MobilePipelineList } from '@/components/pipeline/MobilePipelineList';
import { AddClientSheet } from '@/components/pipeline/AddClientSheet';
import { EmptyState } from '@/components/shared/EmptyState';
import { NeedsAttentionBanner } from '@/components/shared/NeedsAttentionBanner';
import { useClients } from '@/hooks/useClients';
import { useNeedsAttention } from '@/hooks/useNeedsAttention';
import { useAuth } from '@/contexts/AuthContext';

export function PipelinePage() {
  const { userDoc } = useAuth();
  const { clients, clientsByStage, loading } = useClients();
  const stalenessThreshold = userDoc?.settings?.stalenessThresholdDays ?? 14;
  const { attentionClients } = useNeedsAttention(clients, stalenessThreshold);
  const [addOpen, setAddOpen] = useState(false);

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-heading text-2xl font-bold tracking-tight">Pipeline</h1>
        </div>
        <div className="grid grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-8 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hasClients = clients.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Pipeline</h1>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Client
        </Button>
      </div>

      {attentionClients.length > 0 && (
        <NeedsAttentionBanner attentionClients={attentionClients} />
      )}

      {!hasClients ? (
        <EmptyState
          icon={Users}
          heading="No clients yet"
          description="Add your first client to get started"
          actionLabel="Add Client"
          onAction={() => setAddOpen(true)}
        />
      ) : (
        <>
          {/* Desktop: Kanban board */}
          <div className="hidden md:block overflow-x-auto">
            <PipelineBoard clientsByStage={clientsByStage} />
          </div>
          {/* Mobile: Grouped list */}
          <div className="md:hidden">
            <MobilePipelineList clientsByStage={clientsByStage} />
          </div>
        </>
      )}

      <AddClientSheet open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
