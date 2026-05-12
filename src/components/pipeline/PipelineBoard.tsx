import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorner,
  type DragStartEvent,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { toast } from 'sonner';
import { PipelineColumn } from './PipelineColumn';
import { ClientCard } from './ClientCard';
import { updateClientStage, updateClientOrder } from '@/lib/clients';
import { useAuth } from '@/contexts/AuthContext';
import { STAGES, STAGE_LABELS, type Stage, type ClientDocument } from '@/types';

interface PipelineBoardProps {
  clientsByStage: Record<Stage, ClientDocument[]>;
}

export function PipelineBoard({ clientsByStage }: PipelineBoardProps) {
  const { user } = useAuth();
  const [activeClient, setActiveClient] = useState<ClientDocument | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const client = active.data.current?.client as ClientDocument;
    if (client) setActiveClient(client);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveClient(null);

    if (!over || !user) return;

    const draggedClient = active.data.current?.client as ClientDocument;
    if (!draggedClient) return;

    // Determine target stage
    let targetStage: Stage;
    if (over.data.current?.type === 'column') {
      targetStage = over.data.current.stage as Stage;
    } else if (over.data.current?.type === 'client') {
      targetStage = (over.data.current.client as ClientDocument).stage;
    } else {
      return;
    }

    const isStageChange = draggedClient.stage !== targetStage;

    if (isStageChange) {
      // Calculate new stageOrder: append to bottom of target stage
      const targetClients = clientsByStage[targetStage];
      const maxOrder =
        targetClients.length > 0
          ? Math.max(...targetClients.map((c) => c.stageOrder || 0))
          : 0;
      const newOrder = maxOrder + 1;

      try {
        await updateClientStage(user.uid, draggedClient.id!, draggedClient.name, targetStage, newOrder);
        toast.success(`Moved to ${STAGE_LABELS[targetStage]}`);
      } catch (err) {
        toast.error('Failed to move client');
        console.error(err);
      }
    } else {
      // Within-column reorder — calculate fractional order
      if (over.id === active.id) return;

      const stageClients = [...clientsByStage[targetStage]];
      const oldIndex = stageClients.findIndex((c) => c.id === active.id);
      const newIndex = stageClients.findIndex((c) => c.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(stageClients, oldIndex, newIndex);
      let newOrder: number;
      if (newIndex === 0) {
        newOrder = (reordered[1]?.stageOrder || 1) - 1;
      } else if (newIndex === reordered.length - 1) {
        newOrder = (reordered[newIndex - 1]?.stageOrder || 0) + 1;
      } else {
        const before = reordered[newIndex - 1]?.stageOrder || 0;
        const after = reordered[newIndex + 1]?.stageOrder || before + 2;
        newOrder = (before + after) / 2;
      }

      try {
        await updateClientOrder(user.uid, draggedClient.id!, newOrder);
      } catch (err) {
        toast.error('Failed to reorder');
        console.error(err);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorner}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-6 gap-4 min-w-[1200px]">
        {STAGES.map((stage) => (
          <PipelineColumn key={stage} stage={stage} clients={clientsByStage[stage]} />
        ))}
      </div>
      <DragOverlay>
        {activeClient ? <ClientCard client={activeClient} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
