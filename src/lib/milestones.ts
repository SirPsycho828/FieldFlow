import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { addActivityEntry } from './activityLog';

export async function createMilestone(
  uid: string,
  clientId: string,
  clientName: string,
  title: string,
  date: Date
): Promise<string> {
  const batch = writeBatch(db);

  const milestoneRef = doc(
    collection(db, 'users', uid, 'clients', clientId, 'milestones')
  );

  batch.set(milestoneRef, {
    title,
    date,
    completed: false,
    calendarEventId: null,
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
    'milestone_created',
    `Created milestone: ${title}`
  );

  await batch.commit();
  return milestoneRef.id;
}

export async function updateMilestone(
  uid: string,
  clientId: string,
  milestoneId: string,
  data: { title?: string; date?: Date }
): Promise<void> {
  const milestoneRef = doc(
    db,
    'users',
    uid,
    'clients',
    clientId,
    'milestones',
    milestoneId
  );
  await updateDoc(milestoneRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteMilestone(
  uid: string,
  clientId: string,
  milestoneId: string
): Promise<void> {
  const milestoneRef = doc(
    db,
    'users',
    uid,
    'clients',
    clientId,
    'milestones',
    milestoneId
  );
  await deleteDoc(milestoneRef);
}

export async function toggleMilestoneComplete(
  uid: string,
  clientId: string,
  clientName: string,
  milestoneId: string,
  title: string,
  currentCompleted: boolean
): Promise<void> {
  const milestoneRef = doc(
    db,
    'users',
    uid,
    'clients',
    clientId,
    'milestones',
    milestoneId
  );

  if (!currentCompleted) {
    // Marking complete: batch update + lastActivityAt + activity log
    const batch = writeBatch(db);

    batch.update(milestoneRef, {
      completed: true,
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
      'milestone_completed',
      `Completed milestone: ${title}`
    );

    await batch.commit();
  } else {
    // Marking incomplete: just update the doc (no activity log)
    await updateDoc(milestoneRef, {
      completed: false,
      updatedAt: serverTimestamp(),
    });
  }
}
