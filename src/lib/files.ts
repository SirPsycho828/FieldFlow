import { collection, doc, writeBatch, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { addActivityEntry } from './activityLog';
import { deleteStorageFile } from './storage';
import type { FileFolder } from '@/types';

// Determine folder from MIME type
export function getFolderFromMimeType(mimeType: string): FileFolder {
  if (mimeType.startsWith('image/')) return 'photos';
  if (mimeType === 'application/pdf') return 'documents';
  return 'designs';
}

// Predict thumbnail path for images
export function getThumbnailPath(storagePath: string, filename: string): string {
  const ext = filename.split('.').pop();
  const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
  return `${storagePath}/thumbnails/${nameWithoutExt}_200x200.${ext}`;
}

// Create file metadata document after upload
export async function createFileMetadata(
  uid: string,
  clientId: string,
  clientName: string,
  fileId: string,
  data: {
    name: string;
    folder: FileFolder;
    mimeType: string;
    sizeBytes: number;
    storagePath: string;
    thumbnailPath: string | null;
  }
) {
  const batch = writeBatch(db);
  const fileRef = doc(db, 'users', uid, 'clients', clientId, 'files', fileId);

  batch.set(fileRef, {
    ...data,
    uploadedAt: serverTimestamp(),
  });

  // Update client lastActivityAt
  const clientRef = doc(db, 'users', uid, 'clients', clientId);
  batch.update(clientRef, { lastActivityAt: serverTimestamp(), updatedAt: serverTimestamp() });

  // Activity log
  addActivityEntry(batch, uid, clientId, clientName, 'file_uploaded', `Uploaded ${data.name}`);

  await batch.commit();
}

// Delete file: remove from Storage + Firestore
export async function deleteFile(
  uid: string,
  clientId: string,
  fileId: string,
  storagePath: string,
  thumbnailPath: string | null
) {
  // Delete from Storage
  await deleteStorageFile(storagePath);
  if (thumbnailPath) {
    await deleteStorageFile(thumbnailPath);
  }
  // Delete Firestore metadata
  await deleteDoc(doc(db, 'users', uid, 'clients', clientId, 'files', fileId));
}
