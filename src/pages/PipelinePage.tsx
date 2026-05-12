import { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PipelineBoard } from '@/components/pipeline/PipelineBoard';
import { MobilePipelineList } from '@/components/pipeline/MobilePipelineList';
import { AddClientSheet } from '@/components/pipeline/AddClientSheet';
import { EmptyState } from '@/components/shared/EmptyState';
import { useClients } from '@/hooks/useClients';

export function PipelinePage() {
  const { clients, clientsByStage, loading } = useClients();
  const [addOpen, setAddOpen] = useState(false);

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">Pipeline</h1>
        </div>
        <div className="grid grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
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
        <h1 className="text-xl font-semibold">Pipeline</h1>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Client
        </Button>
      </div>

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
