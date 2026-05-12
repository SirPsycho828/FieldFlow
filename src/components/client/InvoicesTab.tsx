import { useState } from 'react';
import { ReceiptText, MoreVertical, Plus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useInvoices } from '@/hooks/useInvoices';
import { deleteInvoice, toggleInvoiceStatus } from '@/lib/invoices';
import { generateInvoicePdf } from '@/components/client/InvoicePdf';
import { formatCurrency } from '@/lib/utils';
import type { InvoiceDocument } from '@/types';
import { EmptyState } from '@/components/shared/EmptyState';
import { InvoiceForm } from '@/components/client/InvoiceForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface InvoicesTabProps {
  clientId: string;
  clientName: string;
}

export function InvoicesTab({ clientId, clientName }: InvoicesTabProps) {
  const { user } = useAuth();
  const { invoices, loading } = useInvoices(clientId);

  const [formOpen, setFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceDocument | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<InvoiceDocument | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  function openCreate() {
    setEditingInvoice(undefined);
    setFormOpen(true);
  }

  function openEdit(invoice: InvoiceDocument) {
    setEditingInvoice(invoice);
    setFormOpen(true);
  }

  async function handleToggleStatus(invoice: InvoiceDocument) {
    if (!user || !invoice.id) return;
    setActionLoading(invoice.id);
    try {
      await toggleInvoiceStatus(
        user.uid,
        clientId,
        clientName,
        invoice.id,
        invoice.invoiceNumber,
        invoice.status
      );
      toast.success(
        invoice.status === 'unpaid' ? 'Marked as paid' : 'Marked as unpaid'
      );
    } catch {
      toast.error('Failed to update invoice status');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleGeneratePdf(invoice: InvoiceDocument) {
    if (!user || !invoice.id) return;
    setActionLoading(invoice.id);
    try {
      await generateInvoicePdf(user.uid, clientId, invoice.id);
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setActionLoading(null);
    }
  }

  function handleDeleteClick(invoice: InvoiceDocument) {
    setDeleteTarget(invoice);
    setDeleteConfirmOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!user || !deleteTarget?.id) return;
    setActionLoading(deleteTarget.id);
    try {
      await deleteInvoice(user.uid, clientId, deleteTarget.id);
      toast.success('Invoice deleted');
    } catch {
      toast.error('Failed to delete invoice');
    } finally {
      setActionLoading(null);
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Invoices</h3>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          New Invoice
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!loading && invoices.length === 0 && (
        <EmptyState
          icon={ReceiptText}
          heading="No invoices yet"
          description="Create your first invoice for this client"
          actionLabel="Create Invoice"
          onAction={openCreate}
        />
      )}

      {/* Invoice list */}
      {!loading && invoices.length > 0 && (
        <div className="space-y-2">
          {invoices.map((invoice) => {
            const firstDesc = invoice.lineItems[0]?.description ?? '';
            const invoiceDate = invoice.date?.toDate
              ? format(invoice.date.toDate(), 'MMM d, yyyy')
              : '';
            const isPaid = invoice.status === 'paid';
            const isLoading = actionLoading === invoice.id;

            return (
              <div
                key={invoice.id}
                className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 gap-4"
              >
                {/* Left: invoice info */}
                <div className="flex-1 min-w-0">
                  {/* Top line */}
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-medium">
                      {invoice.invoiceNumber}
                    </span>
                    <span className="text-sm font-semibold">
                      {formatCurrency(invoice.total)}
                    </span>
                    {invoiceDate && (
                      <span className="text-xs text-muted-foreground">{invoiceDate}</span>
                    )}
                  </div>

                  {/* Bottom line */}
                  <div className="flex items-center gap-2 mt-0.5">
                    {firstDesc && (
                      <span className="text-xs text-muted-foreground truncate max-w-[240px]">
                        {firstDesc}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: badge + actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant={isPaid ? 'default' : 'outline'}
                    className={
                      isPaid
                        ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100'
                        : ''
                    }
                  >
                    {isPaid ? 'Paid' : 'Unpaid'}
                  </Badge>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreVertical className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleToggleStatus(invoice)}>
                        {isPaid ? 'Mark as Unpaid' : 'Mark as Paid'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(invoice)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleGeneratePdf(invoice)}>
                        Generate PDF
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDeleteClick(invoice)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit invoice dialog */}
      <InvoiceForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingInvoice(undefined);
        }}
        clientId={clientId}
        clientName={clientName}
        invoice={editingInvoice}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete invoice{' '}
            <span className="font-mono font-medium">{deleteTarget?.invoiceNumber}</span>?
            This action cannot be undone.
          </p>
          <div className="flex gap-2 pt-2">
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={!!actionLoading}
              className="flex-1"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setDeleteTarget(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
