▸ Extended thinking (541 chars)  
## Overview

FieldFlow uses Firebase Cloud Functions (2nd gen) for two purposes: syncing milestones to Google Calendar and generating image thumbnails via the Resize Images extension. All other operations happen client-side against Firestore and Storage directly. Functions run on Node.js 20 LTS with TypeScript and use the Admin SDK to bypass security rules when reading tokens and writing Calendar event IDs.

## Dependencies

- `01_Auth.md` -- Google OAuth refresh token captured at sign-in
- `02_Database_Schema.md` -- Milestone and user document shapes, `private/tokens` subcollection
- `03_Security_Rules.md` -- Functions use Admin SDK, bypassing client rules
- `13_Google_Calendar_Sync.md` -- Detailed sync behavior and edge cases

## Project Structure

```
functions/
  src/
    index.ts              # Function exports
    calendar/
      sync.ts             # Calendar sync logic
      googleClient.ts     # Google OAuth client setup and token refresh
    types.ts              # Shared TypeScript types
  package.json
  tsconfig.json
```

Functions use their own `package.json` separate from the frontend. Key dependencies:

| Package | Purpose |
|---|---|
| `firebase-functions` (2nd gen) | Function triggers and configuration |
| `firebase-admin` | Admin SDK for Firestore and Auth |
| `googleapis` | Google Calendar API client |

## Function 1: onMilestoneWrite

**Trigger**: Firestore `onDocumentWritten` on `users/{uid}/clients/{clientId}/milestones/{milestoneId}`

This single function handles milestone creation, updates, and deletion by inspecting the change type.

### Trigger Behavior

| Change Type | Detection | Action |
|---|---|---|
| Create | `!change.before.exists && change.after.exists` | Create Calendar event |
| Update | `change.before.exists && change.after.exists` | Update Calendar event |
| Delete | `change.before.exists && !change.after.exists` | Delete Calendar event |

### Execution Flow

**Step 1: Check if Calendar sync is enabled**

Read the user document at `users/{uid}`. If `settings.calendarSyncEnabled` is `false`, exit early. Do not create, update, or delete any Calendar events.

**Step 2: Get the refresh token**

Read `users/{uid}/private/tokens`. Extract `googleRefreshToken`. If the token is null or missing, log a warning and exit. The user has sync enabled but no valid token -- this state is handled in the UI (see `16_Settings_Page.md`).

**Step 3: Build the Google Calendar client**

Use the `googleapis` library to create an OAuth2 client. Set the refresh token and obtain a fresh access token. Handle `invalid_grant` errors by:
1. Clearing the stored refresh token from `users/{uid}/private/tokens`
2. Setting `users/{uid}/settings.calendarSyncEnabled` to `false`
3. Exiting without error (the user will see sync is disabled and can re-authorize)

**Step 4: Perform the Calendar operation**

For **create**:
- Build a Calendar event from the milestone data (see event format below)
- Insert the event via `calendar.events.insert`
- Write the returned `eventId` back to the milestone document at `calendarEventId`

For **update**:
- Read the existing `calendarEventId` from the before snapshot
- If `calendarEventId` exists, update the event via `calendar.events.update`
- If `calendarEventId` is null (previous sync failed), create a new event instead

For **delete**:
- Read the `calendarEventId` from the before snapshot
- If it exists, delete the event via `calendar.events.delete`
- If the Calendar event is already gone (404), swallow the error silently

### Calendar Event Format

| Field | Value |
|---|---|
| `summary` | `"{milestone.title} - {client.name}"` |
| `start.date` | Milestone date as all-day event (YYYY-MM-DD) |
| `end.date` | Same as start (single-day event) |
| `description` | `"FieldFlow client: {client.name}"` |
| `reminders.useDefault` | `true` |

Events are created as **all-day events**, not timed events. Landscape milestones (site visits, install starts) are day-level planning, not hour-level.

To populate `client.name`, read the client document at `users/{uid}/clients/{clientId}` using Admin SDK.

### Idempotency

Cloud Functions may execute more than once for the same event. Guard against duplicate Calendar events:
- On create: check if `calendarEventId` is already set on the milestone before creating a new event
- On delete: handle 404 from Calendar API gracefully (event already deleted)

### Error Handling

| Error | Response |
|---|---|
| `invalid_grant` (token expired/revoked) | Clear token, disable sync, exit cleanly |
| Calendar API 404 on update/delete | Event already gone. Clear `calendarEventId` on the milestone, exit cleanly |
| Calendar API 429 (rate limit) | Let the function fail and retry via Cloud Functions' built-in retry mechanism |
| Calendar API 500/503 | Let the function fail and retry |
| Firestore read failure | Let the function fail and retry |

**Retry configuration**: Enable retries for this function. Set `maxRetryAttempts` to 3. Cloud Functions 2nd gen supports retry configuration in the function definition.

## Function 2: onClientDelete

**Trigger**: Firestore `onDocumentDeleted` on `users/{uid}/clients/{clientId}`

When a client document is permanently deleted (from the archive view, see `15_Archive_Management.md`), this function cleans up associated Calendar events.

### Execution Flow

1. Check if Calendar sync is enabled for the user
2. If enabled, query all milestones from the deleted client that had `calendarEventId` set (this data is available in the `change.before` snapshot for the client, but milestones are in a subcollection)
3. Since Firestore `onDocumentDeleted` only fires for the client doc (not subcollection docs), the client-side delete operation must delete subcollection documents first and handle Calendar cleanup there

**Alternative approach**: The client-side permanent delete flow (see `15_Archive_Management.md`) iterates milestones and deletes them individually. Each milestone deletion triggers `onMilestoneWrite` (delete case), which handles Calendar event removal. This means `onClientDelete` does **not** need to handle Calendar cleanup -- it is handled by the cascading milestone deletes.

**Therefore**: This function is **not needed** if the client-side delete properly deletes milestone subcollection documents before deleting the client document. The milestone trigger handles Calendar cleanup automatically.

## Resize Images Extension

**Not a custom function** -- this is a Firebase Extension installed and configured via the Firebase Console or `firebase ext:install`.

### Configuration

| Setting | Value |
|---|---|
| Extension | `firebase/storage-resize-images` |
| Trigger path | `users/{uid}/clients/{clientId}/files/{fileId}` |
| Resized image size | `200x200` |
| Resize method | `contain` (preserve aspect ratio, fit within bounds) |
| Output path | `{original_path}/thumbnails` |
| Output format | Same as input (JPEG stays JPEG, PNG stays PNG) |
| Delete original | `false` |
| Image types | JPEG, PNG, WebP |

The extension only processes files with image MIME types. PDFs and other file types are ignored automatically.

### Thumbnail Path Update

After the extension generates a thumbnail, the client needs to know the thumbnail path. Two approaches:

1. **Predictable path convention**: The client constructs the thumbnail path from the original path by appending `/thumbnails/{filename}` with the size suffix the extension adds. No Firestore update needed -- the client just knows where to look.
2. **Extension writes metadata**: Some configurations of the extension can trigger a function that updates Firestore.

**Recommended**: Option 1. The thumbnail path is deterministic: if the original is at `users/{uid}/clients/{clientId}/files/{fileId}/photo.jpg`, the thumbnail is at `users/{uid}/clients/{clientId}/files/{fileId}/thumbnails/photo_200x200.jpg`. Write this path to the file document's `thumbnailPath` field at upload time (predicted), then verify it exists before displaying.

## Deployment

### Function Deployment

```bash
firebase deploy --only functions
```

### Extension Installation

```bash
firebase ext:install firebase/storage-resize-images --project=PROJECT_ID
```

### Environment Configuration

The Calendar sync function needs the Google OAuth client ID and secret. Store these as function configuration secrets:

```bash
firebase functions:secrets:set GOOGLE_CLIENT_ID
firebase functions:secrets:set GOOGLE_CLIENT_SECRET
```

Access in code via `defineSecret` from `firebase-functions/v2`.

### Region

Deploy functions to `us-central1` (default). Single region is sufficient for < 50 users. Match the Firestore database region to minimize latency.

## Gaps & Assumptions

| Gap | Default Applied |
|---|---|
| No dead-letter queue for permanently failed Calendar syncs | Failed syncs after 3 retries are dropped. The milestone exists in the app but not on the calendar. User can manually re-trigger by editing and saving the milestone |
| No monitoring or alerting on function failures | Deferred to post-MVP. Add Sentry or Cloud Monitoring when function volume justifies it (see `17_Future_Features.md`) |
| No batch Calendar sync ("sync all existing milestones") | Not needed at launch. Calendar sync only applies to milestones created/updated after the user enables sync. Existing milestones remain un-synced unless individually edited |
| Resize Images extension cost | Each image upload triggers a Cloud Function invocation. At MVP scale (< 50 users, occasional uploads), this stays within free tier. Monitor if file upload volume grows |
| No function to clean up orphaned Storage files | If a Firestore file metadata document is deleted but the Storage delete fails, the file becomes orphaned. Acceptable at MVP scale. Add a cleanup function post-MVP if storage costs grow |
| Calendar event timezone | All-day events do not require timezone handling. If timed events are added post-MVP, store the user's timezone in their settings |  
