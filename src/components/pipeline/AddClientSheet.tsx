import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createClient } from '@/lib/clients';
import { useAuth } from '@/contexts/AuthContext';
import { STAGES, STAGE_LABELS, SOURCE_OPTIONS, type Stage } from '@/types';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  stage: z.enum(STAGES),
  source: z.string().optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

interface AddClientSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (clientId: string, clientName: string) => void;
}

export function AddClientSheet({ open, onOpenChange, onCreated }: AddClientSheetProps) {
  const { user } = useAuth();
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '', stage: 'lead', source: '' },
  });

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    try {
      const newId = await createClient(user.uid, {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        stage: data.stage,
        source: data.source || null,
      });
      form.reset();
      onOpenChange(false);
      onCreated?.(newId, data.name);
    } catch {
      toast.error('Failed to create client');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add Client</SheetTitle>
        </SheetHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              {...form.register('name')}
              className={form.formState.errors.name ? 'border-destructive bg-destructive/5' : ''}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register('email')} />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...form.register('phone')} />
          </div>
          <div>
            <Label>Stage</Label>
            <Select
              value={form.watch('stage')}
              onValueChange={(val) => form.setValue('stage', val as Stage)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Source</Label>
            <Select
              value={form.watch('source') || ''}
              onValueChange={(val) => form.setValue('source', val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={form.formState.isSubmitting} className="flex-1">
              {form.formState.isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Create Client'
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
