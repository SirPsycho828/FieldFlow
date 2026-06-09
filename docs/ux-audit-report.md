# UX Intuitiveness Audit

## App Context
- **Name:** FieldFlow
- **Domain:** Professional services — pipeline CRM for solo landscape architects
- **Target Users:** Solo landscape architects and designers
- **Tech Stack:** React 19 + Tailwind 3.4 + shadcn/ui (Radix)
- **Pages:** 6 (+ Landing)
- **Routes:** 6 (`/`, `/login`, `/pipeline`, `/clients/:id`, `/archive`, `/settings`)

## Workflow Map

### Workflow 1: First-time user setup — Bumpy
Path: Landing -> Login (register) -> Pipeline (empty) -> AddClientSheet -> Pipeline (card) -> Client Detail
Gaps:
- [WF-001] Dead end at Pipeline after first add — toast "Client added" but no link to new client
- [WF-002] Missing handoff at Login -> Pipeline — no onboarding, empty pipeline with no explanation
- [WF-003] Unclear sequence at Client Detail — 5 tabs with no priority guidance

### Workflow 2: Add and manage a client — Bumpy
Path: Pipeline -> AddClientSheet -> Pipeline (card) -> Client Detail (tabs)
Gaps:
- [WF-004] Dead end at AddClientSheet -> Pipeline — sheet closes, no link to new client
- [WF-005] Missing handoff at Client Detail Overview -> tabs — no indication tabs need data, no counts

### Workflow 3: Progress client through pipeline — Bumpy
Path: Pipeline (Lead) -> drag/StageSelector -> ... -> Complete
Gaps:
- [WF-006] Missing handoff at pipeline stages — no stage descriptions or expected actions
- [WF-007] Dead end at Complete stage — no nudge to archive or finalize
- [WF-008] Unclear sequence — no indication what to complete before advancing

### Workflow 4: Create and manage invoices — Smooth
Path: Client Detail -> Invoices tab -> New Invoice -> InvoiceForm -> Invoice list -> PDF
Gaps:
- [WF-009] Missing handoff at Invoices tab — no aggregate metrics (total, paid vs unpaid)

### Workflow 5: Manage milestones — Bumpy
Path: Client Detail -> Milestones tab -> Add Milestone -> MilestoneForm -> Milestone list
Gaps:
- [WF-010] Hidden prerequisite — calendar sync requires Settings connection, not mentioned

### Workflow 6: Archive and restore clients — Smooth
Path: Client Detail -> Archive -> Pipeline / Archive -> Restore -> Pipeline
Gaps:
- [WF-011] Missing handoff at Archive page — sparse client info, no archive reason

### Workflow 7: Configure business settings — Bumpy
Path: Settings -> Business Profile / Calendar / Preferences
Gaps:
- [WF-012] Unclear sequence — no priority or required vs optional indicators
- [WF-013] Hidden prerequisite — Business Profile affects PDFs, not communicated

## Page Scorecard

| Page | Orient. | Actions | Progress | Guidance | Metrics | Empty | Next | Feedback | Intent | Score |
|------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Landing | P | P | - | P | - | - | P | - | P | 5/5 |
| Login | P | P | - | P | - | - | / | P | P | 5/6 |
| Pipeline | P | P | / | M | M | P | M | P | P | 5/9 |
| Client Detail | P | / | / | M | / | P | M | P | / | 4/9 |
| Archive | P | P | / | M | M | P | / | P | P | 5/9 |
| Settings | P | P | - | / | - | - | M | P | P | 4/5 |

## Findings (Prioritized)

### High

- **UX-001** [Guidance] Pipeline page has no explanation of pipeline stages, workflow concept, or guidance for new/returning users. New user lands on empty board with no context for what Lead/Consultation/Proposal/etc. mean.
  Layer: Guidance | Pages: Pipeline | Refs: WF-002, WF-006, WF-008
  Fix: Add stage descriptions (tooltip or subtitle under column headers). Add first-use guidance banner.

- **UX-002** [Next Steps] No state-aware next-step guidance after key actions: adding a client (toast only, no link), reaching Complete stage (no archive/finalize nudge), or finishing a tab section.
  Layer: Next Steps | Pages: Pipeline, Client Detail | Refs: WF-001, WF-004, WF-007
  Fix: Add "View client" link in success toast after creation. Add stage-completion nudge card in Complete column. Add tab-level next-step guidance.

- **UX-003** [Metrics] Pipeline has zero aggregate statistics — no total client count, revenue pipeline, stage distribution, or trends. Users cannot gauge business health at a glance.
  Layer: Metrics | Pages: Pipeline | Refs: WF-009
  Fix: Add pipeline summary bar above the board showing total clients, total pipeline value, and stage distribution.

- **UX-004** [Guidance] Client Detail has no tab-level guidance. 5 tabs show data but don't explain what should be populated at each pipeline stage or why each tab matters.
  Layer: Guidance | Pages: Client Detail | Refs: WF-003, WF-005
  Fix: Add contextual guidance to empty states explaining when/why to use each tab. Improve tab labels with counts.

### Medium

- **UX-005** [Progress/Status] Client Detail summary strip shows flat counts but no lifecycle progress. Tab labels don't show counts, making it unclear which tabs have data.
  Layer: Progress/Status | Pages: Client Detail | Refs: WF-005
  Fix: Add counts to tab labels (e.g., "Notes (3)", "Files (2)"). Add stage progress indicator showing where client is in the 6-stage lifecycle.

- **UX-006** [Metrics] Archive page has no client count. Invoices tab has no paid/unpaid breakdown or totals summary.
  Layer: Metrics | Pages: Archive, Client Detail (Invoices tab) | Refs: WF-009, WF-011
  Fix: Add total count to Archive heading. Add invoice summary metrics (total, paid, unpaid) above invoice list.

- **UX-007** [Guidance] Settings doesn't explain how sections connect to other features. Business Profile affects invoice PDFs but this isn't mentioned. Calendar section doesn't mention milestone sync.
  Layer: Guidance | Pages: Settings | Refs: WF-012, WF-013
  Fix: Add description text under each section heading explaining its impact (e.g., "Your business info appears on invoice PDFs").

- **UX-008** [Next Steps] Settings has no priority ordering or setup completion indicators. New users don't know what to configure first.
  Layer: Next Steps | Pages: Settings | Refs: WF-012
  Fix: Add subtle "recommended" badges or order sections by importance. Add completion indicators.

- **UX-009** [Intent] Client Detail's tab structure is clear but the relationship between tabs and the client lifecycle is unclear. First-time users won't know that Notes are for consultation notes, Files for design files, etc.
  Layer: Accessibility of Intent | Pages: Client Detail | Refs: WF-003
  Fix: Addressed by UX-004 (tab-level guidance in empty states).

### Low

- **UX-010** [Progress] Pipeline columns show individual counts but no overall pipeline summary metrics.
  Layer: Progress/Status | Pages: Pipeline
  Fix: Addressed by UX-003 (pipeline summary bar).

- **UX-011** [Next Steps] Archive page shows client links but no guidance on when to permanently delete vs restore.
  Layer: Next Steps | Pages: Archive
  Fix: Add brief guidance text or tooltip explaining the difference between restore and permanent delete.

- **UX-012** [Next Steps] After registration, user is redirected to pipeline with no welcome step or orientation.
  Layer: Next Steps | Pages: Login -> Pipeline | Refs: WF-002
  Fix: Addressed by Phase 6 onboarding assessment (first-run setup wizard or product tour if warranted).

## Summary
- **Total findings:** 12
- **By severity:** 0 critical, 4 high, 5 medium, 3 low
- **Pages with worst scores:** Pipeline (5/9), Client Detail (4/9), Archive (5/9)
- **Most common missing layer:** Guidance (missing on 3 pages), Next Steps (missing on 3 pages)
- **Workflows at risk:** First-time setup (Bumpy), Pipeline lifecycle (Bumpy), Settings config (Bumpy)

## Results

### Before/After Scorecard
| Page | Before | After | Change |
|------|--------|-------|--------|
| Landing | 5/5 | 5/5 | -- |
| Login | 5/6 | 5/6 | -- |
| Pipeline | 5/9 | 8/9 | +3 |
| Client Detail | 4/9 | 7/9 | +3 |
| Archive | 5/9 | 8/9 | +3 |
| Settings | 4/5 | 5/5 | +1 |

### Summary
- **Findings resolved:** 12/12
- **Average page score:** 4.7/9 -> 7.0/9 (applicable pages only, excluding Landing/Login)
- **Workflows fixed:** First-time setup (Bumpy -> Smooth), Pipeline lifecycle (Bumpy -> Smooth), Settings config (Bumpy -> Smooth)
- **Components created:** GuidanceTip, StatusSummary, NextStepCard, PageIntro (in src/components/ux/)
- **Onboarding:** 4-step setup wizard (Welcome, Business Profile, First Client, Done) + 5-stop site tour with custom tooltips
- **Settings integration:** "Restart Setup Wizard" + "Replay App Tour" buttons in Settings > Onboarding
- **Pages modified:** 7 (PipelinePage, AddClientSheet, ClientDetailPage, SettingsPage, ArchivePage, OnboardingPage [new], TourProvider [updated])
- **Anti-pattern check:** All 8 anti-patterns verified clear
- **Deployed:** https://fieldflow-crm-app.web.app
