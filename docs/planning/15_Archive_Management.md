## Overview

Archiving is how architects move completed or inactive clients off the pipeline board without losing their data. Archived clients disappear from the pipeline view and the Needs Attention system but remain fully accessible in a dedicated Archive page. From the archive, clients can be restored to the pipeline or permanently deleted. Permanent deletion is the only destructive action in FieldFlow and cascades through all subcollections and Storage files.

## Dependencies

- `02_Database_Schema.md` -- `client.archived` field, subcollection structure for cascade deletion
- `03_Security_Rules.md` -- Client delete rules, note delete restriction (bypassed during cascade)
- `05_UI_Design_System.md` -- Destructive button variant, confirmation dialogs, empty states, toast notifications
- `06_Layout_Navigation.md` -- Archive page route (`/archive`), sidebar nav item
- `07_Pipeline_View.md` -- Pipeline query filters `archived == false`

## Archive Action

### Trigger Points

Archiving a client can be initiated from:
1. **Client detail page** -- Actions menu (three-dot) contains "Archive" option
2. **Pipeline card** -- Right-click context menu or card actions dropdown (if implemented). At MVP, the detail page action menu is sufficient.

### Confirmation Dialog

Show a shadcn/ui `Dialog` on archive action:

- **Title**: "Archive {client.name}?"
- **Description**: "This client will be removed from your pipeline. You can restore them anytime from the Archive."
- **Actions**: "Cancel" (outline) and "Archive" (primary, not destructive -- archiving is safe)

No destructive styling because archiving is fully reversible.

### On Confirm

Batch write:
1. Update client document: `archived: true`, `updatedAt: serverTimestamp()`
2. Update `client.lastActivityAt` to server timestamp
3. Write activity log entry: type `client_archived`, description "Client archived"
4. Navigate to `/` (pipeline view)
5. Show toast: "Client archived" with a clickable "View Archive" link

The client disappears from the pipeline immediately via the real-time listener (pipeline query filters `archived == false`).

## Archive Page

### Route

`/archive` -- accessible from the sidebar navigation.

### Data Loading

Firestore query on `users/{uid}/clients` with `where("archived", "==", true)` ordered by `updatedAt` descending (most recently archived first). Use a real-time listener.

### Layout

```
┌──────────────────────────────────────────────────┐
│ Archive                                           │
│                                                   │
│ ┌───────────────────────────────────────────────┐ │
│ │ Johnson Residence                             │ │
│ │ Last active: Mar 15, 2026 · Archived: May 1  │ │
│ │ Stage when archived: Complete                 │ │
│ │                          [Restore]  [Delete]  │ │
│ ├───────────────────────────────────────────────┤ │
│ │ Old Lead - Smith                              │ │
│ │ Last active: Jan 8, 2026 · Archived: Feb 20  │ │
│ │ Stage when archived: Lead                     │ │
│ │                          [Restore]  [Delete]  │ │
│ └───────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

### Archive Row

Each archived client displays as a list row:

| Element | Styling |
|---|---|
| Client name | `text-sm font-semibold`. Clickable -- navigates to client detail page |
| Last active date | `text-xs text-muted-foreground`, formatted from `lastActivityAt` |
| Archived date | `text-xs text-muted-foreground`, formatted from `updatedAt` |
| Stage when archived | `text-xs text-muted-foreground`, display label of `stage` field |
| Restore button | `outline` variant, Lucide `ArchiveRestore` icon, "Restore" label |
| Delete button | `destructive` variant, Lucide `Trash2` icon, "Delete" label |

**Clicking the client name**: Navigates to `/clients/:clientId`. The client detail page works the same for archived clients, but the header actions menu shows "Restore" instead of "Archive", and "Delete" is available.

### Empty State

Lucide `Archive` icon, "Archive is empty" heading, "Completed or inactive clients will appear here" description. No action button.

## Restore Action

Returns an archived client to the pipeline board.

### On Click

No confirmation dialog needed. Restoring is safe and immediately visible.

Batch write:
1. Update client document: `archived: false`, `updatedAt: serverTimestamp()`
2. Update `client.lastActivityAt` to server timestamp
3. Write activity log entry: type `client_restored`, description "Client restored from archive"
4. Show toast: "{client.name} restored to pipeline"

The client reappears in the pipeline at the bottom of whatever stage they were in when archived. Set `stageOrder` to `max(existing orders in that stage) + 1.0`.

The client disappears from the archive list via the real-time listener.

### Navigating After Restore

If the architect is on the Archive page, the client row disappears. No navigation change.

If the architect is on the client detail page and clicks Restore in the header actions, remain on the client detail page. The header actions menu switches back to showing "Archive" instead of "Restore".

## Permanent Delete

Permanent deletion is irreversible. It removes the client document, all subcollection documents (notes, files, invoices, milestones), all associated Storage files, and any linked Google Calendar events.

### Availability

Permanent delete is **only available from the archive**. Active clients on the pipeline cannot be deleted directly -- they must be archived first. This two-step pattern prevents accidental data loss.

Delete is accessible from:
1. The delete button on the archive row
2. The actions menu on the client detail page (only when `archived == true`)

### Confirmation Dialog

Stronger confirmation than archive, using destructive styling:

- **Title**: "Permanently delete {client.name}?"
- **Description**: "This will delete all notes, files, invoices, milestones, and calendar events for this client. This action cannot be undone."
- **Actions**: "Cancel" (outline) and "Delete permanently" (`destructive` variant)

### Deletion Cascade

The delete operation must remove data from three systems: Firestore, Firebase Storage, and Google Calendar.

**Step 1: Delete milestones** (triggers Calendar cleanup)

Query all documents in `clients/{clientId}/milestones`. Delete each one individually. Each deletion triggers the `onMilestoneWrite` Cloud Function (delete case), which removes the corresponding Google Calendar event if `calendarEventId` exists (see `04_Cloud_Functions.md`).

**Step 2: Delete other subcollections**

Query and delete all documents in:
- `clients/{clientId}/notes`
- `clients/{clientId}/files`
- `clients/{clientId}/invoices`

Use batched deletes (Firestore batch limit is 500 operations per batch). For each subcollection, query all documents and delete in batches.

**Step 3: Delete Storage files**

For each file metadata document deleted in Step 2, delete the corresponding files from Firebase Storage:
- Original file at `storagePath`
- Thumbnail at `thumbnailPath` (if it exists)

Storage deletions can fail silently -- orphaned files are a minor cost concern, not a data integrity issue.

**Step 4: Delete activity log entries**

Query `users/{uid}/activityLog` where `clientId == {clientId}`. Delete all matching documents in batches.

**Step 5: Delete client document**

After all subcollections and related data are cleaned up, delete the client document itself.

**Step 6: UI feedback**

Show toast: "Client permanently deleted". If on the client detail page, navigate to `/archive`.

### Handling Note Delete Restriction

The Firestore security rules in `03_Security_Rules.md` set `allow delete: if false` for notes (notes are not deletable at MVP). However, cascade deletion during permanent client delete needs to delete notes.

**Resolution**: Cascade deletion should use the same authenticated client that has delete permission on the client document. Update the notes security rule to allow deletion when the parent client is being deleted -- or, more practically, change the notes delete rule to:

```
allow delete: if isOwner(uid);
```

This means individual note deletion becomes possible from the UI, which contradicts the "no note deletion at MVP" decision. The simpler approach: keep `allow delete: if false` for the MVP no-delete UX, but perform cascade note deletion via a Cloud Function using Admin SDK (bypasses rules).

**Recommended**: Add a `onClientDeleted` Cloud Function that handles subcollection cleanup using Admin SDK. This cleanly separates the cascade from client-side permissions. The client-side delete only deletes the client document; the function handles the rest.

### Deletion Performance

For a typical client with 10-20 notes, 5-10 files, 3-5 invoices, and 3-5 milestones, the cascade involves ~30-40 document deletions plus Storage file deletions. This completes in a few seconds.

Show a loading state on the delete button (spinner, disabled) during the operation. The client document deletion is the last step, so the archive list updates only after everything is cleaned up if done client-side, or immediately if the Cloud Function handles subcollections.

## Gaps & Assumptions

| Gap | Default Applied |
|---|---|
| No bulk archive or bulk delete | Clients are archived and deleted one at a time. Sufficient at 5-15 client scale |
| No auto-archive | Clients in the "Complete" stage are not automatically archived after a period. The architect manually decides when to archive |
| No export before delete | No "download all data" option before permanent deletion. Architects should ensure they have any needed files before deleting |
| No soft delete or trash period | Permanent delete is immediate. No 30-day recovery window. The two-step archive-then-delete pattern serves as the safety net |
| Cascade deletion order matters | Milestones must be deleted first to trigger Calendar cleanup via Cloud Function. If the client document is deleted first, the function loses access to user context |
| Note deletion rule conflict | The security rules say no note deletion, but cascade requires it. Resolved by using Admin SDK in a Cloud Function for cascade operations |
| Storage deletion failures are silent | If a Storage file fails to delete during cascade, it becomes orphaned. At MVP scale the cost is negligible. Add a cleanup job post-MVP |
| No archive date field | The `updatedAt` timestamp serves as the archive date. This is slightly imprecise if the client is edited and then archived in separate actions, but sufficient for display purposes |  
