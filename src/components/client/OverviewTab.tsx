import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Mail,
  Phone,
  MapPin,
  Tag,
  DollarSign,
  Ruler,
  Layers,
  Sun,
  TreePine,
  Pencil,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateClient } from '@/lib/clients';
import { useAuth } from '@/contexts/AuthContext';
import { SOURCE_OPTIONS, type ClientDocument } from '@/types';

interface OverviewTabProps {
  client: ClientDocument;
}

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  source: z.string().optional(),
  budgetRange: z.string().optional(),
  lotSize: z.string().optional(),
  soilType: z.string().optional(),
  sunExposure: z.string().optional(),
  existingFeatures: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function Field({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground leading-none mb-1">{label}</p>
        <div className="text-sm">{value}</div>
      </div>
    </div>
  );
}

function Empty() {
  return <span className="italic text-muted-foreground">Not provided</span>;
}

export function OverviewTab({ client }: OverviewTabProps) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      source: client.source || '',
      budgetRange: client.budgetRange || '',
      lotSize: client.propertyDetails?.lotSize || '',
      soilType: client.propertyDetails?.soilType || '',
      sunExposure: client.propertyDetails?.sunExposure || '',
      existingFeatures: client.propertyDetails?.existingFeatures || '',
    },
  });

  const handleEdit = () => {
    form.reset({
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      source: client.source || '',
      budgetRange: client.budgetRange || '',
      lotSize: client.propertyDetails?.lotSize || '',
      soilType: client.propertyDetails?.soilType || '',
      sunExposure: client.propertyDetails?.sunExposure || '',
      existingFeatures: client.propertyDetails?.existingFeatures || '',
    });
    setEditing(true);
  };

  const onSubmit = async (data: FormData) => {
    if (!user || !client.id) return;
    try {
      await updateClient(user.uid, client.id, client.name, {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        source: data.source || null,
        budgetRange: data.budgetRange || null,
        propertyDetails: {
          lotSize: data.lotSize || null,
          soilType: data.soilType || null,
          sunExposure: data.sunExposure || null,
          existingFeatures: data.existingFeatures || null,
        },
      });
      toast.success('Client updated');
      setEditing(false);
    } catch {
      toast.error('Failed to update client');
    }
  };

  if (editing) {
    return (
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Contact info */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Contact</p>
            <div>
              <Label htmlFor="edit-name">Name *</Label>
              <Input id="edit-name" {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input id="edit-email" type="email" {...form.register('email')} />
            </div>
            <div>
              <Label htmlFor="edit-phone">Phone</Label>
              <Input id="edit-phone" {...form.register('phone')} />
            </div>
            <div>
              <Label htmlFor="edit-address">Address</Label>
              <Input id="edit-address" {...form.register('address')} />
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
                  <SelectItem value="">None</SelectItem>
                  {SOURCE_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-budget">Budget Range</Label>
              <Input id="edit-budget" {...form.register('budgetRange')} placeholder="e.g. $5,000–$10,000" />
            </div>
          </div>

          {/* Property details */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Property</p>
            <div>
              <Label htmlFor="edit-lot">Lot Size</Label>
              <Input id="edit-lot" {...form.register('lotSize')} placeholder="e.g. 0.25 acres" />
            </div>
            <div>
              <Label htmlFor="edit-soil">Soil Type</Label>
              <Input id="edit-soil" {...form.register('soilType')} placeholder="e.g. Clay, Sandy" />
            </div>
            <div>
              <Label htmlFor="edit-sun">Sun Exposure</Label>
              <Input id="edit-sun" {...form.register('sunExposure')} placeholder="e.g. Full sun, Partial shade" />
            </div>
            <div>
              <Label htmlFor="edit-features">Existing Features</Label>
              <Input id="edit-features" {...form.register('existingFeatures')} placeholder="e.g. Mature trees, Patio" />
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
          <Button type="button" variant="outline" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  // Read mode
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="sr-only">Client overview</span>
        <Button variant="outline" size="sm" onClick={handleEdit} className="ml-auto">
          <Pencil className="h-3.5 w-3.5 mr-1.5" />
          Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-0">
        {/* Left: Contact */}
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide mb-2">Contact</p>
          <Field
            icon={Mail}
            label="Email"
            value={
              client.email
                ? <a href={`mailto:${client.email}`} className="text-primary hover:underline">{client.email}</a>
                : <Empty />
            }
          />
          <Field
            icon={Phone}
            label="Phone"
            value={
              client.phone
                ? <a href={`tel:${client.phone}`} className="hover:underline">{client.phone}</a>
                : <Empty />
            }
          />
          <Field
            icon={MapPin}
            label="Address"
            value={client.address || <Empty />}
          />
          <Field
            icon={Tag}
            label="Source"
            value={
              client.source
                ? <Badge variant="secondary">{client.source}</Badge>
                : <Empty />
            }
          />
          <Field
            icon={DollarSign}
            label="Budget Range"
            value={client.budgetRange || <Empty />}
          />
        </div>

        {/* Right: Property */}
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide mb-2">Property</p>
          <Field
            icon={Ruler}
            label="Lot Size"
            value={client.propertyDetails?.lotSize || <Empty />}
          />
          <Field
            icon={Layers}
            label="Soil Type"
            value={client.propertyDetails?.soilType || <Empty />}
          />
          <Field
            icon={Sun}
            label="Sun Exposure"
            value={client.propertyDetails?.sunExposure || <Empty />}
          />
          <Field
            icon={TreePine}
            label="Existing Features"
            value={client.propertyDetails?.existingFeatures || <Empty />}
          />
        </div>
      </div>
    </div>
  );
}
