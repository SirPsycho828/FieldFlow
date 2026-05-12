import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  query,
  where,
  getDocs,
  orderBy,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { addActivityEntry } from './activityLog';
import type { Stage } from '@/types';

function getStageLabel(stage: Stage): string {
  const labels: Record<Stage, string> = {
    lead: 'Lead',
    consultation: 'Consultation',
    proposal: 'Proposal',
    active_design: 'Active Design',
    installation: 'Installation',
    complete: 'Complete',
  };
  return labels[stage];
}

// Create a new client
export async function createClient(
  uid: string,
  data: {
    name: string;
    email?: string | null;
    phone?: string | null;
    stage: Stage;
    source?: string | null;
  }
) {
  const batch = writeBatch(db);
  const clientRef = doc(collection(db, 'users', uid, 'clients'));

  // Get max stageOrder in target stage
  const stageQuery = query(
    collection(db, 'users', uid, 'clients'),
    where('stage', '==', data.stage),
    where('archived', '==', false),
    orderBy('stageOrder', 'desc')
  );

  let maxOrder = 0;
  try {
    const snap = await getDocs(stageQuery);
    if (!snap.empty) {
      maxOrder = snap.docs[0].data().stageOrder || 0;
    }
  } catch {
    // Index not yet deployed, default to 0
  }

  const clientDoc = {
    name: data.name,
    email: data.email || null,
    phone: data.phone || null,
    address: null,
    stage: data.stage,
    stageOrder: maxOrder + 1,
    archived: false,
    lastActivityAt: serverTimestamp(),
    propertyDetails: null,
    budgetRange: null,
    source: data.source || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  batch.set(clientRef, clientDoc);
  addActivityEntry(batch, uid, clientRef.id, data.name, 'client_created', 'Client created');
  await batch.commit();
  return clientRef.id;
}

// Update client stage (drag-and-drop or dropdown)
export async function updateClientStage(
  uid: string,
  clientId: string,
  clientName: string,
  newStage: Stage,
  newStageOrder: number
) {
  const batch = writeBatch(db);
  const clientRef = doc(db, 'users', uid, 'clients', clientId);

  batch.update(clientRef, {
    stage: newStage,
    stageOrder: newStageOrder,
    lastActivityAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  addActivityEntry(
    batch,
    uid,
    clientId,
    clientName,
    'stage_change',
    `Moved to ${getStageLabel(newStage)}`
  );
  await batch.commit();
}

// Update stageOrder only (within-column reorder, no activity log)
export async function updateClientOrder(uid: string, clientId: string, newOrder: number) {
  const clientRef = doc(db, 'users', uid, 'clients', clientId);
  await updateDoc(clientRef, { stageOrder: newOrder, updatedAt: serverTimestamp() });
}

// Update client fields
export async function updateClient(
  uid: string,
  clientId: string,
  _clientName: string,
  data: Record<string, unknown>
) {
  const batch = writeBatch(db);
  const clientRef = doc(db, 'users', uid, 'clients', clientId);

  batch.update(clientRef, {
    ...data,
    lastActivityAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}
