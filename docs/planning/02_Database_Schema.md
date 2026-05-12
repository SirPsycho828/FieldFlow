## Overview

FieldFlow uses Cloud Firestore as its sole database. The data model is organized around a top-level `users` collection with nested subcollections per user for clients, notes, files, invoices, and milestones. Each user's data is fully isolated -- there are no cross-user queries or shared collections.

All real-time listeners attach to subcollections under the authenticated user's document. The pipeline view uses a single listener on the `clients` subcollection, grouped by stage on the frontend.

## Dependencies

- `01_Auth.md` -- User document created on first sign-in
- `03_Security_Rules.md` -- Rules enforce ownership via `request.auth.uid`
- `04_Cloud_Functions.md` -- Functions read milestone and user docs for Calendar sync

## Collection Hierarchy

```
users/{uid}
  ├── clients/{clientId}
  │     ├── notes/{noteId}
  │     ├── files/{fileId}
  │     ├── invoices/{invoiceId}
  │     └── milestones/{milestoneId}
  └── activityLog/{activityId}
```

## Collections

### `users/{uid}`

**Purpose**: Architect's account, business profile, and settings. Created on first sign-in (see `01_Auth.md`).

| Field | Type | Notes |
|---|---|---|
| `uid` | string | Matches Auth UID and document ID |
| `email` | string | |
| `displayName` | string | |
| `createdAt` | Timestamp | |
| `updatedAt` | Timestamp | |
| `googleRefreshToken` | string \| null | Stored server-side only. Security rules must prevent client reads after initial write. See `03_Security_Rules.md` |
| `settings` | map | |
| `settings.stalenessThresholdDays` | number | Default: `14` |
| `settings.calendarSyncEnabled` | boolean | Default: `false`. Toggled from Settings page |
| `businessProfile` | map \| null | Null until configured in Settings |
| `businessProfile.name` | string | |
| `businessProfile.address` | string | |
| `businessProfile.email` | string | |
| `businessProfile.phone` | string | |
| `businessProfile.logoUrl` | string \| null | Points to Firebase Storage path |

---

### `users/{uid}/clients/{clientId}`

**Purpose**: One document per client. The pipeline view loads all non-archived client documents in a single query.

| Field | Type | Notes |
|---|---|---|
| `name` | string | Client's full name |
| `email` | string \| null | |
| `phone` | string \| null | |
| `address` | string \| null | Property/site address |
| `stage` | string | One of: `lead`, `consultation`, `proposal`, `active_design`, `installation`, `complete` |
| `stageOrder` | number | Sort position within a stage. Used for manual reordering within columns |
| `archived` | boolean | Default: `false`. Archived clients are excluded from pipeline view |
| `lastActivityAt` | Timestamp | Updated on any note, file upload, invoice, milestone, or stage change. Drives staleness detection |
| `propertyDetails` | map \| null | |
| `propertyDetails.lotSize` | string \| null | e.g., "0.5 acres" |
| `propertyDetails.soilType` | string \| null | |
| `propertyDetails.sunExposure` | string \| null | |
| `propertyDetails.existingFeatures` | string \| null | Freeform text |
| `budgetRange` | string \| null | Freeform, e.g., "$5,000 - $10,000" |
| `source` | string \| null | How the lead found the architect, e.g., "Referral", "Website" |
| `createdAt` | Timestamp | |
| `updatedAt` | Timestamp | |

**Querying**:
- Pipeline view: `where("archived", "==", false)` -- single listener, group by `stage` on frontend
- Archive view: `where("archived", "==", true)`

---

### `users/{uid}/clients/{clientId}/notes/{noteId}`

**Purpose**: Running log of architect-entered notes on a client. Displayed in reverse chronological order on the client card.

| Field | Type | Notes |
|---|---|---|
| `content` | string | Plain text note body |
| `createdAt` | Timestamp | |
| `updatedAt` | Timestamp \| null | Set if note is edited |

Notes are immutable after creation except for content edits. No delete at MVP.

---

### `users/{uid}/clients/{clientId}/files/{fileId}`

**Purpose**: Metadata for files uploaded to a client. Actual file bytes live in Firebase Storage. See `10_File_Management.md`.

| Field | Type | Notes |
|---|---|---|
| `name` | string | Original filename |
| `folder` | string | Auto-assigned: `photos`, `documents`, `designs`. Based on MIME type at upload |
| `mimeType` | string | e.g., `image/jpeg`, `application/pdf` |
| `sizeBytes` | number | |
| `storagePath` | string | Full Firebase Storage path |
| `thumbnailPath` | string \| null | Storage path to resized thumbnail. Populated by Resize Images extension for images. Null for non-image files |
| `uploadedAt` | Timestamp | |

**Folder assignment rules** (applied client-side at upload):

| MIME type pattern | Folder |
|---|---|
| `image/*` | `photos` |
| `application/pdf` | `documents` |
| Everything else | `designs` |

---

### `users/{uid}/clients/{clientId}/invoices/{invoiceId}`

**Purpose**: Invoice records. Tracking only -- no payment processing. See `11_Financials_Invoices.md`.

| Field | Type | Notes |
|---|---|---|
| `invoiceNumber` | string | User-entered or auto-generated (see below) |
| `date` | Timestamp | Invoice date |
| `dueDate` | Timestamp \| null | |
| `status` | string | `unpaid` or `paid`. Simple toggle |
| `lineItems` | array | |
| `lineItems[].description` | string | |
| `lineItems[].amount` | number | In cents to avoid floating point issues |
| `subtotal` | number | Sum of line items, in cents |
| `taxRate` | number \| null | Percentage, e.g., `8.5` for 8.5% |
| `taxAmount` | number \| null | Calculated: `subtotal * taxRate / 100`, in cents |
| `total` | number | `subtotal + taxAmount`, in cents |
| `paymentTerms` | string \| null | e.g., "Net 30" |
| `paidAt` | Timestamp \| null | Set when status toggled to `paid` |
| `createdAt` | Timestamp | |
| `updatedAt` | Timestamp | |

**Invoice number auto-generation**: If the user leaves the invoice number blank, generate as `INV-{YYYY}-{NNN}` where `NNN` is a zero-padded sequential count of invoices for that client. This is a convenience default -- the user can override it.

---

### `users/{uid}/clients/{clientId}/milestones/{milestoneId}`

**Purpose**: Scheduled events/tasks tied to a client. Each milestone can sync as a separate Google Calendar event. See `12_Milestones_Scheduling.md` and `13_Google_Calendar_Sync.md`.

| Field | Type | Notes |
|---|---|---|
| `title` | string | e.g., "Site Visit", "Install Start", "Final Walkthrough" |
| `date` | Timestamp | Scheduled date |
| `completed` | boolean | Default: `false` |
| `calendarEventId` | string \| null | Google Calendar event ID. Set by Cloud Function after sync. Null if sync disabled or pending |
| `createdAt` | Timestamp | |
| `updatedAt` | Timestamp | |

---

### `users/{uid}/activityLog/{activityId}`

**Purpose**: Auto-generated log entries for significant actions across all clients. Powers the activity feed and `lastActivityAt` updates. Entries are system-generated, not user-editable.

| Field | Type | Notes |
|---|---|---|
| `clientId` | string | Reference to the client this activity belongs to |
| `clientName` | string | Denormalized for display without extra reads |
| `type` | string | One of: `stage_change`, `note_added`, `file_uploaded`, `invoice_created`, `invoice_paid`, `milestone_created`, `milestone_completed`, `client_created`, `client_archived`, `client_restored` |
| `description` | string | Human-readable, e.g., "Moved to Active Design", "Added note", "Uploaded site-plan.pdf" |
| `createdAt` | Timestamp | |

**Write pattern**: Activity log entries are written client-side whenever the triggering action occurs. The write to `activityLog` and the update to the client's `lastActivityAt` should happen in the same batch write to ensure consistency.

## Composite Indexes

Firestore requires composite indexes for queries that combine filters and ordering across multiple fields.

| Collection | Fields | Purpose |
|---|---|---|
| `clients` | `archived` ASC, `stage` ASC, `stageOrder` ASC | Pipeline view: non-archived clients sorted within stages |
| `clients` | `archived` ASC, `lastActivityAt` ASC | Needs Attention: find stale non-archived clients |
| `activityLog` | `clientId` ASC, `createdAt` DESC | Activity log filtered by client |

## Storage Path Convention

Files in Firebase Storage follow this path structure:

```
users/{uid}/clients/{clientId}/files/{fileId}/{filename}
users/{uid}/clients/{clientId}/files/{fileId}/thumbnails/{filename}
users/{uid}/business/logo/{filename}
```

The Resize Images extension writes thumbnails to a `thumbnails` subfolder under the original file path. Configure the extension to generate a single thumbnail size: `200x200` for image previews.

## Data Integrity Patterns

**Batch writes**: Use Firestore batch writes when an action requires multiple document updates. Key scenarios:
- Creating a note: write note doc + update `client.lastActivityAt` + write activity log entry
- Uploading a file: write file metadata doc + update `client.lastActivityAt` + write activity log entry
- Changing stage: update `client.stage` + update `client.lastActivityAt` + write activity log entry

**Denormalization**: `clientName` is denormalized into activity log entries to avoid extra reads when displaying the log. If a client's name changes, existing activity log entries are not retroactively updated (acceptable tradeoff for read performance).

**Deletion cascade**: When a client is permanently deleted from the archive (see `15_Archive_Management.md`), all subcollection documents (notes, files, invoices, milestones) must also be deleted. Firestore does not cascade deletes automatically. Use a batched delete that iterates subcollections. Also delete associated Storage files.

## Gaps & Assumptions

| Gap | Default Applied |
|---|---|
| No explicit max line items per invoice | No limit enforced. UI will allow adding rows dynamically |
| No currency field on invoices | Assumes USD. Add currency field post-MVP if needed |
| No soft delete on notes | Notes cannot be deleted at MVP. Edit only |
| `stageOrder` rebalancing strategy not defined | Use fractional ordering (e.g., insert between 1.0 and 2.0 as 1.5). Rebalance to integers when gaps become too small |
| No explicit limit on activity log size | Activity log grows unbounded. Acceptable at MVP scale. Add pagination or TTL post-MVP |
| Property details fields are freeform | No structured validation on lot size, soil type, etc. Freeform strings are appropriate for the varied terminology landscape architects use |
| No file versioning | Uploading a file with the same name creates a new file document, not a version. Acceptable at MVP |  
