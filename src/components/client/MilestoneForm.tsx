import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { createMilestone, updateMilestone } from '@/lib/milestones';
import type { MilestoneDocument } from '@/types';
import { MILESTONE_SUGGESTIONS } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// --- Schema ---

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  date: z.date({ error: 'Date is required' }),
});

type FormValues = z.infer<typeof schema>;

// --- Props ---

interface MilestoneFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  milestone?: MilestoneDocument;
}

// --- Helpers ---

function dateToInputValue(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function inputValueToDate(val: string): Date | null {
  if (!val) return null;
  const d = new Date(val + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

// --- Component ---

export function MilestoneForm({
  open,
  onOpenChange,
  clientId,
  clientName,
  milestone,
}: MilestoneFormProps) {
  const { user } = useAuth();
  const isEditing = !!milestone;
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      date: new Date(),
    },
  });

  // Populate form when dialog opens
  useEffect(() => {
    if (!open) return;

    if (isEditing && milestone) {
      form.reset({
        title: milestone.title,
        date: milestone.date.toDate(),
      });
    } else {
      form.reset({
        title: '',
        date: new Date(),
      });
    }
  }, [open, isEditing, milestone, form]);

  const onSubmit = async (values: FormValues) => {
    if (!user) return;
    setSubmitting(true);
    try {
      if (isEditing && milestone?.id) {
        await updateMilestone(user.uid, clientId, milestone.id, {
          title: values.title,
          date: values.date,
        });
        toast.success('Milestone updated');
      } else {
        await createMilestone(
          user.uid,
          clientId,
          clientName,
          values.title,
          values.date
        );
        toast.success('Milestone created');
      }
      onOpenChange(false);
    } catch {
      toast.error(isEditing ? 'Failed to update milestone' : 'Failed to create milestone');
    } finally {
      setSubmitting(false);
    }
  };

  function handleChipClick(suggestion: string) {
    form.setValue('title', suggestion, { shouldValidate: true });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Milestone' : 'Add Milestone'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {/* Title field */}
          <div>
            <Label htmlFor="milestone-title">Title *</Label>
            <Input
              id="milestone-title"
              placeholder='e.g., Site Visit, Install Start'
              {...form.register('title')}
            />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive mt-1">
                {form.formState.errors.title.message}
              </p>
            )}

            {/* Quick-add suggestion chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {MILESTONE_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleChipClick(suggestion)}
                  className="text-xs px-2 py-1 rounded-full border border-border bg-muted hover:bg-accent transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Date field */}
          <div>
            <Label htmlFor="milestone-date">Date *</Label>
            <Input
              id="milestone-date"
              type="date"
              value={
                form.watch('date') ? dateToInputValue(form.watch('date')) : ''
              }
              onChange={(e) => {
                const d = inputValueToDate(e.target.value);
                if (d) form.setValue('date', d, { shouldValidate: true });
              }}
            />
            {form.formState.errors.date && (
              <p className="text-xs text-destructive mt-1">
                {form.formState.errors.date.message}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Add Milestone'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
