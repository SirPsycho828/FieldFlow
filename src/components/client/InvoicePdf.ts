import { doc, getDoc } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { formatCurrency } from '@/lib/utils';
import type { InvoiceDocument, ClientDocument, UserDocument } from '@/types';

export async function generateInvoicePdf(
  uid: string,
  clientId: string,
  invoiceId: string
): Promise<void> {
  // 1. Read invoice doc fresh from Firestore
  const invoiceRef = doc(db, 'users', uid, 'clients', clientId, 'invoices', invoiceId);
  const invoiceSnap = await getDoc(invoiceRef);
  if (!invoiceSnap.exists()) {
    toast.error('Invoice not found');
    return;
  }
  const invoice = { id: invoiceSnap.id, ...invoiceSnap.data() } as InvoiceDocument;

  // 2. Read client doc
  const clientRef = doc(db, 'users', uid, 'clients', clientId);
  const clientSnap = await getDoc(clientRef);
  const client = clientSnap.exists()
    ? ({ id: clientSnap.id, ...clientSnap.data() } as ClientDocument)
    : null;

  // 3. Read user doc for businessProfile
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  const userDoc = userSnap.exists() ? (userSnap.data() as UserDocument) : null;
  const businessProfile = userDoc?.businessProfile ?? null;

  if (!businessProfile) {
    toast.warning('Add your business info in Settings for professional invoices');
  }

  // 4. Generate PDF with jsPDF
  const pdf = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const marginL = 60;
  const marginR = pageWidth - 60;
  let y = 60;

  const lineH = 16;

  // Business header
  if (businessProfile) {
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(businessProfile.name || '', marginL, y);
    y += lineH + 4;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    if (businessProfile.address) {
      pdf.text(businessProfile.address, marginL, y);
      y += lineH;
    }
    if (businessProfile.email) {
      pdf.text(businessProfile.email, marginL, y);
      y += lineH;
    }
    if (businessProfile.phone) {
      pdf.text(businessProfile.phone, marginL, y);
      y += lineH;
    }
    y += 10;
  }

  // INVOICE title
  pdf.setFontSize(26);
  pdf.setFont('helvetica', 'bold');
  pdf.text('INVOICE', marginR, 60, { align: 'right' });

  // Invoice details (right column)
  const detailsStartY = businessProfile ? 85 : 90;
  let dy = detailsStartY;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');

  pdf.text(`Invoice #: ${invoice.invoiceNumber}`, marginR, dy, { align: 'right' });
  dy += lineH;

  const invoiceDate = invoice.date.toDate
    ? format(invoice.date.toDate(), 'MMM d, yyyy')
    : '';
  pdf.text(`Date: ${invoiceDate}`, marginR, dy, { align: 'right' });
  dy += lineH;

  if (invoice.dueDate) {
    const dueDate = invoice.dueDate.toDate
      ? format(invoice.dueDate.toDate(), 'MMM d, yyyy')
      : '';
    pdf.text(`Due Date: ${dueDate}`, marginR, dy, { align: 'right' });
    dy += lineH;
  }

  if (invoice.paymentTerms) {
    pdf.text(`Terms: ${invoice.paymentTerms}`, marginR, dy, { align: 'right' });
    dy += lineH;
  }

  // Advance y past header area
  y = Math.max(y, dy) + 20;

  // Bill To section
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Bill To:', marginL, y);
  y += lineH;

  pdf.setFont('helvetica', 'normal');
  if (client?.name) {
    pdf.text(client.name, marginL, y);
    y += lineH;
  }
  if (client?.address) {
    pdf.text(client.address, marginL, y);
    y += lineH;
  }
  if (client?.email) {
    pdf.text(client.email, marginL, y);
    y += lineH;
  }

  y += 20;

  // Line items table header
  const descColX = marginL;
  const amtColX = marginR;
  const tableWidth = marginR - marginL;

  pdf.setFillColor(240, 240, 240);
  pdf.rect(marginL, y - 12, tableWidth, 18, 'F');

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Description', descColX + 4, y);
  pdf.text('Amount', amtColX, y, { align: 'right' });
  y += 6;

  // Separator line
  pdf.setDrawColor(200, 200, 200);
  pdf.line(marginL, y, marginR, y);
  y += 12;

  // Line items rows
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);

  for (const item of invoice.lineItems) {
    pdf.text(item.description, descColX + 4, y);
    pdf.text(formatCurrency(item.amount), amtColX, y, { align: 'right' });
    y += lineH;
  }

  y += 8;
  pdf.line(marginL, y, marginR, y);
  y += 14;

  // Totals section
  const totalsLabelX = marginR - 140;
  const totalsValueX = marginR;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');

  pdf.text('Subtotal:', totalsLabelX, y);
  pdf.text(formatCurrency(invoice.subtotal), totalsValueX, y, { align: 'right' });
  y += lineH;

  if (invoice.taxRate !== null && invoice.taxAmount !== null) {
    pdf.text(`Tax (${invoice.taxRate}%):`, totalsLabelX, y);
    pdf.text(formatCurrency(invoice.taxAmount), totalsValueX, y, { align: 'right' });
    y += lineH;
  }

  // Total line
  pdf.line(totalsLabelX, y - 4, marginR, y - 4);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('Total:', totalsLabelX, y + 6);
  pdf.text(formatCurrency(invoice.total), totalsValueX, y + 6, { align: 'right' });
  y += 30;

  // Status badge
  const isPaid = invoice.status === 'paid';
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');

  if (isPaid) {
    pdf.setTextColor(22, 163, 74); // green-600
    pdf.text('PAID', marginL, y);
    if (invoice.paidAt) {
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      const paidDate = invoice.paidAt.toDate
        ? format(invoice.paidAt.toDate(), 'MMM d, yyyy')
        : '';
      pdf.text(`Paid on ${paidDate}`, marginL, y + 14);
    }
  } else {
    pdf.setTextColor(220, 38, 38); // red-600
    pdf.text('UNPAID', marginL, y);
  }

  // Reset text color
  pdf.setTextColor(0, 0, 0);

  // 5. Download PDF
  const clientNameSafe = (client?.name ?? 'Client').replace(/\s+/g, '_');
  const invoiceNumSafe = invoice.invoiceNumber.replace(/\s+/g, '_');
  pdf.save(`${invoiceNumSafe}_${clientNameSafe}.pdf`);
}
