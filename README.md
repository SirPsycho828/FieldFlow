<p align="center">
  <h1 align="center">FieldFlow</h1>
  <p align="center">Pipeline-based CRM for solo landscape architects</p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Firebase-12-FFCA28?logo=firebase&logoColor=black" alt="Firebase" />
</p>

---

## Overview

FieldFlow is a lightweight CRM purpose-built for solo landscape architects and designers. It replaces scattered spreadsheets and generic CRM tools with a visual pipeline board that mirrors the natural flow of landscape projects -- from initial lead through consultation, proposal, active design, installation, and completion.

## Features

<table>
  <tr>
    <td width="50%">
      <strong>Kanban Pipeline</strong><br/>
      Drag-and-drop board with 6 stages. Cards show client info, value, and days-in-stage at a glance. Fractional ordering minimizes writes.
    </td>
    <td width="50%">
      <strong>Client Detail Pages</strong><br/>
      Tabbed view with overview, notes, files, invoices, and milestones. Inline editing, activity timeline, and stage selector.
    </td>
  </tr>
  <tr>
    <td>
      <strong>File Management</strong><br/>
      Drag-and-drop uploads with progress tracking, auto-thumbnails, folder organization (Photos / Documents / Designs), and 25 MB limit per file.
    </td>
    <td>
      <strong>Invoicing</strong><br/>
      Create invoices with line items, track paid/unpaid status, and generate branded PDF invoices client-side with jsPDF.
    </td>
  </tr>
  <tr>
    <td>
      <strong>Milestones & Calendar Sync</strong><br/>
      Vertical timeline with status indicators (overdue, due soon, upcoming). Optional Google Calendar two-way sync via Cloud Functions.
    </td>
    <td>
      <strong>Needs Attention</strong><br/>
      Automatic alerts for stale clients (configurable threshold) and upcoming/overdue milestones. Dismissible per-session banner on the pipeline.
    </td>
  </tr>
  <tr>
    <td>
      <strong>Archive & Restore</strong><br/>
      Archive completed or paused clients to declutter the pipeline. Restore anytime, or permanently delete with full cascade cleanup.
    </td>
    <td>
      <strong>Settings</strong><br/>
      Business profile with logo upload, Google Calendar connection management, and configurable staleness threshold preferences.
    </td>
  </tr>
</table>

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 (SPA, no SSR) |
| Language | TypeScript 6.0 |
| Build | Vite 8 |
| Styling | Tailwind CSS 3.4 + shadcn/ui (Radix primitives) |
| Auth | Firebase Authentication (email/password + Google) |
| Database | Cloud Firestore (real-time listeners) |
| Storage | Firebase Storage |
| Functions | Cloud Functions 2nd gen (calendar sync) |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Forms | React Hook Form + Zod |
| PDF | jsPDF |
| Dates | date-fns |
| Toasts | Sonner |

## Architecture

```
src/
  App.tsx                    # Router, auth provider, toaster
  main.tsx                   # Entry point
  index.css                  # Tailwind + CSS variables (shadcn theme)
  types/index.ts             # Domain interfaces, constants
  contexts/AuthContext.tsx    # Auth state + user doc listener
  lib/
    firebase.ts              # Firebase init (auth, db, storage)
    auth.ts                  # Sign-in/register/sign-out helpers
    clients.ts               # Client CRUD with batch writes
    notes.ts                 # Note CRUD
    files.ts                 # File upload/delete
    invoices.ts              # Invoice CRUD
    milestones.ts            # Milestone CRUD
    activityLog.ts           # Activity log batch helper
    storage.ts               # Storage upload/delete utilities
    utils.ts                 # cn() merge helper
  hooks/
    useClients.ts            # Real-time pipeline data (grouped by stage)
    useClient.ts             # Single client listener
    useNotes.ts              # Notes + activity log listener
    useActivityLog.ts        # Activity log listener
    useFiles.ts              # Files listener
    useInvoices.ts           # Invoices listener
    useMilestones.ts         # Milestones listener
    useNeedsAttention.ts     # Staleness + milestone proximity
  components/
    auth/                    # LoginPage, AuthGuard, AuthLoadingScreen
    layout/                  # AppShell, Sidebar, MobileTopBar, UserMenu
    pipeline/                # PipelineBoard, PipelineColumn, ClientCard,
                             # AddClientSheet, MobilePipelineList
    client/                  # ClientDetailPage, OverviewTab, NotesTab,
                             # FilesTab, InvoicesTab, MilestonesTab,
                             # InvoiceForm, InvoicePdf, MilestoneForm,
                             # ClientSummaryStrip
    archive/                 # ArchivePage
    settings/                # SettingsPage, BusinessProfileSection,
                             # CalendarSection, PreferencesSection
    shared/                  # StageSelector, EmptyState, NeedsAttentionBanner
    ui/                      # shadcn/ui primitives (button, card, dialog, etc.)
  pages/                     # Route-level page wrappers
functions/
  src/calendar/sync.ts       # onMilestoneWrite Cloud Function (2nd gen)
firestore.rules              # Security rules
storage.rules                # Storage security rules
firestore.indexes.json       # Composite indexes
firebase.json                # Hosting, emulators, functions config
```

## Getting Started

### Prerequisites

- **Node.js** 20+ (LTS recommended)
- **pnpm** 9+
- **Firebase CLI** (`npm i -g firebase-tools`)
- A Firebase project with Auth, Firestore, and Storage enabled

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd LandscapeClientManager

# Install dependencies
pnpm install

# Install Cloud Functions dependencies
cd functions && npm install && cd ..
```

### Environment Setup

Copy the example env file and fill in your Firebase project credentials:

```bash
cp .env.example .env
```

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### Development

```bash
# Start the dev server
pnpm dev

# Start Firebase emulators (optional, for local testing)
firebase emulators:start
```

The app runs at `http://localhost:5173` by default.

### Deploy

```bash
# Build for production
pnpm build

# Deploy to Firebase Hosting + Functions
firebase deploy
```

### Firebase Setup

1. **Enable Authentication** -- Turn on Email/Password and Google sign-in providers in the Firebase console.
2. **Create Firestore Database** -- Start in production mode. The security rules in `firestore.rules` will be deployed automatically.
3. **Enable Storage** -- Default bucket is sufficient.
4. **Deploy indexes** -- Run `firebase deploy --only firestore:indexes` to create the required composite indexes.
5. **Google Calendar sync (optional)** -- Enable the Google Calendar API in your GCP project. The Cloud Function handles OAuth token exchange for calendar event creation.

## Routes

| Path | Page |
|------|------|
| `/` | Pipeline board (kanban) |
| `/clients/:clientId` | Client detail (tabbed) |
| `/archive` | Archived clients |
| `/settings` | Business profile, calendar, preferences |
| `/login` | Authentication |

## License

Private -- All rights reserved.
