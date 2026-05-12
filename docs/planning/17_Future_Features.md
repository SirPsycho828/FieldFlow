## Overview

This file catalogs all features, enhancements, and infrastructure improvements that were explicitly deferred from the MVP during the PRD process. Each item includes what it is, why it was deferred, its complexity, and any groundwork already laid in the MVP architecture that would make adoption easier. Items are grouped by priority tier matching the roadmap in `00_README.md`.

## Dependencies

- All prior files (01-16). This file references deferred items flagged in their Gaps & Assumptions sections.

## Priority 1 -- Add Shortly After Launch

### Error Monitoring (Sentry)

**What**: Integrate Sentry for frontend error tracking and Cloud Functions error reporting. Captures unhandled exceptions, failed Firestore operations, and Cloud Function crashes with stack traces and user context.

**Why deferred**: Not needed during development. Value emerges only with real users generating real errors.

**Complexity**: Low (1-2 days).

**MVP groundwork**: None required. Sentry is a drop-in SDK initialization in the React app entry point and a wrapper in Cloud Functions.

**Trigger to add**: Before inviting any users beyond the developer.

### Firebase App Check

**What**: Verifies that requests to Firebase services originate from the legitimate FieldFlow web app, not scripts or spoofed clients. Uses reCAPTCHA Enterprise as the attestation provider.

**Why deferred**: The user base is tiny and trusted at launch. App Check adds friction during development (emulator compatibility).

**Complexity**: Low (1 day).

**MVP groundwork**: No code changes needed. App Check is enabled in Firebase Console and enforced per-service. The existing Firestore and Storage security rules remain unchanged.

**Trigger to add**: Before opening access beyond a small trusted group.

### Password Reset Flow

**What**: "Forgot password?" link on the login page that sends a password reset email via `sendPasswordResetEmail` from Firebase Auth. Standard flow: user enters email, receives reset link, sets new password.

**Why deferred**: User base is small enough to handle resets manually via Firebase Console.

**Complexity**: Low (half day).

**MVP groundwork**: Login page layout already has space for the link below the password field (see `01_Auth.md`).

**Trigger to add**: When any non-developer user has an account.

## Priority 2 -- Add When Users Request

### Advanced Table Features (TanStack Table)

**What**: Sortable, filterable, and paginated tables for the archive view and potentially a list-mode alternative for the pipeline. Column sorting by name, date, stage. Text filtering.

**Why deferred**: At 5-15 active clients, the pipeline board and simple archive list are sufficient. Tables add UI complexity.

**Complexity**: Medium (2-3 days).

**MVP groundwork**: Archive page (`15_Archive_Management.md`) is a simple list that could be replaced with a TanStack Table. Data loading via Firestore listeners would remain the same.

**Trigger to add**: When architects accumulate 30+ archived clients and report difficulty finding specific ones.

### Email Invoice Delivery

**What**: Send generated invoice PDFs directly to clients via email from within the app. "Email to client" button alongside "Generate PDF" on invoices.

**Why deferred**: Requires an email service integration (Resend, SendGrid, or Firebase Extensions for email). Adds infrastructure cost and deliverability concerns.

**Complexity**: Medium (2-3 days).

**MVP groundwork**: Invoice PDF generation already works client-side (see `11_Financials_Invoices.md`). The PDF blob could be attached to an email sent via a Cloud Function. Client email addresses are already stored on client documents.

**Trigger to add**: When architects report that the download-then-email-manually workflow is too tedious.

### Client Search and Filtering

**What**: A search bar on the pipeline view that filters clients by name, email, or address. Possibly a global search across notes and files.

**Why deferred**: At 5-15 active clients, visual scanning of the pipeline is faster than searching.

**Complexity**: Low for client-field search (1-2 days), High for full-text search across notes/files (requires Algolia or Typesense, 3-5 days).

**MVP groundwork**: Client documents contain all searchable fields. Simple client-side filtering on the already-loaded clients array handles the basic case. Full-text search requires a third-party service and indexing pipeline.

**Trigger to add**: When architects consistently manage 20+ active clients.

### Default Tax Rate

**What**: A saved default tax rate in Settings that auto-fills the tax rate field on new invoices. Architects can still override per invoice.

**Why deferred**: Minor convenience feature. Architects can manually enter their rate each time.

**Complexity**: Low (half day).

**MVP groundwork**: Add `settings.defaultTaxRate` to the user document. Invoice form reads this value as the initial tax rate.

**Trigger to add**: When architects complain about re-entering the same tax rate.

## Priority 3 -- Add for Scale

### Offline Support (PWA with Workbox)

**What**: Progressive Web App with service worker caching. Allows architects to view client info, read notes, and browse files while offline at remote job sites. Write operations queue and sync when connectivity returns.

**Why deferred**: Offline-first architecture significantly increases complexity, particularly conflict resolution on queued writes. Requires rethinking the real-time listener model.

**Complexity**: High (3-5 days for read-only offline, 1-2 weeks for offline writes).

**MVP groundwork**: Vite supports PWA plugins. Firestore has built-in offline persistence (`enablePersistence()`), which caches reads automatically. Enabling basic read-only offline is relatively simple. Offline writes with queue management are the hard part.

**Trigger to add**: When architects report using the app from locations with poor connectivity.

### Full-Text Search (Algolia or Typesense)

**What**: Search across all client data including note content and file names. Instant results as the architect types.

**Why deferred**: Requires a third-party search service, a Firestore-to-search indexing pipeline (Cloud Function triggered on document writes), and ongoing infrastructure cost.

**Complexity**: High (3-5 days).

**MVP groundwork**: Activity log and notes subcollections are structured for indexing. A Cloud Function that mirrors Firestore writes to a search index is straightforward to add.

**Trigger to add**: When simple client-field filtering is insufficient, likely at 50+ total clients (active + archived) with substantial note histories.

### Image Lightbox

**What**: Click an image thumbnail on the Files tab to open a full-screen lightbox with zoom, pan, and navigation between images in the same folder.

**Why deferred**: Images currently open in a new browser tab at full resolution. Functional but not polished.

**Complexity**: Low (1-2 days with a library like `yet-another-react-lightbox`).

**MVP groundwork**: File metadata documents already contain `storagePath` for full-resolution URLs. The Photos folder grouping provides a natural gallery set.

**Trigger to add**: When architects frequently browse uploaded site photos within the app.

## Priority 4 -- Add for Business Growth

### Payment Processing (Stripe)

**What**: Accept payments directly through invoices. Architects send an invoice with a payment link. Clients pay online. Invoice status updates automatically on payment.

**Why deferred**: Significant integration effort. Requires Stripe account setup, webhook handling, PCI compliance considerations, and a client-facing payment page.

**Complexity**: High (5-7 days).

**MVP groundwork**: Invoice documents already track `status` (paid/unpaid) and `total`. The data model supports adding a `stripePaymentIntentId` field. The paid/unpaid toggle could be replaced with automatic status updates from Stripe webhooks.

**Trigger to add**: When architects express willingness to pay for payment processing and the manual "mark as paid" flow becomes a bottleneck.

### Notifications (Email and In-App)

**What**: Proactive alerts for Needs Attention flags, approaching milestones, and overdue invoices. Email digests (daily or weekly) and/or in-app notification bell.

**Why deferred**: Notification systems require email infrastructure, user preference management, scheduling (Cloud Scheduler), and careful frequency tuning to avoid alert fatigue.

**Complexity**: High (3-5 days for email, additional 2-3 days for in-app).

**MVP groundwork**: The Needs Attention system (`14_Needs_Attention.md`) already computes which clients need attention. A scheduled Cloud Function could run the same logic and send email summaries. User settings already have a `settings` map ready for notification preferences.

**Trigger to add**: When architects report missing important follow-ups because they didn't open the app frequently enough.

### Data Import (CSV/Spreadsheet)

**What**: Bulk import clients from a CSV or Excel file. Map columns to client fields, preview the import, and create multiple client documents at once.

**Why deferred**: Complex UI for column mapping and error handling. Most architects at launch will start fresh with new leads.

**Complexity**: Medium (3-4 days).

**MVP groundwork**: Client document schema is well-defined. A Cloud Function could accept a parsed CSV and batch-create client documents.

**Trigger to add**: When new users consistently ask "can I import my existing client list?"

### Account Self-Service

**What**: Change email, change password, delete account -- all from the Settings page without requiring Firebase Console access.

**Why deferred**: Small user base can be managed manually. Account deletion requires cascade deletion of all user data (similar to client permanent delete but at the user level).

**Complexity**: Medium (2-3 days).

**MVP groundwork**: Firebase Auth supports `updateEmail`, `updatePassword`, and `deleteUser` client-side with recent authentication. The cascade deletion pattern from `15_Archive_Management.md` can be extended to the user level.

**Trigger to add**: Before any self-service signup or when user count exceeds what can be managed manually.

## Gaps & Assumptions

| Gap | Default Applied |
|---|---|
| No formal prioritization framework | Priority tiers are based on PRD discussions and architectural judgment, not user research |
| No cost estimates for third-party services | Algolia, Sentry, Stripe, and email services have free tiers that cover MVP-scale usage. Cost becomes relevant at scale |
| No timeline commitments | "Days" estimates are development effort, not calendar time. Actual delivery depends on developer availability |
| No feature flag system | Features are either built or not. No gradual rollout mechanism. Add LaunchDarkly or similar if A/B testing becomes relevant |
| Some features may change MVP scope | If beta testers strongly request a P2 feature before launch, it could be promoted. This list is a starting point, not a contract |  
