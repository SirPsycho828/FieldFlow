import { type WriteBatch, doc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { ActivityType } from '@/types';

export function addActivityEntry(
  batch: WriteBatch,
  uid: string,
  clientId: string,
  clientName: string,
  type: ActivityType,
  description: string
) {
  const activityRef = doc(collection(db, 'users', uid, 'activityLog'));
  batch.set(activityRef, {
    clientId,
    clientName,
    type,
    description,
    createdAt: serverTimestamp(),
  });
}
