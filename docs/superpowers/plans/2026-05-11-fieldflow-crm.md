# FieldFlow CRM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pipeline-based CRM for solo landscape architects with Kanban board, client management, invoicing, milestone scheduling, and Google Calendar sync.

**Architecture:** Single-page app (Vite + React 19) communicating directly with Firebase services (Firestore, Storage, Auth). No API layer — components subscribe to Firestore real-time listeners. Cloud Functions handle Google Calendar sync only. All data scoped per-user under `users/{uid}/...`.

**Tech Stack:** React 19, TypeScript 5.6, Vite 6, Tailwind CSS 3.4, shadcn/ui, React Router 7, Firebase (Auth, Firestore, Storage, Cloud Functions 2nd gen), pnpm, React Hook Form + Zod, @dnd-kit, react-dropzone, jsPDF, date-fns, Lucide React

---

## File Structure

```
fieldflow/
├── public/
├── src/
│   ├── main.tsx                      # App entry point
│   ├── App.tsx                       # Router + AuthProvider wrapper
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components (auto-generated)
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx         # Login/register form + Google sign-in
│   │   │   ├── AuthGuard.tsx         # Route protection wrapper
│   │   │   └── AuthLoadingScreen.tsx # Full-page loader during auth check
│   │   ├── layout/
│   │   │   ├── AppShell.tsx          # Sidebar + content area layout
│   │   │   ├── Sidebar.tsx           # Navigation sidebar
│   │   │   ├── MobileTopBar.tsx      # Mobile hamburger header
│   │   │   └── UserMenu.tsx          # User avatar + dropdown
│   │   ├── pipeline/
│   │   │   ├── PipelineBoard.tsx     # Kanban board with DnD context
│   │   │   ├── PipelineColumn.tsx    # Single stage column
│   │   │   ├── ClientCard.tsx        # Card in pipeline column
│   │   │   ├── AddClientSheet.tsx    # Slide-over quick-add form
│   │   │   └── MobilePipelineList.tsx # Mobile grouped list view
│   │   ├── client/
│   │   │   ├── ClientDetailPage.tsx  # Page shell with tabs
│   │   │   ├── ClientSummaryStrip.tsx # Metrics strip below header
│   │   │   ├── OverviewTab.tsx       # Contact + property details
│   │   │   ├── NotesTab.tsx          # Notes list + add/edit + activity log
│   │   │   ├── FilesTab.tsx          # File upload + folder display
│   │   │   ├── InvoicesTab.tsx       # Invoice list + actions
│   │   │   ├── InvoiceForm.tsx       # Create/edit invoice dialog
│   │   │   ├── InvoicePdf.tsx        # PDF generation logic
│   │   │   ├── MilestonesTab.tsx     # Timeline + add/edit
│   │   │   └── MilestoneForm.tsx     # Create/edit milestone dialog
│   │   ├── archive/
│   │   │   └── ArchivePage.tsx       # Archived clients list
│   │   ├── settings/
│   │   │   ├── SettingsPage.tsx      # Settings page shell
│   │   │   ├── BusinessProfileSection.tsx
│   │   │   ├── CalendarSection.tsx
│   │   │   └── PreferencesSection.tsx
│   │   └── shared/
│   │       ├── NeedsAttentionBanner.tsx
│   │       ├── EmptyState.tsx        # Reusable empty state
│   │       └── StageSelector.tsx     # Stage dropdown
│   ├── contexts/
│   │   └── AuthContext.tsx           # Auth state provider
│   ├── hooks/
│   │   ├── useClients.ts            # Pipeline clients listener
│   │   ├── useClient.ts             # Single client listener
│   │   ├── useNotes.ts              # Notes subcollection listener
│   │   ├── useFiles.ts              # Files subcollection listener
│   │   ├── useInvoices.ts           # Invoices subcollection listener
│   │   ├── useMilestones.ts         # Milestones subcollection listener
│   │   ├── useActivityLog.ts        # Activity log listener
│   │   └── useNeedsAttention.ts     # Attention state computation
│   ├── lib/
│   │   ├── firebase.ts              # Firebase app init + service exports
│   │   ├── auth.ts                  # Auth helper functions
│   │   ├── clients.ts               # Client CRUD operations
│   │   ├── notes.ts                 # Note CRUD operations
│   │   ├── files.ts                 # File upload/delete operations
│   │   ├── invoices.ts              # Invoice CRUD operations
│   │   ├── milestones.ts            # Milestone CRUD operations
│   │   ├── activityLog.ts           # Activity log write helper
│   │   ├── storage.ts               # Firebase Storage helpers
│   │   └── utils.ts                 # Formatting, stage helpers
│   ├── types/
│   │   └── index.ts                 # All TypeScript interfaces
│   └── index.css                    # Tailwind directives + CSS variables
├── functions/
│   ├── src/
│   │   ├── index.ts                 # Cloud Function exports
│   │   ├── calendar/
│   │   │   ├── sync.ts              # onMilestoneWrite logic
│   │   │   └── googleClient.ts      # OAuth client setup
│   │   └── types.ts                 # Shared types
│   ├── package.json
│   └── tsconfig.json
├── firestore.rules                   # Firestore security rules
├── storage.rules                     # Storage security rules
├── firestore.indexes.json            # Composite indexes
├── firebase.json                     # Firebase project config
├── .firebaserc                       # Firebase project alias
├── tailwind.config.ts                # Tailwind + design tokens
├── vite.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## Phase 1: Foundation

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `src/main.tsx`, `src/App.tsx`, `index.html`

- [ ] **Step 1: Scaffold Vite project with React + TypeScript**

```bash
cd C:/Users/steve/OneDrive/Documents/Repos/LandscapeClientManager
pnpm create vite fieldflow --template react-ts
```

Move contents from `fieldflow/` subdirectory to project root if needed.

- [ ] **Step 2: Install core dependencies**

```bash
pnpm add react-router-dom@7 firebase react-hook-form @hookform/resolvers zod date-fns lucide-react
pnpm add -D tailwindcss@3.4 postcss autoprefixer @types/node
```

- [ ] **Step 3: Install feature dependencies**

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities react-dropzone jspdf html2canvas sonner
```

- [ ] **Step 4: Verify dev server starts**

```bash
pnpm dev
```

Expected: Vite dev server runs on localhost:5173

- [ ] **Step 5: Commit**

```bash
git init && git add -A && git commit -m "chore: scaffold Vite + React + TypeScript project with dependencies"
```

---

### Task 2: Tailwind CSS + Design System Tokens

**Files:**
- Create: `tailwind.config.ts`, `postcss.config.js`, `src/index.css`
- Reference: `docs/planning/05_UI_Design_System.md`

- [ ] **Step 1: Initialize Tailwind**

```bash
npx tailwindcss init -p --ts
```

- [ ] **Step 2: Configure Tailwind with design tokens**

`tailwind.config.ts` — set up content paths, extend theme with brand colors, stage colors, and all semantic tokens from PRD 05.

- [ ] **Step 3: Set up CSS variables in `src/index.css`**

Add Tailwind directives (`@tailwind base/components/utilities`) and define CSS custom properties for shadcn/ui theming (background, foreground, card, primary, destructive, muted, border, etc.).

Include stage color tokens as Tailwind extensions.

- [ ] **Step 4: Verify Tailwind works**

Add a test element with Tailwind classes to App.tsx, confirm styles render.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: configure Tailwind CSS 3.4 with FieldFlow design tokens"
```

---

### Task 3: shadcn/ui Initialization

**Files:**
- Create: `components.json`, `src/lib/utils.ts`, `src/components/ui/` (generated)
- Reference: `docs/planning/05_UI_Design_System.md`

- [ ] **Step 1: Initialize shadcn/ui**

```bash
npx shadcn@latest init
```

Select: TypeScript, Default style, CSS variables, `src/index.css`, `@/` alias.

- [ ] **Step 2: Add required components**

```bash
npx shadcn@latest add button card input textarea select dialog sheet tabs badge dropdown-menu skeleton switch separator label sonner tooltip
```

- [ ] **Step 3: Verify component imports work**

Import Button in App.tsx, render it, confirm it displays with correct styling.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: initialize shadcn/ui with required components"
```

---

### Task 4: Firebase Configuration

**Files:**
- Create: `src/lib/firebase.ts`, `firebase.json`, `.firebaserc`, `.env.local`
- Reference: `docs/planning/00_README.md`

- [ ] **Step 1: Create Firebase config module**

`src/lib/firebase.ts` — initialize Firebase app, export `auth`, `db` (Firestore), `storage` instances. Read config from env vars (`VITE_FIREBASE_*`).

- [ ] **Step 2: Create `.env.local` template**

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

- [ ] **Step 3: Create `firebase.json`**

Configure hosting (SPA rewrites), Firestore rules path, Storage rules path, functions source directory, and emulator settings.

- [ ] **Step 4: Create `.firebaserc`**

Set default project alias.

- [ ] **Step 5: Add `.env.local` to `.gitignore`**

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: configure Firebase SDK and project settings"
```

---

### Task 5: TypeScript Types

**Files:**
- Create: `src/types/index.ts`
- Reference: `docs/planning/02_Database_Schema.md`

- [ ] **Step 1: Define all domain interfaces**

```typescript
// UserDocument, ClientDocument, NoteDocument, FileDocument,
// InvoiceDocument, LineItem, MilestoneDocument, ActivityLogEntry
// Stage enum/union type, ActivityType union type
// PropertyDetails, BusinessProfile, UserSettings
```

All fields exactly match Firestore document shapes from PRD 02. Amounts in cents (number). Timestamps as Firebase Timestamp type.

- [ ] **Step 2: Define stage constants**

```typescript
export const STAGES = ['lead', 'consultation', 'proposal', 'active_design', 'installation', 'complete'] as const;
export type Stage = typeof STAGES[number];
export const STAGE_LABELS: Record<Stage, string> = { ... };
```

- [ ] **Step 3: Define activity type constants**

All 10 activity types with their string literals.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: define TypeScript domain types from Firestore schema"
```

---

### Task 6: Security Rules

**Files:**
- Create: `firestore.rules`, `storage.rules`, `firestore.indexes.json`
- Reference: `docs/planning/03_Security_Rules.md`, `docs/planning/02_Database_Schema.md`

- [ ] **Step 1: Write Firestore security rules**

Copy the complete ruleset from PRD 03. Include all helper functions (`isOwner`, `hasRequiredFields`, `onlyUpdates`, `isValidUserCreate`, `isValidUserUpdate`, `isValidClientCreate`, `isValidFileCreate`). Include `private/{docId}` subcollection for token storage.

- [ ] **Step 2: Write Storage security rules**

Copy the complete ruleset from PRD 03. Include `isValidUpload` helper (25MB max, MIME type check).

- [ ] **Step 3: Create composite indexes**

`firestore.indexes.json` with:
- `clients`: `archived` ASC + `stage` ASC + `stageOrder` ASC
- `clients`: `archived` ASC + `lastActivityAt` ASC
- `activityLog`: `clientId` ASC + `createdAt` DESC
- Collection group `milestones`: `completed` ASC + `date` ASC

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add Firestore/Storage security rules and composite indexes"
```

---

### Task 7: Cloud Functions Scaffold

**Files:**
- Create: `functions/package.json`, `functions/tsconfig.json`, `functions/src/index.ts`, `functions/src/types.ts`, `functions/src/calendar/sync.ts`, `functions/src/calendar/googleClient.ts`
- Reference: `docs/planning/04_Cloud_Functions.md`

- [ ] **Step 1: Initialize functions directory**

```bash
mkdir -p functions/src/calendar
cd functions && pnpm init
pnpm add firebase-functions firebase-admin googleapis
pnpm add -D typescript @types/node
```

- [ ] **Step 2: Create tsconfig.json for functions**

Target Node 20, CommonJS module output.

- [ ] **Step 3: Create `functions/src/types.ts`**

Shared types for milestone and user documents used by Cloud Functions.

- [ ] **Step 4: Create `functions/src/calendar/googleClient.ts`**

Stub for Google OAuth client setup using `googleapis`. Reads client ID/secret from `defineSecret`. Token refresh and `invalid_grant` error handling.

- [ ] **Step 5: Create `functions/src/calendar/sync.ts`**

Implement `onMilestoneWrite` function:
- Trigger on `users/{uid}/clients/{clientId}/milestones/{milestoneId}`
- Detect create/update/delete from change snapshots
- Check `calendarSyncEnabled`, get refresh token, build Calendar client
- Create/update/delete Calendar events
- Write `calendarEventId` back to milestone doc
- Handle errors per PRD 04 error table

- [ ] **Step 6: Create `functions/src/index.ts`**

Export `onMilestoneWrite` function.

- [ ] **Step 7: Verify functions compile**

```bash
cd functions && npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: scaffold Cloud Functions with Calendar sync"
```

---

### Task 8: Auth Context + Helpers

**Files:**
- Create: `src/contexts/AuthContext.tsx`, `src/lib/auth.ts`
- Reference: `docs/planning/01_Auth.md`

- [ ] **Step 1: Create auth helper functions**

`src/lib/auth.ts`:
- `signInWithEmail(email, password)`
- `registerWithEmail(email, password, displayName)`
- `signInWithGoogle()` — GoogleAuthProvider with Calendar scope, capture refresh token
- `signOutUser()`
- `createUserDocument(user)` — creates user doc in Firestore if not exists
- Error code to user-friendly message mapping (7 error codes from PRD 01)

- [ ] **Step 2: Create AuthContext**

`src/contexts/AuthContext.tsx`:
- Provider wraps app, sets up `onAuthStateChanged` listener
- Exposes: `user`, `userDoc`, `loading`, `signOut`
- On auth state change: read user doc, create if missing
- `useAuth()` hook for consuming context

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: implement Firebase auth context with Google sign-in"
```

---

### Task 9: Login Page

**Files:**
- Create: `src/components/auth/LoginPage.tsx`, `src/components/auth/AuthGuard.tsx`, `src/components/auth/AuthLoadingScreen.tsx`
- Reference: `docs/planning/01_Auth.md`

- [ ] **Step 1: Create AuthLoadingScreen**

Full-page centered spinner with "FieldFlow" text. Used during initial auth check.

- [ ] **Step 2: Create AuthGuard**

Route wrapper: if loading show AuthLoadingScreen, if no user redirect to `/login`, else render children.

- [ ] **Step 3: Create LoginPage**

Single centered card with:
- App logo + "FieldFlow" header
- Google sign-in button (primary, prominent)
- "or" divider
- Email/password form with login/register toggle
- Error display mapped from Firebase error codes
- Loading states on buttons during submission
- Inverse guard: redirect to `/` if already authenticated

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: implement login page with email/password and Google sign-in"
```

---

### Task 10: App Shell + Routing

**Files:**
- Create: `src/components/layout/AppShell.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/layout/MobileTopBar.tsx`, `src/components/layout/UserMenu.tsx`
- Modify: `src/App.tsx`
- Reference: `docs/planning/06_Layout_Navigation.md`

- [ ] **Step 1: Create Sidebar**

Fixed 240px sidebar with:
- App header (FieldFlow logo + name, links to `/`)
- Nav items: Pipeline (Kanban icon), Archive (Archive icon), Settings (Settings icon)
- Active state detection via React Router `NavLink`
- User section pinned to bottom via `mt-auto`
- Tablet: icon-only rail (64px) at `md` breakpoint
- Mobile: hidden (replaced by MobileTopBar)

- [ ] **Step 2: Create UserMenu**

Avatar circle (first letter of displayName) + name + email. Dropdown with Settings and Sign Out.

- [ ] **Step 3: Create MobileTopBar**

Top bar with hamburger, "FieldFlow" text, avatar. Hamburger opens Sheet with full sidebar nav.

- [ ] **Step 4: Create AppShell**

Sidebar + content area layout. Content area has `p-6` padding, independent scroll. Responsive breakpoints per PRD 06.

- [ ] **Step 5: Set up routing in App.tsx**

```tsx
<AuthProvider>
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<AuthGuard><AppShell /></AuthGuard>}>
      <Route index element={<PipelinePage />} />
      <Route path="/clients/:clientId" element={<ClientDetailPage />} />
      <Route path="/archive" element={<ArchivePage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Route>
  </Routes>
</AuthProvider>
```

- [ ] **Step 6: Create placeholder pages**

Stub components for Pipeline, ClientDetail, Archive, Settings — just render page title so routing is testable.

- [ ] **Step 7: Verify routing works**

Dev server: login page renders at `/login`, authenticated routes show sidebar + placeholder content, nav links work, sign out works.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: implement app shell with sidebar, routing, and responsive layout"
```

---

## Phase 2: Core Pipeline

### Task 11: Utility Functions + Firestore Helpers

**Files:**
- Create: `src/lib/utils.ts` (extend), `src/lib/clients.ts`, `src/lib/activityLog.ts`

- [ ] **Step 1: Create client CRUD operations**

`src/lib/clients.ts`:
- `createClient(uid, data)` — batch: create client doc + activity log entry
- `updateClient(uid, clientId, data)` — update with `lastActivityAt` + activity log
- `updateClientStage(uid, clientId, newStage, newOrder)` — batch: stage + stageOrder + lastActivityAt + activity log
- `archiveClient(uid, clientId, clientName)` — batch: set archived=true + activity log
- `restoreClient(uid, clientId, clientName, stageOrder)` — batch: set archived=false + activity log
- `deleteClientCascade(uid, clientId)` — delete subcollections, storage files, then client doc

- [ ] **Step 2: Create activity log helper**

`src/lib/activityLog.ts`:
- `createActivityEntry(batch, uid, clientId, clientName, type, description)` — adds to batch

- [ ] **Step 3: Create formatting utilities**

`src/lib/utils.ts`:
- `formatCurrency(cents)` — cents to USD string
- `centsToDollars(cents)` / `dollarsToCents(dollars)` — conversion helpers
- `getStageLabel(stage)` — stage key to display label
- `getStageBorderColor(stage)` — stage key to CSS color

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: implement client CRUD, activity log, and utility functions"
```

---

### Task 12: Pipeline Data Hooks

**Files:**
- Create: `src/hooks/useClients.ts`

- [ ] **Step 1: Create useClients hook**

Real-time listener on `users/{uid}/clients` where `archived == false`. Returns clients grouped by stage, sorted by stageOrder within each group. Uses `onSnapshot`. Returns `{ clientsByStage, loading, error }`.

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: implement useClients hook with real-time Firestore listener"
```

---

### Task 13: Pipeline Board

**Files:**
- Create: `src/components/pipeline/PipelineBoard.tsx`, `src/components/pipeline/PipelineColumn.tsx`, `src/components/pipeline/ClientCard.tsx`, `src/components/pipeline/AddClientSheet.tsx`, `src/components/pipeline/MobilePipelineList.tsx`, `src/components/shared/EmptyState.tsx`
- Reference: `docs/planning/07_Pipeline_View.md`

- [ ] **Step 1: Create EmptyState component**

Reusable: icon, heading, description, optional action button. Used across all tabs.

- [ ] **Step 2: Create ClientCard**

Pipeline card showing: name (truncated), stage duration, budget range (if present), needs attention badge. Click navigates to `/clients/:clientId`. Hover styles per PRD 05.

- [ ] **Step 3: Create PipelineColumn**

Column with: stage color top border, header with label + count badge, scrollable card list, empty column state. Integrates with @dnd-kit sortable.

- [ ] **Step 4: Create PipelineBoard**

6-column grid with DnD context. `DndContext` + `SortableContext` per column. Handles `onDragEnd`: update stage + stageOrder via batch write, optimistic UI update, revert on failure. Fractional ordering with rebalance at gap < 0.001.

- [ ] **Step 5: Create AddClientSheet**

Sheet from right with quick-add form: Name (required), Email, Phone, Stage (default: lead), Source (dropdown). React Hook Form + Zod. On submit: create client, close sheet, toast.

- [ ] **Step 6: Create MobilePipelineList**

Below 768px: horizontal stage pills at top, vertical card list grouped by stage. No DnD.

- [ ] **Step 7: Wire up Pipeline page**

Replace placeholder with PipelineBoard. Page header: "Pipeline" + "+ Add Client" button. Integrate NeedsAttentionBanner placeholder above board.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: implement pipeline board with drag-and-drop stage transitions"
```

---

## Phase 3: Client Data

### Task 14: Client Detail Page + Overview Tab

**Files:**
- Create: `src/components/client/ClientDetailPage.tsx`, `src/components/client/ClientSummaryStrip.tsx`, `src/components/client/OverviewTab.tsx`, `src/components/shared/StageSelector.tsx`, `src/hooks/useClient.ts`
- Reference: `docs/planning/08_Client_Card_Profile.md`

- [ ] **Step 1: Create useClient hook** — single client real-time listener
- [ ] **Step 2: Create StageSelector** — dropdown for all 6 stages, batch write on change
- [ ] **Step 3: Create ClientSummaryStrip** — created date, notes count, files count, invoice total, next milestone
- [ ] **Step 4: Create OverviewTab** — read mode (contact info + property details) and edit mode (React Hook Form + Zod)
- [ ] **Step 5: Create ClientDetailPage** — back link, header with name + stage selector + actions menu, tabs (Overview, Notes, Files, Invoices, Milestones)
- [ ] **Step 6: Commit**

---

### Task 15: Notes Tab + Activity Log

**Files:**
- Create: `src/components/client/NotesTab.tsx`, `src/hooks/useNotes.ts`, `src/hooks/useActivityLog.ts`, `src/lib/notes.ts`
- Reference: `docs/planning/09_Notes_Activity_Log.md`

- [ ] **Step 1: Create notes CRUD** — `addNote`, `updateNote` in `src/lib/notes.ts`
- [ ] **Step 2: Create useNotes hook** — real-time listener, ordered by createdAt desc
- [ ] **Step 3: Create useActivityLog hook** — query activityLog where clientId matches, limit 50
- [ ] **Step 4: Create NotesTab** — add note form (inline textarea), note list with edit, activity log section with type-specific icons
- [ ] **Step 5: Commit**

---

### Task 16: Files Tab

**Files:**
- Create: `src/components/client/FilesTab.tsx`, `src/hooks/useFiles.ts`, `src/lib/files.ts`, `src/lib/storage.ts`
- Reference: `docs/planning/10_File_Management.md`

- [ ] **Step 1: Create storage helpers** — `uploadFile`, `deleteFile`, `getFileUrl`, `getThumbnailUrl`
- [ ] **Step 2: Create file operations** — `createFileMetadata`, `deleteFileWithStorage`
- [ ] **Step 3: Create useFiles hook** — real-time listener, group by folder
- [ ] **Step 4: Create FilesTab** — react-dropzone zone, folder display (Photos/Documents/Designs), file cards with thumbnails, upload progress, file actions (download, delete)
- [ ] **Step 5: Commit**

---

### Task 17: Invoices Tab + PDF

**Files:**
- Create: `src/components/client/InvoicesTab.tsx`, `src/components/client/InvoiceForm.tsx`, `src/components/client/InvoicePdf.tsx`, `src/hooks/useInvoices.ts`, `src/lib/invoices.ts`
- Reference: `docs/planning/11_Financials_Invoices.md`

- [ ] **Step 1: Create invoice operations** — `createInvoice`, `updateInvoice`, `deleteInvoice`, `toggleInvoiceStatus`, `generateInvoiceNumber`
- [ ] **Step 2: Create useInvoices hook** — real-time listener, ordered by date desc
- [ ] **Step 3: Create InvoiceForm** — dialog with header fields, dynamic line items, tax rate, calculated totals. React Hook Form + Zod. Amounts displayed as dollars, stored as cents.
- [ ] **Step 4: Create InvoicePdf** — jsPDF generation: business header (from user doc), invoice details, line items table, totals, status. Download as `{number}_{clientName}.pdf`.
- [ ] **Step 5: Create InvoicesTab** — invoice list with rows, status badges, actions menu (toggle paid/unpaid, edit, generate PDF, delete)
- [ ] **Step 6: Commit**

---

## Phase 4: Scheduling & Awareness

### Task 18: Milestones Tab

**Files:**
- Create: `src/components/client/MilestonesTab.tsx`, `src/components/client/MilestoneForm.tsx`, `src/hooks/useMilestones.ts`, `src/lib/milestones.ts`
- Reference: `docs/planning/12_Milestones_Scheduling.md`

- [ ] **Step 1: Create milestone operations** — `createMilestone`, `updateMilestone`, `deleteMilestone`, `toggleMilestoneComplete`
- [ ] **Step 2: Create useMilestones hook** — real-time listener, ordered by date asc
- [ ] **Step 3: Create MilestoneForm** — dialog with title (+ suggestion chips) and date picker
- [ ] **Step 4: Create MilestonesTab** — vertical timeline with connecting line, status nodes (completed/overdue/due soon/upcoming), actions (toggle complete, edit, delete)
- [ ] **Step 5: Commit**

---

### Task 19: Needs Attention System

**Files:**
- Create: `src/components/shared/NeedsAttentionBanner.tsx`, `src/hooks/useNeedsAttention.ts`
- Reference: `docs/planning/14_Needs_Attention.md`

- [ ] **Step 1: Create useNeedsAttention hook** — compute staleness from loaded clients + collection group query for milestone proximity (48h window). Returns flagged clients with reasons.
- [ ] **Step 2: Create NeedsAttentionBanner** — warning styled banner above pipeline. Shows up to 3 clients, expandable. Dismissible per session. Client names link to detail page.
- [ ] **Step 3: Add attention badge to ClientCard** — AlertTriangle icon on flagged cards with tooltip
- [ ] **Step 4: Wire banner into PipelineBoard**
- [ ] **Step 5: Commit**

---

## Phase 5: Polish

### Task 20: Archive Management

**Files:**
- Create: `src/components/archive/ArchivePage.tsx`
- Reference: `docs/planning/15_Archive_Management.md`

- [ ] **Step 1: Create ArchivePage** — query archived clients, display as list with restore/delete buttons. Confirmation dialogs. Cascade delete implementation.
- [ ] **Step 2: Wire archive actions into ClientDetailPage header** — show Archive for active clients, Restore/Delete for archived
- [ ] **Step 3: Commit**

---

### Task 21: Settings Page

**Files:**
- Create: `src/components/settings/SettingsPage.tsx`, `src/components/settings/BusinessProfileSection.tsx`, `src/components/settings/CalendarSection.tsx`, `src/components/settings/PreferencesSection.tsx`
- Reference: `docs/planning/16_Settings_Page.md`

- [ ] **Step 1: Create BusinessProfileSection** — form with name, address, email, phone, logo upload. Explicit save.
- [ ] **Step 2: Create CalendarSection** — connection state detection, connect/disconnect/reconnect flows, sync toggle
- [ ] **Step 3: Create PreferencesSection** — staleness threshold number input, auto-save on blur
- [ ] **Step 4: Create SettingsPage** — three sections stacked in cards
- [ ] **Step 5: Commit**

---

### Task 22: README + Final Polish

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write professional README** — project name, description, badges, features, tech stack, architecture, getting started guide, environment setup
- [ ] **Step 2: Final review** — verify all routes work, check responsive behavior, test auth flow end-to-end
- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "docs: add professional README"
```
