import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { addActivityEntry } from './activityLog';
import type { InvoiceDocument, LineItem } from '@/types';

export interface InvoiceFormData {
  invoiceNumber: string;
  date: Date;
  dueDate?: Date | null;
  paymentTerms?: string;
  lineItems: { description: string; amount: number }[]; // amounts in cents
  taxRate?: number | null;
  subtotal: number; // in cents
  taxAmount?: number | null; // in cents
  total: number; // in cents
}

// Generate invoice number: INV-{YYYY}-{NNN} zero-padded
export async function generateInvoiceNumber(
  uid: string,
  clientId: string
): Promise<string> {
  const year = new Date().getFullYear();
  const q = query(
    collection(db, 'users', uid, 'clients', clientId, 'invoices'),
    orderBy('createdAt', 'asc')
  );
  let count = 0;
  try {
    const snap = await getDocs(q);
    count = snap.size;
  } catch {
    count = 0;
  }
  const num = String(count + 1).padStart(3, '0');
  return `INV-${year}-${num}`;
}

// Create invoice: batch create invoice doc + update lastActivityAt + activity log
export async function createInvoice(
  uid: string,
  clientId: string,
  clientName: string,
  data: InvoiceFormData
): Promise<string> {
  const batch = writeBatch(db);

  const invoiceRef = doc(collection(db, 'users', uid, 'clients', clientId, 'invoices'));

  const lineItems: LineItem[] = data.lineItems.map((li) => ({
    description: li.description,
    amount: li.amount,
  }));

  batch.set(invoiceRef, {
    invoiceNumber: data.invoiceNumber,
    date: data.date,
    dueDate: data.dueDate ?? null,
    status: 'unpaid',
    lineItems,
    subtotal: data.subtotal,
    taxRate: data.taxRate ?? null,
    taxAmount: data.taxAmount ?? null,
    total: data.total,
    paymentTerms: data.paymentTerms ?? null,
    paidAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const clientRef = doc(db, 'users', uid, 'clients', clientId);
  batch.update(clientRef, {
    lastActivityAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  addActivityEntry(
    batch,
    uid,
    clientId,
    clientName,
    'invoice_created',
    `Invoice ${data.invoiceNumber} created`
  );

  await batch.commit();
  return invoiceRef.id;
}

// Update invoice: update invoice doc only (no activity log)
export async function updateInvoice(
  uid: string,
  clientId: string,
  invoiceId: string,
  data: InvoiceFormData
): Promise<void> {
  const invoiceRef = doc(db, 'users', uid, 'clients', clientId, 'invoices', invoiceId);

  const lineItems: LineItem[] = data.lineItems.map((li) => ({
    description: li.description,
    amount: li.amount,
  }));

  await updateDoc(invoiceRef, {
    invoiceNumber: data.invoiceNumber,
    date: data.date,
    dueDate: data.dueDate ?? null,
    lineItems,
    subtotal: data.subtotal,
    taxRate: data.taxRate ?? null,
    taxAmount: data.taxAmount ?? null,
    total: data.total,
    paymentTerms: data.paymentTerms ?? null,
    updatedAt: serverTimestamp(),
  });
}

// Delete invoice: delete invoice doc (no activity log)
export async function deleteInvoice(
  uid: string,
  clientId: string,
  invoiceId: string
): Promise<void> {
  const invoiceRef = doc(db, 'users', uid, 'clients', clientId, 'invoices', invoiceId);
  await deleteDoc(invoiceRef);
}

// Toggle invoice paid/unpaid status
export async function toggleInvoiceStatus(
  uid: string,
  clientId: string,
  clientName: string,
  invoiceId: string,
  invoiceNumber: string,
  currentStatus: InvoiceDocument['status']
): Promise<void> {
  const invoiceRef = doc(db, 'users', uid, 'clients', clientId, 'invoices', invoiceId);

  if (currentStatus === 'unpaid') {
    // Marking as paid: batch update status + paidAt + lastActivityAt + activity log
    const batch = writeBatch(db);

    batch.update(invoiceRef, {
      status: 'paid',
      paidAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const clientRef = doc(db, 'users', uid, 'clients', clientId);
    batch.update(clientRef, {
      lastActivityAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    addActivityEntry(
      batch,
      uid,
      clientId,
      clientName,
      'invoice_paid',
      `Marked invoice ${invoiceNumber} as paid`
    );

    await batch.commit();
  } else {
    // Marking as unpaid: update status + paidAt:null (no activity log)
    await updateDoc(invoiceRef, {
      status: 'unpaid',
      paidAt: null,
      updatedAt: serverTimestamp(),
    });
  }
}
