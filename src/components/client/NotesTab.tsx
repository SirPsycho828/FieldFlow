import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  FileText,
  Upload,
  Receipt,
  CircleCheck,
  Calendar,
  UserPlus,
  Archive,
  ArchiveRestore,
  ArrowRight,
  Pencil,
  Loader2,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useNotes } from '@/hooks/useNotes';
import { useActivityLog } from '@/hooks/useActivityLog';
import { addNote, updateNote } from '@/lib/notes';
import { useAuth } from '@/contexts/AuthContext';
import type { ActivityType, ClientDocument } from '@/types';

interface NotesTabProps {
  client: ClientDocument;
}

function formatNoteDate(ts: { toDate: () => Date } | null | undefined): string {
  if (!ts) return '';
  return format(ts.toDate(), "MMM d, yyyy 'at' h:mm a");
}

function formatActivityDate(ts: { toDate: () => Date } | null | undefined): string {
  if (!ts) return '';
  return format(ts.toDate(), 'MMM d');
}

interface ActivityIconProps {
  type: ActivityType;
}

function ActivityIcon({ type }: ActivityIconProps) {
  const map: Record<ActivityType, { icon: React.ElementType; className: string }> = {
    stage_change: { icon: ArrowRight, className: 'text-primary' },
    note_added: { icon: FileText, className: 'text-muted-foreground' },
    file_uploaded: { icon: Upload, className: 'text-muted-foreground' },
    invoice_created: { icon: Receipt, className: 'text-muted-foreground' },
    invoice_paid: { icon: CircleCheck, className: 'text-green-600' },
    milestone_created: { icon: Calendar, className: 'text-muted-foreground' },
    milestone_completed: { icon: CircleCheck, className: 'text-green-600' },
    client_created: { icon: UserPlus, className: 'text-primary' },
    client_archived: { icon: Archive, className: 'text-muted-foreground' },
    client_restored: { icon: ArchiveRestore, className: 'text-primary' },
  };

  const { icon: Icon, className } = map[type] ?? { icon: FileText, className: 'text-muted-foreground' };
  return <Icon className={`h-3.5 w-3.5 shrink-0 ${className}`} />;
}

export function NotesTab({ client }: NotesTabProps) {
  const { user } = useAuth();
  const { notes, loading: notesLoading } = useNotes(client.id!);
  const { activities, loading: activitiesLoading } = useActivityLog(client.id!);

  const [addingNote, setAddingNote] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [savingNew, setSavingNew] = useState(false);

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleAddNote = () => {
    setAddingNote(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleSaveNew = async () => {
    if (!user || !client.id || !newContent.trim()) return;
    setSavingNew(true);
    try {
      await addNote(user.uid, client.id, client.name, newContent.trim());
      setNewContent('');
      setAddingNote(false);
      toast.success('Note added');
    } catch {
      toast.error('Failed to add note');
    } finally {
      setSavingNew(false);
    }
  };

  const handleStartEdit = (noteId: string, content: string) => {
    setEditingNoteId(noteId);
    setEditContent(content);
  };

  const handleSaveEdit = async () => {
    if (!user || !client.id || !editingNoteId || !editContent.trim()) return;
    setSavingEdit(true);
    try {
      await updateNote(user.uid, client.id, editingNoteId, editContent.trim());
      setEditingNoteId(null);
      toast.success('Note updated');
    } catch {
      toast.error('Failed to update note');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Notes section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Notes</h3>
          {!addingNote && (
            <Button variant="outline" size="sm" onClick={handleAddNote}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Note
            </Button>
          )}
        </div>

        {addingNote && (
          <div className="mb-4 space-y-2">
            <Textarea
              ref={textareaRef}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Write a note…"
              rows={3}
              className="resize-none"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveNew} disabled={savingNew || !newContent.trim()}>
                {savingNew ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setAddingNote(false); setNewContent(''); }}
                disabled={savingNew}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {notesLoading ? (
          <p className="text-sm text-muted-foreground">Loading notes…</p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No notes yet. Add one above.</p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => {
              const isEditing = editingNoteId === note.id;
              const wasEdited = note.updatedAt !== null && note.updatedAt !== undefined;

              return (
                <div key={note.id} className="border border-border rounded-md p-3 space-y-1.5 bg-card">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {formatNoteDate(note.createdAt)}
                      {wasEdited && <span className="ml-1 italic">(edited)</span>}
                    </span>
                    {!isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => handleStartEdit(note.id!, note.content)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        className="resize-none"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit} disabled={savingEdit || !editContent.trim()}>
                          {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingNoteId(null)}
                          disabled={savingEdit}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Activity section */}
      <div>
        <h3 className="text-sm font-semibold mb-4">Activity</h3>
        {activitiesLoading ? (
          <p className="text-sm text-muted-foreground">Loading activity…</p>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No activity yet.</p>
        ) : (
          <div className="space-y-2">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-2.5">
                <div className="mt-0.5">
                  <ActivityIcon type={activity.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">{activity.description}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatActivityDate(activity.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
