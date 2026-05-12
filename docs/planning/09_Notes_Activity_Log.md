## Overview

The Notes tab on the client detail page provides two things: a running log of architect-entered notes and an auto-generated activity feed. Notes are the primary way architects record observations, conversation summaries, and reminders about a client. The activity log is a read-only timeline of system events (stage changes, file uploads, invoice actions) that provides context without the architect needing to write it down.

## Dependencies

- `02_Database_Schema.md` -- `notes/{noteId}` and `activityLog/{activityId}` subcollection shapes
- `05_UI_Design_System.md` -- Card patterns, empty states, form error states, toast notifications
- `08_Client_Card_Profile.md` -- Tab structure, data loading strategy (load on tab activation)

## Notes Section

### Data Loading

Attach a Firestore real-time listener on `users/{uid}/clients/{clientId}/notes` ordered by `createdAt` descending when the Notes tab becomes active. Detach on tab switch or page unmount.

### Note Display

Notes appear as a vertical list, newest first. Each note is a simple block -- not a full card with borders, just content with clear separation.

```
┌──────────────────────────────────────┐
│ [+ Add Note]                         │
│                                      │
│ May 8, 2026 at 2:15 PM      [Edit]  │
│ Client wants to keep the existing    │
│ oak tree near the west fence.        │
│ Discussed drainage options for the   │
│ lower slope area.                    │
│ ──────────────────────────────────── │
│ May 3, 2026 at 10:30 AM     [Edit]  │
│ Initial consultation completed.      │
│ Very interested in native plants.    │
│ Budget is flexible.                  │
│ ──────────────────────────────────── │
│ Apr 28, 2026 at 4:45 PM     [Edit]  │
│ Referred by Martha Chen. Called to   │
│ inquire about backyard redesign.     │
└──────────────────────────────────────┘
```

### Note Item Layout

| Element | Styling |
|---|---|
| Timestamp | `text-xs text-muted-foreground`, formatted as `MMM d, yyyy 'at' h:mm a` via date-fns |
| Edit button | `ghost` icon button with `Pencil` icon, `text-muted-foreground`, right-aligned on same line as timestamp |
| Content | `text-sm text-foreground`, `whitespace-pre-wrap` to preserve line breaks |
| Separator | `border-b border-border` between notes, `py-4` vertical padding per note |

If `updatedAt` is set and differs from `createdAt`, show "(edited)" next to the timestamp in `text-xs text-muted-foreground italic`.

### Empty State

Lucide `FileText` icon, "No notes yet" heading, "Add a note to start tracking this client" description, "Add Note" button.

### Add Note

The "Add Note" button at the top of the notes list toggles an inline form that appears above the note list.

**Form**:
- Single `Textarea` field, auto-focused, minimum 3 rows, auto-expanding
- "Save" (primary, `sm` size) and "Cancel" (outline, `sm` size) buttons below the textarea
- No title field -- notes are untitled freeform text

**Validation**: Content is required and must not be empty/whitespace-only.

**On save** (batch write):
1. Create the note document in `clients/{clientId}/notes` with `content` and `createdAt`
2. Update `client.lastActivityAt` to server timestamp
3. Write activity log entry: type `note_added`, description "Added a note"
4. Clear the form, collapse back to button
5. Show success toast: "Note added"

The new note appears at the top of the list automatically via the real-time listener.

### Edit Note

Clicking the edit button on a note replaces that note's content display with an inline textarea pre-filled with the existing content.

**Form**: Same textarea + Save/Cancel pattern as Add Note, but inline at the note's position.

**On save**:
1. Update the note document: set `content` to new value, set `updatedAt` to server timestamp
2. No activity log entry for edits (to avoid noise)
3. No `lastActivityAt` update for edits (only new notes count as activity)
4. Collapse back to read mode
5. Show success toast: "Note updated"

**No delete**: Notes cannot be deleted at MVP. See `03_Security_Rules.md` -- note delete rules return `false`.

## Activity Log Section

### Placement

The activity log appears below the notes section on the same tab, separated by a section heading.

```
┌──────────────────────────────────────┐
│ Notes                                │
│ ... (notes list above) ...          │
│                                      │
│ Activity                             │
│                                      │
│ ● May 8  Moved to Active Design     │
│ ● May 3  Uploaded site-photos.zip   │
│ ● May 3  Added a note               │
│ ● Apr 28 Client created             │
└──────────────────────────────────────┘
```

### Data Loading

Query `users/{uid}/activityLog` with `where("clientId", "==", clientId)` ordered by `createdAt` descending. Use a real-time listener that activates with the Notes tab.

**Limit**: Load the most recent 50 activity entries. No pagination at MVP -- 50 entries covers months of activity for a typical client.

### Activity Item Layout

Each activity entry displays as a compact timeline row.

| Element | Styling |
|---|---|
| Dot indicator | `w-2 h-2 rounded-full bg-muted-foreground` inline before the content |
| Date | `text-xs text-muted-foreground`, formatted as `MMM d` (short format, no year unless different from current year) |
| Description | `text-sm text-foreground` |

### Activity Type Icons

Replace the generic dot with a type-specific Lucide icon for visual scanning.

| Activity Type | Icon | Color |
|---|---|---|
| `stage_change` | `ArrowRight` | `primary` |
| `note_added` | `FileText` | `muted-foreground` |
| `file_uploaded` | `Upload` | `muted-foreground` |
| `invoice_created` | `Receipt` | `muted-foreground` |
| `invoice_paid` | `CircleCheck` | `success` |
| `milestone_created` | `Calendar` | `muted-foreground` |
| `milestone_completed` | `CircleCheck` | `success` |
| `client_created` | `UserPlus` | `primary` |
| `client_archived` | `Archive` | `muted-foreground` |
| `client_restored` | `ArchiveRestore` | `primary` |

### Empty Activity State

Should never occur in practice because `client_created` is logged when the client is created. But as a safeguard: "No activity recorded" in `text-sm text-muted-foreground`.

## Writing Activity Log Entries

Activity log writes happen across multiple features. Each feature file describes when to write entries, but the pattern is consistent.

**Standard activity log entry creation**:

| Field | Value |
|---|---|
| `clientId` | The client's document ID |
| `clientName` | The client's current `name` field (denormalized) |
| `type` | One of the type constants listed above |
| `description` | Human-readable string describing what happened |
| `createdAt` | Server timestamp |

**Always written as part of a batch write** alongside the primary action and the `lastActivityAt` update on the client document. See `02_Database_Schema.md` for the batch write pattern.

**Description format examples**:

| Type | Description |
|---|---|
| `stage_change` | "Moved to Active Design" |
| `note_added` | "Added a note" |
| `file_uploaded` | "Uploaded site-plan.pdf" (include filename) |
| `invoice_created` | "Created invoice INV-2026-001" |
| `invoice_paid` | "Marked invoice INV-2026-001 as paid" |
| `milestone_created` | "Added milestone: Site Visit" |
| `milestone_completed` | "Completed milestone: Site Visit" |
| `client_created` | "Client created" |
| `client_archived` | "Client archived" |
| `client_restored` | "Client restored from archive" |

## Gaps & Assumptions

| Gap | Default Applied |
|---|---|
| No rich text or markdown in notes | Plain text only with preserved line breaks. Rich text adds editor complexity. Sufficient for the quick observational notes architects write |
| No note search | Not needed at 5-15 clients with moderate note volume. Post-MVP consideration |
| No attachments on notes | Files are managed in the Files tab. Notes are text-only. If an architect wants to reference a file, they mention it by name |
| No pinned or starred notes | All notes are equal. No prioritization mechanism. Newest-first ordering is sufficient |
| Activity log has no filtering | All activity types shown in one list. At MVP volume, filtering adds UI complexity without meaningful benefit |
| `clientName` in activity log may become stale | If a client's name is edited, existing activity entries keep the old name. Acceptable tradeoff documented in `02_Database_Schema.md` |
| No character limit on notes | Firestore documents have a 1 MB limit. A single note would need to be extraordinarily long to approach this. No client-side limit enforced |
| Activity log limited to 50 entries | Oldest entries are not visible. At MVP scale this covers months of activity. Add pagination post-MVP if clients have very long histories |  
