import { ref, uploadBytesResumable, getDownloadURL, deleteObject, type UploadTask } from 'firebase/storage';
import { storage } from './firebase';

export function uploadFile(
  path: string,
  file: File,
  onProgress?: (progress: number) => void
): { task: UploadTask; promise: Promise<string> } {
  const storageRef = ref(storage, path);
  const task = uploadBytesResumable(storageRef, file);

  const promise = new Promise<string>((resolve, reject) => {
    task.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(progress);
      },
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      }
    );
  });

  return { task, promise };
}

export async function deleteStorageFile(path: string): Promise<void> {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (err: unknown) {
    // Ignore file-not-found errors during cleanup
    if ((err as { code?: string }).code !== 'storage/object-not-found') throw err;
  }
}

export async function getFileDownloadUrl(path: string): Promise<string> {
  const storageRef = ref(storage, path);
  return getDownloadURL(storageRef);
}
