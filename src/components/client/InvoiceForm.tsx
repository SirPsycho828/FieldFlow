import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, X, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  createInvoice,
  updateInvoice,
  generateInvoiceNumber,
  type InvoiceFormData,
} from '@/lib/invoices';
import { centsToDollars, dollarsToCents, formatCurrency } from '@/lib/utils';
import type { InvoiceDocument } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

// --- Schema ---

const schema = z.object({
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  date: z.date({ error: 'Invoice date is required' }),
  dueDate: z.date().optional().nullable(),
  paymentTerms: z.string().optional(),
  lineItems: z
    .array(
      z.object({
        description: z.string().min(1, 'Description is required'),
        amount: z.number().positive('Amount must be greater than zero'),
      })
    )
    .min(1, 'Add at least one line item'),
  taxRate: z.number().min(0).max(100).optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

// --- Props ---

interface InvoiceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  invoice?: InvoiceDocument;
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

export function InvoiceForm({
  open,
  onOpenChange,
  clientId,
  clientName,
  invoice,
}: InvoiceFormProps) {
  const { user } = useAuth();
  const isEditing = !!invoice;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      invoiceNumber: '',
      date: new Date(),
      dueDate: null,
      paymentTerms: '',
      lineItems: [{ description: '', amount: 0 }],
      taxRate: null,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lineItems',
  });

  // Auto-generate invoice number when creating
  useEffect(() => {
    if (!open) return;

    if (isEditing && invoice) {
      // Populate form from existing invoice
      form.reset({
        invoiceNumber: invoice.invoiceNumber,
        date: invoice.date.toDate(),
        dueDate: invoice.dueDate ? invoice.dueDate.toDate() : null,
        paymentTerms: invoice.paymentTerms ?? '',
        lineItems: invoice.lineItems.map((li) => ({
          description: li.description,
          amount: centsToDollars(li.amount),
        })),
        taxRate: invoice.taxRate ?? null,
      });
    } else {
      // New invoice: auto-generate number
      if (!user) return;
      generateInvoiceNumber(user.uid, clientId).then((num) => {
        form.reset({
          invoiceNumber: num,
          date: new Date(),
          dueDate: null,
          paymentTerms: '',
          lineItems: [{ description: '', amount: 0 }],
          taxRate: null,
        });
      });
    }
  }, [open, isEditing, invoice, user, clientId, form]);

  // Watch for real-time totals
  const watchedLineItems = form.watch('lineItems');
  const watchedTaxRate = form.watch('taxRate');

  const subtotalDollars = watchedLineItems.reduce((sum, li) => {
    const val = typeof li.amount === 'number' && !isNaN(li.amount) ? li.amount : 0;
    return sum + val;
  }, 0);

  const taxRateNum =
    typeof watchedTaxRate === 'number' && !isNaN(watchedTaxRate) ? watchedTaxRate : 0;
  const taxDollars = subtotalDollars * (taxRateNum / 100);
  const totalDollars = subtotalDollars + taxDollars;

  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (values: FormValues) => {
    if (!user) return;
    setSubmitting(true);
    try {
      // Convert dollar amounts to cents
      const lineItemsCents = values.lineItems.map((li) => ({
        description: li.description,
        amount: dollarsToCents(li.amount),
      }));

      const subtotalCents = lineItemsCents.reduce((s, li) => s + li.amount, 0);
      const taxRateVal = values.taxRate ?? null;
      const taxAmountCents =
        taxRateVal !== null ? Math.round(subtotalCents * (taxRateVal / 100)) : null;
      const totalCents = subtotalCents + (taxAmountCents ?? 0);

      const data: InvoiceFormData = {
        invoiceNumber: values.invoiceNumber,
        date: values.date,
        dueDate: values.dueDate ?? null,
        paymentTerms: values.paymentTerms || undefined,
        lineItems: lineItemsCents,
        subtotal: subtotalCents,
        taxRate: taxRateVal,
        taxAmount: taxAmountCents,
        total: totalCents,
      };

      if (isEditing && invoice?.id) {
        await updateInvoice(user.uid, clientId, invoice.id, data);
        toast.success('Invoice updated');
      } else {
        await createInvoice(user.uid, clientId, clientName, data);
        toast.success('Invoice created');
      }

      onOpenChange(false);
    } catch {
      toast.error(isEditing ? 'Failed to update invoice' : 'Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Invoice' : 'Create Invoice'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {/* Header fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="invoiceNumber">Invoice Number *</Label>
              <Input
                id="invoiceNumber"
                className="font-mono"
                {...form.register('invoiceNumber')}
              />
              {form.formState.errors.invoiceNumber && (
                <p className="text-xs text-destructive mt-1">
                  {form.formState.errors.invoiceNumber.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
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

            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={
                  form.watch('dueDate')
                    ? dateToInputValue(form.watch('dueDate') as Date)
                    : ''
                }
                onChange={(e) => {
                  const d = inputValueToDate(e.target.value);
                  form.setValue('dueDate', d ?? null);
                }}
              />
            </div>

            <div>
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Input
                id="paymentTerms"
                placeholder="e.g., Net 30"
                {...form.register('paymentTerms')}
              />
            </div>
          </div>

          <Separator />

          {/* Line items */}
          <div>
            <Label className="mb-2 block">Line Items</Label>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start">
                  {/* Description ~70% */}
                  <div className="flex-[7]">
                    <Input
                      placeholder="Description"
                      {...form.register(`lineItems.${index}.description`)}
                      className={
                        form.formState.errors.lineItems?.[index]?.description
                          ? 'border-destructive'
                          : ''
                      }
                    />
                    {form.formState.errors.lineItems?.[index]?.description && (
                      <p className="text-xs text-destructive mt-0.5">
                        {form.formState.errors.lineItems[index]?.description?.message}
                      </p>
                    )}
                  </div>

                  {/* Amount ~25% */}
                  <div className="flex-[2.5]">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      {...form.register(`lineItems.${index}.amount`, {
                        valueAsNumber: true,
                      })}
                      className={
                        form.formState.errors.lineItems?.[index]?.amount
                          ? 'border-destructive'
                          : ''
                      }
                    />
                    {form.formState.errors.lineItems?.[index]?.amount && (
                      <p className="text-xs text-destructive mt-0.5">
                        {form.formState.errors.lineItems[index]?.amount?.message}
                      </p>
                    )}
                  </div>

                  {/* Remove button ~5% */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 mt-0"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {form.formState.errors.lineItems?.root && (
              <p className="text-xs text-destructive mt-1">
                {form.formState.errors.lineItems.root.message}
              </p>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => append({ description: '', amount: 0 })}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Line Item
            </Button>
          </div>

          <Separator />

          {/* Tax + Totals */}
          <div className="flex gap-8 items-start">
            {/* Tax rate input */}
            <div className="w-48">
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="0.00"
                {...form.register('taxRate', { valueAsNumber: true })}
              />
            </div>

            {/* Totals right-aligned */}
            <div className="ml-auto text-right space-y-1 min-w-[160px]">
              <div className="flex justify-between gap-8 text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(dollarsToCents(subtotalDollars))}</span>
              </div>
              {taxRateNum > 0 && (
                <div className="flex justify-between gap-8 text-sm">
                  <span className="text-muted-foreground">Tax ({taxRateNum}%)</span>
                  <span>{formatCurrency(dollarsToCents(taxDollars))}</span>
                </div>
              )}
              <Separator className="my-1" />
              <div className="flex justify-between gap-8 text-sm font-semibold">
                <span>Total</span>
                <span>{formatCurrency(dollarsToCents(totalDollars))}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Create Invoice'
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
