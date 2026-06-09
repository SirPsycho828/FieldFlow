import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PipelineBoard } from '@/components/pipeline/PipelineBoard';
import { MobilePipelineList } from '@/components/pipeline/MobilePipelineList';
import { AddClientSheet } from '@/components/pipeline/AddClientSheet';
import { EmptyState } from '@/components/shared/EmptyState';
import { NeedsAttentionBanner } from '@/components/shared/NeedsAttentionBanner';
import { StatusSummary } from '@/components/ux/StatusSummary';
import { GuidanceTip } from '@/components/ux/GuidanceTip';
import { PageIntro } from '@/components/ux/PageIntro';
import { useClients } from '@/hooks/useClients';
import { useNeedsAttention } from '@/hooks/useNeedsAttention';
import { useAuth } from '@/contexts/AuthContext';
import { STAGES, STAGE_LABELS } from '@/types';

export function PipelinePage() {
  const navigate = useNavigate();
  const { userDoc } = useAuth();
  const { clients, clientsByStage, loading } = useClients();
  const stalenessThreshold = userDoc?.settings?.stalenessThresholdDays ?? 14;
  const { attentionClients } = useNeedsAttention(clients, stalenessThreshold);
  const [addOpen, setAddOpen] = useState(false);

  const handleClientCreated = (clientId: string, clientName: string) => {
    toast.success(`${clientName} added to pipeline`, {
      action: {
        label: 'View',
        onClick: () => navigate(`/clients/${clientId}`),
      },
    });
  };

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

  // Build stage distribution detail string
  const stageDetail = STAGES
    .map((s) => clientsByStage[s].length)
    .filter((c) => c > 0)
    .length;

  const metricsItems = [
    {
      label: 'Active clients',
      value: clients.length,
      detail: `Across ${stageDetail} ${stageDetail === 1 ? 'stage' : 'stages'}`,
    },
    {
      label: 'Needs attention',
      value: attentionClients.length,
      detail: attentionClients.length > 0 ? 'Stale or overdue' : 'All on track',
    },
    ...STAGES.filter((s) => clientsByStage[s].length > 0).map((s) => ({
      label: STAGE_LABELS[s],
      value: clientsByStage[s].length,
    })),
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Pipeline</h1>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Client
        </Button>
      </div>

      <PageIntro>
        Track every client from first lead to completed installation. Drag cards between stages as projects progress.
      </PageIntro>

      {hasClients && (
        <StatusSummary items={metricsItems} className="mb-5" />
      )}

      {attentionClients.length > 0 && (
        <NeedsAttentionBanner attentionClients={attentionClients} />
      )}

      {hasClients && (
        <GuidanceTip id="pipeline-stages" className="mb-5">
          Your pipeline has 6 stages: Lead, Consultation, Proposal, Active Design, Installation, and Complete.
          Drag clients between columns or use the stage selector on a client's detail page to advance them.
        </GuidanceTip>
      )}

      {!hasClients ? (
        <EmptyState
          icon={Users}
          heading="No clients yet"
          description="Add your first client to start building your pipeline. Each client moves through stages from initial lead to completed project."
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

      <AddClientSheet open={addOpen} onOpenChange={setAddOpen} onCreated={handleClientCreated} />
    </div>
  );
}
