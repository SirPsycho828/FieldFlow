import { useState } from 'react';
import {
  Calendar,
  Circle,
  CircleCheck,
  AlertCircle,
  Clock,
  Pencil,
  Trash2,
  Plus,
  Loader2,
} from 'lucide-react';
import { format, isPast, differenceInHours } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useMilestones } from '@/hooks/useMilestones';
import {
  deleteMilestone,
  toggleMilestoneComplete,
} from '@/lib/milestones';
import type { MilestoneDocument } from '@/types';
import { EmptyState } from '@/components/shared/EmptyState';
import { MilestoneForm } from '@/components/client/MilestoneForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface MilestonesTabProps {
  clientId: string;
  clientName: string;
}

type MilestoneStatus = 'completed' | 'overdue' | 'due-soon' | 'upcoming';

function getMilestoneStatus(milestone: MilestoneDocument): MilestoneStatus {
  if (milestone.completed) return 'completed';

  const milestoneDate = milestone.date.toDate();
  const now = new Date();

  if (isPast(milestoneDate)) return 'overdue';

  const hoursUntil = differenceInHours(milestoneDate, now);
  if (hoursUntil <= 48) return 'due-soon';

  return 'upcoming';
}

interface StatusNodeProps {
  status: MilestoneStatus;
}

function StatusNode({ status }: StatusNodeProps) {
  if (status === 'completed') {
    return <CircleCheck className="h-5 w-5 text-success shrink-0" />;
  }
  if (status === 'overdue') {
    return <AlertCircle className="h-5 w-5 text-destructive shrink-0" />;
  }
  if (status === 'due-soon') {
    return (
      <Clock
        className="h-5 w-5 shrink-0"
        style={{ color: 'hsl(38, 92%, 50%)' }}
      />
    );
  }
  return <Circle className="h-5 w-5 text-muted-foreground shrink-0" />;
}

interface StatusBadgeProps {
  status: MilestoneStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
  if (status === 'completed') {
    return (
      <Badge className="bg-success/10 text-success border-success/20 hover:bg-success/10">
        Completed
      </Badge>
    );
  }
  if (status === 'overdue') {
    return <Badge variant="destructive">Overdue</Badge>;
  }
  if (status === 'due-soon') {
    return (
      <Badge
        style={{
          backgroundColor: 'hsl(38, 92%, 50%, 0.15)',
          color: 'hsl(38, 92%, 35%)',
          borderColor: 'hsl(38, 92%, 50%, 0.3)',
        }}
        className="border"
      >
        Due Soon
      </Badge>
    );
  }
  return <Badge variant="outline">Upcoming</Badge>;
}

export function MilestonesTab({ clientId, clientName }: MilestonesTabProps) {
  const { user } = useAuth();
  const { milestones, loading } = useMilestones(clientId);

  const [formOpen, setFormOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<
    MilestoneDocument | undefined
  >();
  const [deleteTarget, setDeleteTarget] = useState<MilestoneDocument | null>(
    null
  );
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  function openCreate() {
    setEditingMilestone(undefined);
    setFormOpen(true);
  }

  function openEdit(milestone: MilestoneDocument) {
    setEditingMilestone(milestone);
    setFormOpen(true);
  }

  function handleDeleteClick(milestone: MilestoneDocument) {
    setDeleteTarget(milestone);
    setDeleteConfirmOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!user || !deleteTarget?.id) return;
    setActionLoading(deleteTarget.id);
    try {
      await deleteMilestone(user.uid, clientId, deleteTarget.id);
      toast.success('Milestone deleted');
    } catch {
      toast.error('Failed to delete milestone');
    } finally {
      setActionLoading(null);
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
    }
  }

  async function handleToggleComplete(milestone: MilestoneDocument) {
    if (!user || !milestone.id) return;
    setActionLoading(milestone.id);
    try {
      await toggleMilestoneComplete(
        user.uid,
        clientId,
        clientName,
        milestone.id,
        milestone.title,
        milestone.completed
      );
      if (!milestone.completed) {
        toast.success('Milestone completed');
      } else {
        toast.success('Milestone reopened');
      }
    } catch {
      toast.error('Failed to update milestone');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Milestones</h3>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Add Milestone
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!loading && milestones.length === 0 && (
        <EmptyState
          icon={Calendar}
          heading="No milestones yet"
          description="Add milestones to track key project dates"
          actionLabel="Add Milestone"
          onAction={openCreate}
        />
      )}

      {/* Timeline */}
      {!loading && milestones.length > 0 && (
        <div className="relative pl-6">
          {/* Vertical connecting line */}
          <div className="absolute left-2.5 top-2 bottom-2 border-l-2 border-border" />

          <div className="space-y-4">
            {milestones.map((milestone) => {
              const status = getMilestoneStatus(milestone);
              const isLoading = actionLoading === milestone.id;
              const dateStr = milestone.date?.toDate
                ? format(milestone.date.toDate(), 'MMM d, yyyy')
                : '';

              return (
                <div
                  key={milestone.id}
                  className="relative flex items-start gap-3 group"
                >
                  {/* Status node — sits on the vertical line */}
                  <div className="absolute -left-3.5 top-0.5 bg-background">
                    <StatusNode status={status} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
                    <span
                      className={`text-sm font-medium ${
                        status === 'completed'
                          ? 'line-through text-muted-foreground'
                          : ''
                      }`}
                    >
                      {milestone.title}
                    </span>
                    {dateStr && (
                      <span className="text-xs text-muted-foreground">
                        {dateStr}
                      </span>
                    )}
                    <StatusBadge status={status} />
                  </div>

                  {/* Actions (show on hover) */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title={milestone.completed ? 'Mark incomplete' : 'Mark complete'}
                      disabled={isLoading}
                      onClick={() => handleToggleComplete(milestone)}
                    >
                      {isLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CircleCheck className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Edit milestone"
                      disabled={isLoading}
                      onClick={() => openEdit(milestone)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      title="Delete milestone"
                      disabled={isLoading}
                      onClick={() => handleDeleteClick(milestone)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create/Edit milestone dialog */}
      <MilestoneForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingMilestone(undefined);
        }}
        clientId={clientId}
        clientName={clientName}
        milestone={editingMilestone}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Milestone</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete{' '}
            <span className="font-medium text-foreground">
              {deleteTarget?.title}
            </span>
            ? This will also remove it from Google Calendar if synced.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setDeleteTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={!!actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
