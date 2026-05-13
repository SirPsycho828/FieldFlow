import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { ClientCard } from './ClientCard';
import type { ClientDocument, Stage } from '@/types';
import { STAGE_LABELS } from '@/types';

// Stage border colors (matching tailwind.config.ts)
const STAGE_COLORS: Record<Stage, string> = {
  lead: 'border-t-stage-lead',
  consultation: 'border-t-stage-consultation',
  proposal: 'border-t-stage-proposal',
  active_design: 'border-t-stage-active-design',
  installation: 'border-t-stage-installation',
  complete: 'border-t-stage-complete',
};

// Sortable wrapper for each client card
function SortableClientCard({ client }: { client: ClientDocument }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: client.id!,
    data: { type: 'client', client },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ClientCard client={client} isDragging={isDragging} />
    </div>
  );
}

interface PipelineColumnProps {
  stage: Stage;
  clients: ClientDocument[];
}

export function PipelineColumn({ stage, clients }: PipelineColumnProps) {
  const { setNodeRef } = useDroppable({ id: stage, data: { type: 'column', stage } });
  const clientIds = clients.map((c) => c.id!);

  return (
    <div className={`flex flex-col min-w-[200px] border-t-[3px] ${STAGE_COLORS[stage]} bg-background rounded-lg`}>
      <div className="p-3 flex items-center gap-2">
        <h2 className="font-heading text-sm font-bold">{STAGE_LABELS[stage]}</h2>
        <Badge variant="secondary" className="text-xs">{clients.length}</Badge>
      </div>
      <div ref={setNodeRef} className="flex-1 overflow-y-auto p-2 pt-0 space-y-3 min-h-[100px]">
        <SortableContext items={clientIds} strategy={verticalListSortingStrategy}>
          {clients.map((client) => (
            <SortableClientCard key={client.id} client={client} />
          ))}
        </SortableContext>
        {clients.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No clients</p>
        )}
      </div>
    </div>
  );
}
