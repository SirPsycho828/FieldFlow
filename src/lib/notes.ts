import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { addActivityEntry } from './activityLog';

export async function addNote(
  uid: string,
  clientId: string,
  clientName: string,
  content: string
): Promise<string> {
  const batch = writeBatch(db);

  const noteRef = doc(collection(db, 'users', uid, 'clients', clientId, 'notes'));
  batch.set(noteRef, {
    content,
    createdAt: serverTimestamp(),
    updatedAt: null,
  });

  const clientRef = doc(db, 'users', uid, 'clients', clientId);
  batch.update(clientRef, {
    lastActivityAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  addActivityEntry(batch, uid, clientId, clientName, 'note_added', 'Note added');

  await batch.commit();
  return noteRef.id;
}

export async function updateNote(
  uid: string,
  clientId: string,
  noteId: string,
  content: string
): Promise<void> {
  const noteRef = doc(db, 'users', uid, 'clients', clientId, 'notes', noteId);
  await updateDoc(noteRef, {
    content,
    updatedAt: serverTimestamp(),
  });
}
