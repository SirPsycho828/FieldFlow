## Overview

FieldFlow's security model is simple: every user owns their data and no one else can access it. There are no shared resources, no roles, no team features. Every Firestore and Storage rule gates on `request.auth.uid` matching the document's owner path. Cloud Functions bypass these rules via the Admin SDK when performing Calendar sync operations.

## Dependencies

- `01_Auth.md` -- Authentication provides the `request.auth.uid` used in all rules
- `02_Database_Schema.md` -- Collection hierarchy defines the paths being secured
- `04_Cloud_Functions.md` -- Functions use Admin SDK (bypasses rules) to read refresh tokens and update `calendarEventId`

## Firestore Security Rules

### Core Principle

Every document lives under `users/{uid}/...`. The fundamental rule is:

```
request.auth != null && request.auth.uid == uid
```

This single check appears in every rule. No exceptions.

### Complete Ruleset

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ── User document ──
    match /users/{uid} {
      allow read: if isOwner(uid);
      allow create: if isOwner(uid) && isValidUserCreate();
      allow update: if isOwner(uid) && isValidUserUpdate();
      allow delete: if false;  // No account self-deletion at MVP

      // ── Clients ──
      match /clients/{clientId} {
        allow read: if isOwner(uid);
        allow create: if isOwner(uid) && isValidClientCreate();
        allow update: if isOwner(uid);
        allow delete: if isOwner(uid);

        // ── Notes ──
        match /notes/{noteId} {
          allow read: if isOwner(uid);
          allow create: if isOwner(uid) && hasRequiredFields(['content']);
          allow update: if isOwner(uid) && onlyUpdates(['content', 'updatedAt']);
          allow delete: if false;  // No note deletion at MVP
        }

        // ── Files (metadata) ──
        match /files/{fileId} {
          allow read: if isOwner(uid);
          allow create: if isOwner(uid) && isValidFileCreate();
          allow update: if isOwner(uid) && onlyUpdates(['thumbnailPath']);
          allow delete: if isOwner(uid);
        }

        // ── Invoices ──
        match /invoices/{invoiceId} {
          allow read: if isOwner(uid);
          allow create: if isOwner(uid);
          allow update: if isOwner(uid);
          allow delete: if isOwner(uid);
        }

        // ── Milestones ──
        match /milestones/{milestoneId} {
          allow read: if isOwner(uid);
          allow create: if isOwner(uid) && hasRequiredFields(['title', 'date']);
          allow update: if isOwner(uid);
          allow delete: if isOwner(uid);
        }
      }

      // ── Activity Log ──
      match /activityLog/{activityId} {
        allow read: if isOwner(uid);
        allow create: if isOwner(uid) && hasRequiredFields(['clientId', 'type', 'description']);
        allow update: if false;  // Activity log is append-only
        allow delete: if false;
      }
    }

    // ── Deny everything else ──
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Helper Functions

These functions are defined inside the `service cloud.firestore` block, above the `match` statements:

```
// Ownership check -- the foundation of every rule
function isOwner(uid) {
  return request.auth != null && request.auth.uid == uid;
}

// Verify required fields exist in incoming data
function hasRequiredFields(fields) {
  return request.resource.data.keys().hasAll(fields);
}

// Restrict updates to only the specified fields
function onlyUpdates(allowedFields) {
  return request.resource.data.diff(resource.data).affectedKeys().hasOnly(allowedFields);
}

// User document creation validation
function isValidUserCreate() {
  let data = request.resource.data;
  return data.keys().hasAll(['uid', 'email', 'displayName', 'createdAt'])
    && data.uid == request.auth.uid;
}

// User document update validation -- protect sensitive fields
function isValidUserUpdate() {
  let diff = request.resource.data.diff(resource.data).affectedKeys();
  // Cannot change uid or createdAt. Cannot read back googleRefreshToken.
  return !diff.hasAny(['uid', 'createdAt']);
}

// Client creation validation
function isValidClientCreate() {
  return request.resource.data.keys().hasAll(['name', 'stage', 'createdAt', 'lastActivityAt', 'archived'])
    && request.resource.data.stage in ['lead', 'consultation', 'proposal', 'active_design', 'installation', 'complete']
    && request.resource.data.archived == false;
}

// File metadata creation validation
function isValidFileCreate() {
  return request.resource.data.keys().hasAll(['name', 'folder', 'mimeType', 'sizeBytes', 'storagePath', 'uploadedAt'])
    && request.resource.data.folder in ['photos', 'documents', 'designs'];
}
```

### Google Refresh Token Protection

The `googleRefreshToken` field on the user document requires special handling. It is written once during Google sign-in and read only by Cloud Functions via the Admin SDK (which bypasses security rules). The client should never read this field back after writing it.

**Problem**: Firestore rules operate at the document level -- you cannot make a single field write-only. When the client reads their own user document, `googleRefreshToken` is included.

**Mitigation options** (choose one during implementation):

1. **Separate subcollection**: Store the token in `users/{uid}/private/tokens` with a rule that allows create/update but not read. Cloud Functions read via Admin SDK. This is the cleanest approach.
2. **Accept the risk at MVP**: The token is only readable by the owning user on their own authenticated session. The security boundary is the same as their Google account itself. Acceptable for < 50 trusted users.

**Recommended**: Option 1 (separate subcollection). Add a `private` subcollection rule:

```
match /users/{uid}/private/{docId} {
  allow read: if false;  // Only Admin SDK can read
  allow create: if isOwner(uid);
  allow update: if isOwner(uid);
  allow delete: if false;
}
```

## Firebase Storage Security Rules

### Path Convention

See `02_Database_Schema.md` for the full path structure:

```
users/{uid}/clients/{clientId}/files/{fileId}/{filename}
users/{uid}/clients/{clientId}/files/{fileId}/thumbnails/{filename}
users/{uid}/business/logo/{filename}
```

### Complete Ruleset

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // User-scoped files
    match /users/{uid}/{allPaths=**} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if request.auth != null && request.auth.uid == uid
        && isValidUpload();
    }

    // Deny everything else
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### Storage Helper Functions

```
function isValidUpload() {
  return request.resource.size < 25 * 1024 * 1024  // 25 MB max
    && request.resource.contentType.matches('image/.*|application/pdf|application/.*|text/.*');
}
```

### Storage Considerations

**Resize Images extension**: The extension runs as a Cloud Function with Admin SDK privileges. It writes thumbnails to the `thumbnails` subfolder. These writes bypass Storage rules. The corresponding `thumbnailPath` update on the Firestore file document also uses Admin SDK.

**File deletion**: When a file metadata document is deleted from Firestore (during client permanent delete or individual file removal), the application must also delete the corresponding Storage object. This is a client-side operation since the user has write access to their own Storage path. Delete both the original file and its thumbnail.

**Business logo upload**: The logo at `users/{uid}/business/logo/{filename}` follows the same ownership rule. When uploading a new logo, delete the previous one first to avoid orphaned files.

## Deployment

### Firestore Rules

Deploy from `firestore.rules` in the project root:

```bash
firebase deploy --only firestore:rules
```

### Storage Rules

Deploy from `storage.rules` in the project root:

```bash
firebase deploy --only storage
```

### Emulator Testing

The Firebase Emulator Suite runs rules locally. Test rules against expected allow/deny scenarios before deploying. Key test cases:

| Scenario | Expected |
|---|---|
| User reads own client | Allow |
| User reads another user's client | Deny |
| Unauthenticated request to any path | Deny |
| User creates client with invalid stage | Deny |
| User creates client with `archived: true` | Deny |
| User deletes own note | Deny (no note deletion at MVP) |
| User updates activity log entry | Deny (append-only) |
| User reads own `private/tokens` | Deny (Admin SDK only) |
| User uploads file > 25 MB | Deny |
| User uploads to another user's Storage path | Deny |

## Gaps & Assumptions

| Gap | Default Applied |
|---|---|
| No rate limiting in Firestore rules | Firestore rules cannot rate-limit. Acceptable at MVP scale. If abuse becomes a concern, add Cloud Functions as a write proxy with rate limiting |
| No field-level read protection natively | Solved by moving `googleRefreshToken` to `private` subcollection |
| No validation on `stage` value during update | Client updates do not re-validate `stage` enum. A malicious client could write an invalid stage. Low risk with trusted users. Add validation post-MVP if needed |
| No max document size enforcement in rules | Firestore has a 1 MB document limit natively. No custom size checks needed |
| No content-type validation beyond pattern match for Storage | The MIME type check in Storage rules is basic. A user could upload a renamed file. Acceptable at MVP -- the user is only affecting their own data |
| Firebase App Check not enabled | Deferred to post-MVP (see `17_Future_Features.md`). App Check would verify requests come from the real app, not scripts. Low priority with < 50 known users |
| No IP allowlisting or geographic restrictions | Not needed at MVP. All users are trusted |  
