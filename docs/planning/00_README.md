▸ Extended thinking (787 chars)  
## Overview

FieldFlow is a pipeline-based CRM for solo landscape architects. It provides a visual pipeline board as the home screen where architects track clients through six fixed stages: Lead, Consultation, Proposal, Active Design, Installation, and Complete. Each client has a detail card with contact info, property details, running notes, file attachments, invoice tracking, and milestone scheduling with Google Calendar sync. A "Needs Attention" system flags stale clients and upcoming milestones.

Target audience is solo practitioners managing 5-15 active clients. The app is desktop-first with mobile-friendly client cards for job-site use. Launch target is under 50 users.

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI framework |
| TypeScript | 5.6 | Type safety |
| Vite | 6 | Build tooling |
| Tailwind CSS | 3.4 | Styling (v3, not v4) |
| React Router | 7 | Client-side routing |
| shadcn/ui | latest | Component library (owned source) |
| Lucide React | latest | Icon library |

### Backend & Infrastructure

| Technology | Purpose |
|---|---|
| Firebase Hosting | Static SPA hosting with CDN |
| Firebase Authentication | Email/password + Google sign-in |
| Cloud Firestore | Primary database, real-time listeners |
| Firebase Storage | File uploads (photos, PDFs, contracts) |
| Cloud Functions (2nd gen) | Google Calendar sync, server-side operations |
| Firebase Resize Images Extension | Auto-generate image thumbnails on upload |

### Key Libraries

| Library | Purpose |
|---|---|
| React Hook Form + Zod | Form handling and validation |
| react-dropzone | Drag-and-drop file uploads with type detection |
| jsPDF + html2canvas | Client-side invoice PDF generation |
| date-fns | Date formatting and calculations |

## Architecture

FieldFlow is a single-page application. There is no server-side rendering, no API layer between the frontend and Firestore, and no separate state management library.

**Data flow**: React components subscribe to Firestore real-time listeners directly. Mutations write to Firestore, and listeners propagate changes to all open tabs automatically.

**Cloud Functions** are used only for Google Calendar sync (triggered when milestones are created/updated) and thumbnail generation (handled by the Resize Images extension on Storage uploads).

**No separate API endpoints file exists** because the app communicates directly with Firebase services from the client. Server-side logic is limited to Cloud Functions described in `04_Cloud_Functions.md`.

## File Structure

| File | Description |
|---|---|
| `00_README.md` | This file. Project overview, stack, and structure |
| `01_Auth.md` | Email/password and Google sign-in, session handling |
| `02_Database_Schema.md` | Firestore collections, document shapes, indexes |
| `03_Security_Rules.md` | Firestore and Storage security rules |
| `04_Cloud_Functions.md` | Calendar sync function, Resize Images config |
| `05_UI_Design_System.md` | Colors, typography, spacing, component patterns |
| `06_Layout_Navigation.md` | App shell, sidebar, routing, responsive breakpoints |
| `07_Pipeline_View.md` | Pipeline board with drag-and-drop stage transitions |
| `08_Client_Card_Profile.md` | Client detail page: contact info, property details |
| `09_Notes_Activity_Log.md` | Running notes and auto-generated activity log |
| `10_File_Management.md` | Drag-and-drop upload, auto-sort by type, thumbnails |
| `11_Financials_Invoices.md` | Invoice tracking, paid/unpaid toggle, PDF generation |
| `12_Milestones_Scheduling.md` | Milestone list per client, due dates, timeline display |
| `13_Google_Calendar_Sync.md` | OAuth flow, one event per milestone, sync behavior |
| `14_Needs_Attention.md` | Staleness detection, banner, card badges |
| `15_Archive_Management.md` | Archive, restore, permanent delete from archive |
| `16_Settings_Page.md` | Business profile, Calendar connection, staleness threshold |
| `17_Future_Features.md` | Post-MVP: Sentry, App Check, PWA, search, Stripe, email |

## Build Sequence

The files are numbered by implementation order. The recommended build phases are:

**Phase 1 -- Foundation (files 00-06)**
Set up the project, authentication, database schema, security rules, Cloud Functions scaffold, design system, and app shell. Nothing user-facing beyond login and an empty layout.

**Phase 2 -- Core Pipeline (files 07-08)**
Build the pipeline board and client detail cards. This is the core product loop: see clients on the board, click into a card, see contact and property details.

**Phase 3 -- Client Data (files 09-11)**
Add notes/activity log, file management with drag-and-drop, and invoice tracking with PDF generation. These fill out the client card experience.

**Phase 4 -- Scheduling & Awareness (files 12-14)**
Add milestones, Google Calendar sync, and the Needs Attention system. These make the app proactive rather than just a data store.

**Phase 5 -- Polish (files 15-16)**
Archive management and settings page. These round out the feature set for launch readiness.

## Key Decisions

These decisions were made during the PRD process and are final:

- **Pipeline stages are fixed**: Lead, Consultation, Proposal, Active Design, Installation, Complete. Not user-configurable.
- **No state management library**: Firestore real-time listeners replace Redux/Zustand. Component state and Firestore subscriptions only.
- **Tailwind v3.4, not v4**: Better AI agent output quality with v3's established configuration approach.
- **Vite, not Next.js**: SPA with no SSR needs. Firebase handles hosting and backend.
- **Client-side PDF generation**: jsPDF renders invoices in the browser. No server-side PDF service.
- **One Firestore listener for all clients**: Single query on the user's clients collection, grouped by stage on the frontend (not one listener per stage).
- **Invoice data read from Firestore at PDF generation time**: Not from in-memory state, to avoid stale data.
- **Generated PDFs download only**: Not saved to Storage. User can regenerate anytime.
- **Staleness threshold**: 14 days default, configurable per user in settings.
- **Archive only from pipeline, permanent delete from archive view**: Two-step deletion pattern.
- **Desktop-first, mobile-friendly**: Pipeline is a desktop experience. Client cards, notes, and contact info are usable on phone.
- **No search or filtering at MVP**: Client list is small enough (5-15 active) that it's unnecessary.
- **No notifications at MVP**: Keeps complexity down for launch.
- **Package manager**: pnpm.
- **Firebase Emulator Suite**: Included in setup for local development.

## Project Setup

**Prerequisites**: Node.js 20 LTS, pnpm, Firebase CLI, a Google Cloud project with Firestore, Storage, and Authentication enabled.

**Firebase plans**: Start on Spark (free). Move to Blaze (pay-as-you-go) when Cloud Functions or the Resize Images extension are needed. Budget alerts at $5, $15, and $25.

**Google account**: Dedicated account for FieldFlow (e.g., fieldflow.app@gmail.com) for clean separation of Firebase project ownership.

## Gaps & Assumptions

| Gap | Default Applied | Noted In |
|---|---|---|
| No error monitoring specified for MVP | Deferred to post-MVP (Sentry) | `17_Future_Features.md` |
| No explicit loading/empty states for pipeline | Skeleton screens for content, spinner for actions | `05_UI_Design_System.md` |
| No data migration or import tool specified | Manual client entry only at launch | `17_Future_Features.md` |
| Privacy policy content not defined | Use free generator (Termly) before launch | `17_Future_Features.md` |
| No explicit rate limiting on file uploads | Reasonable client-side limits (10 files, 25MB each) | `10_File_Management.md` |
| Architect business info fields not fully enumerated | Business name, address, email, phone, logo | `16_Settings_Page.md` |
| No explicit session timeout defined | Firebase Auth default (1 hour idle, auto-refresh) | `01_Auth.md` |
| Touch drag-and-drop for pipeline not in MVP scope | Desktop drag only, mobile users tap to move stage | `07_Pipeline_View.md` |  
