import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { collection, doc } from 'firebase/firestore';
import { toast } from 'sonner';
import {
  Upload,
  FileText,
  File,
  Trash2,
  Download,
  ChevronDown,
  ChevronRight,
  X,
  Image,
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { uploadFile } from '@/lib/storage';
import {
  getFolderFromMimeType,
  getThumbnailPath,
  createFileMetadata,
  deleteFile,
} from '@/lib/files';
import { getFileDownloadUrl } from '@/lib/storage';
import { useFiles } from '@/hooks/useFiles';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/EmptyState';
import type { FileDocument, FileFolder } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FOLDER_LABELS: Record<FileFolder, string> = {
  photos: 'Photos',
  documents: 'Documents',
  designs: 'Designs',
};

const FOLDER_ORDER: FileFolder[] = ['photos', 'documents', 'designs'];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const MAX_FILES = 10;

const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
  'image/svg+xml': ['.svg'],
  'application/zip': ['.zip'],
  'application/illustrator': ['.ai'],
  'image/vnd.adobe.photoshop': ['.psd'],
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UploadProgress {
  fileId: string;
  name: string;
  progress: number;
}

// ---------------------------------------------------------------------------
// Thumbnail image with retry logic
// ---------------------------------------------------------------------------

interface ThumbnailProps {
  thumbnailPath: string | null;
  name: string;
}

function ThumbnailImage({ thumbnailPath, name }: ThumbnailProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const retryCount = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const scheduleRetry = useCallback(() => {
    if (retryCount.current >= 5) {
      setStatus('error');
      return;
    }
    retryTimer.current = setTimeout(
      () => {
        retryCount.current += 1;
        if (imgRef.current && thumbnailPath) {
          // Bust cache by appending a timestamp query param
          imgRef.current.src = thumbnailPath + '?r=' + Date.now();
        }
      },
      3000
    );
  }, [thumbnailPath]);

  if (!thumbnailPath) return null;

  return (
    <>
      {status === 'loading' && (
        <Skeleton className="absolute inset-0 rounded-none" />
      )}
      <img
        ref={imgRef}
        src={thumbnailPath}
        alt={name}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity ${
          status === 'loaded' ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => {
          if (retryTimer.current) clearTimeout(retryTimer.current);
          setStatus('loaded');
        }}
        onError={scheduleRetry}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// File card
// ---------------------------------------------------------------------------

interface FileCardProps {
  file: FileDocument;
  onDelete: (file: FileDocument) => void;
}

function FileCard({ file, onDelete }: FileCardProps) {
  const [downloading, setDownloading] = useState(false);
  const isImage = file.mimeType.startsWith('image/');
  const isPdf = file.mimeType === 'application/pdf';

  async function handleDownload() {
    try {
      setDownloading(true);
      const url = await getFileDownloadUrl(file.storagePath);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Could not download file');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="group relative rounded-lg border bg-card overflow-hidden hover:shadow-md transition-shadow">
      {/* Preview area */}
      <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
        {isImage && file.thumbnailPath ? (
          <ThumbnailImage thumbnailPath={file.thumbnailPath} name={file.name} />
        ) : isPdf ? (
          <FileText className="h-10 w-10 text-muted-foreground" />
        ) : (
          <File className="h-10 w-10 text-muted-foreground" />
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8"
            onClick={handleDownload}
            disabled={downloading}
            title="Download"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="destructive"
            className="h-8 w-8"
            onClick={() => onDelete(file)}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* File info */}
      <div className="p-2">
        <p className="text-xs font-medium truncate" title={file.name}>
          {file.name}
        </p>
        <p className="text-xs text-muted-foreground">{formatFileSize(file.sizeBytes)}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Folder section
// ---------------------------------------------------------------------------

interface FolderSectionProps {
  folder: FileFolder;
  files: FileDocument[];
  onDelete: (file: FileDocument) => void;
}

function FolderSection({ folder, files, onDelete }: FolderSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const label = FOLDER_LABELS[folder];

  return (
    <div>
      <button
        className="flex w-full items-center gap-2 py-2 text-sm font-semibold text-foreground hover:text-foreground/80 transition-colors"
        onClick={() => setExpanded(prev => !prev)}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        {label}
        <Badge variant="secondary" className="ml-1 text-xs">
          {files.length}
        </Badge>
      </button>

      {expanded && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-2 mb-4">
          {files.map(file => (
            <FileCard key={file.id} file={file} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upload progress list
// ---------------------------------------------------------------------------

interface UploadProgressListProps {
  uploads: UploadProgress[];
  onCancel: (fileId: string) => void;
}

function UploadProgressList({ uploads, onCancel }: UploadProgressListProps) {
  if (uploads.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {uploads.map(upload => (
        <div key={upload.fileId} className="rounded-lg border bg-card p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium truncate max-w-[80%]">{upload.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {Math.round(upload.progress)}%
              </span>
              <button
                onClick={() => onCancel(upload.fileId)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Cancel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${upload.progress}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main FilesTab component
// ---------------------------------------------------------------------------

interface FilesTabProps {
  clientId: string;
  clientName: string;
}

export function FilesTab({ clientId, clientName }: FilesTabProps) {
  const { user } = useAuth();
  const { files, filesByFolder, loading } = useFiles(clientId);

  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  // Map fileId -> UploadTask (for cancellation)
  const uploadTasksRef = useRef<Map<string, ReturnType<typeof uploadFile>['task']>>(new Map());

  const [deleteTarget, setDeleteTarget] = useState<FileDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  // -------------------------------------------------------------------------
  // Upload handler
  // -------------------------------------------------------------------------

  const handleFiles = useCallback(
    async (acceptedFiles: File[]) => {
      if (!user) return;

      const toUpload = acceptedFiles.slice(0, MAX_FILES);

      for (const file of toUpload) {
        // Generate Firestore doc ID
        const fileRef = doc(collection(db, 'users', user.uid, 'clients', clientId, 'files'));
        const fileId = fileRef.id;

        const folder = getFolderFromMimeType(file.type);
        const dirPath = `users/${user.uid}/clients/${clientId}/files/${fileId}`;
        const storagePath = `${dirPath}/${file.name}`;
        const thumbnailPath = file.type.startsWith('image/')
          ? getThumbnailPath(dirPath, file.name)
          : null;

        // Register in progress list
        setUploads(prev => [...prev, { fileId, name: file.name, progress: 0 }]);

        const { task, promise } = uploadFile(storagePath, file, (progress) => {
          setUploads(prev =>
            prev.map(u => (u.fileId === fileId ? { ...u, progress } : u))
          );
        });

        uploadTasksRef.current.set(fileId, task);

        promise
          .then(async () => {
            uploadTasksRef.current.delete(fileId);

            await createFileMetadata(user.uid, clientId, clientName, fileId, {
              name: file.name,
              folder,
              mimeType: file.type,
              sizeBytes: file.size,
              storagePath,
              thumbnailPath,
            });

            setUploads(prev => prev.filter(u => u.fileId !== fileId));
            toast.success(`${file.name} uploaded`);
          })
          .catch((err: unknown) => {
            // Cancelled uploads are silently dropped
            const code = (err as { code?: string }).code;
            if (code === 'storage/canceled') {
              setUploads(prev => prev.filter(u => u.fileId !== fileId));
              return;
            }
            uploadTasksRef.current.delete(fileId);
            setUploads(prev => prev.filter(u => u.fileId !== fileId));
            toast.error(`Failed to upload ${file.name}`);
          });
      }
    },
    [user, clientId, clientName]
  );

  // -------------------------------------------------------------------------
  // Cancel upload
  // -------------------------------------------------------------------------

  function handleCancelUpload(fileId: string) {
    const task = uploadTasksRef.current.get(fileId);
    if (task) {
      task.cancel();
      uploadTasksRef.current.delete(fileId);
    }
    setUploads(prev => prev.filter(u => u.fileId !== fileId));
  }

  // -------------------------------------------------------------------------
  // Delete file
  // -------------------------------------------------------------------------

  async function handleDeleteConfirm() {
    if (!user || !deleteTarget) return;
    setDeleting(true);
    try {
      await deleteFile(
        user.uid,
        clientId,
        deleteTarget.id!,
        deleteTarget.storagePath,
        deleteTarget.thumbnailPath
      );
      toast.success(`${deleteTarget.name} deleted`);
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete file');
    } finally {
      setDeleting(false);
    }
  }

  // -------------------------------------------------------------------------
  // Dropzone
  // -------------------------------------------------------------------------

  const onDrop = useCallback(
    (accepted: File[], rejected: Parameters<Parameters<typeof useDropzone>[0]['onDrop'] & {}>[1]) => {
      if (rejected && rejected.length > 0) {
        const reasons = rejected
          .map(r => r.errors.map((e: { message: string }) => e.message).join(', '))
          .slice(0, 3)
          .join('; ');
        toast.error(`Some files were rejected: ${reasons}`);
      }
      if (accepted.length > 0) {
        handleFiles(accepted);
      }
    },
    [handleFiles]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    maxFiles: MAX_FILES,
    noClick: true,
    noKeyboard: true,
  });

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const hasFiles = files.length > 0;
  const hasUploads = uploads.length > 0;

  return (
    <>
      <div
        {...getRootProps()}
        className={`relative min-h-[400px] rounded-lg transition-all duration-200 ${
          isDragActive
            ? 'border-2 border-dashed border-primary bg-primary/5'
            : 'border-2 border-transparent'
        }`}
      >
        <input {...getInputProps()} />

        {/* Drag-over overlay */}
        {isDragActive && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg pointer-events-none">
            <Upload className="h-10 w-10 text-primary mb-2" />
            <p className="text-base font-semibold text-primary">Drop files to upload</p>
          </div>
        )}

        <div className={isDragActive ? 'opacity-20 pointer-events-none' : ''}>
          {/* Upload button row */}
          <div className="flex justify-end mb-4">
            <Button onClick={open} size="sm" className="gap-1.5">
              <Upload className="h-4 w-4" />
              Upload Files
            </Button>
          </div>

          {/* Active upload progress */}
          <UploadProgressList uploads={uploads} onCancel={handleCancelUpload} />

          {/* File content */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border overflow-hidden">
                  <Skeleton className="aspect-square w-full" />
                  <div className="p-2 space-y-1">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : !hasFiles && !hasUploads ? (
            <EmptyState
              icon={Upload}
              heading="No files yet"
              description="Drag and drop files or click to upload"
              actionLabel="Upload Files"
              onAction={open}
            />
          ) : (
            <div className="divide-y divide-border">
              {FOLDER_ORDER.map(folder => {
                const folderFiles = filesByFolder[folder];
                if (folderFiles.length === 0) return null;
                return (
                  <div key={folder} className="py-2">
                    <FolderSection
                      folder={folder}
                      files={folderFiles}
                      onDelete={setDeleteTarget}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete file</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{' '}
            <span className="font-medium text-foreground">{deleteTarget?.name}</span>? This cannot
            be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
