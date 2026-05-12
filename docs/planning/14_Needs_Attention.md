## Overview

The Needs Attention system is FieldFlow's proactive awareness layer. It flags clients that have gone stale (no activity for a configurable number of days) and clients with milestones due within 48 hours. Flags appear in two places: a summary banner above the pipeline board and warning badges on individual client cards. The system is read-only -- it does not send notifications, emails, or reminders. It surfaces information the architect acts on at their own pace.

## Dependencies

- `02_Database_Schema.md` -- `client.lastActivityAt` field, `milestones` subcollection, `user.settings.stalenessThresholdDays`
- `05_UI_Design_System.md` -- `warning` color token, badge variants, toast patterns
- `07_Pipeline_View.md` -- Banner placement above the board, badge on client cards
- `16_Settings_Page.md` -- Staleness threshold configuration

## Attention Triggers

A client "needs attention" if either condition is true:

### 1. Staleness

The client has had no activity for longer than the user's configured threshold.

**Calculation**: `now - client.lastActivityAt > stalenessThresholdDays`

**Default threshold**: 14 days. Configurable per user in Settings (see `16_Settings_Page.md`).

**What counts as activity** (resets `lastActivityAt`):
- Stage change
- Note added
- File uploaded
- Invoice created
- Invoice marked as paid
- Milestone created
- Milestone completed
- Client profile edited (field changes, not just opening the page)

**What does not count**:
- Viewing the client card
- Editing a note (edits update the note, not the client)
- Editing an invoice
- Editing a milestone
- Generating a PDF

### 2. Milestone Proximity

The client has an uncompleted milestone with a date within 48 hours (past or future).

**Calculation**: `milestone.completed == false && abs(now - milestone.date) <= 48 hours`

This catches both approaching milestones (due tomorrow) and recently passed milestones that were not marked complete (due yesterday). Overdue milestones continue triggering attention until completed or deleted.

### Combined Logic

A client can trigger both conditions simultaneously. The client appears once in the banner (not duplicated), but both reasons are indicated.

## Computing Attention State

### When to Compute

Attention state is computed **client-side on each pipeline view render**. There is no server-side scheduled function or Firestore field tracking attention status.

**On pipeline view mount**:
1. The real-time listener delivers all non-archived clients
2. Read the user's `settings.stalenessThresholdDays`
3. For each client, check if `lastActivityAt` exceeds the threshold
4. For milestone proximity, query each flagged-as-stale client's milestones -- but this is expensive

**Optimization**: Milestone proximity checking for all clients on every render is costly (one subcollection query per client). Two approaches:

**Approach A -- Query milestones only for stale clients**: First identify stale clients by `lastActivityAt`, then query milestones only for those clients. Reduces reads but misses non-stale clients with imminent milestones.

**Approach B -- Single milestones query** (recommended): Maintain a top-level query across all milestones. But milestones are nested under clients, so a collection group query is needed.

**Recommended approach**: Use a Firestore **collection group query** on `milestones` where `completed == false` and `date` is within 48 hours of now. This returns all approaching/overdue milestones across all clients in a single query. Combine with the staleness check on the already-loaded client data.

**Collection group query requirement**: Firestore requires a collection group index for `milestones`. Add a composite index: `completed` ASC + `date` ASC on the `milestones` collection group. Add this to the indexes listed in `02_Database_Schema.md`.

### Staleness Check

Pure frontend computation. No Firestore query needed beyond the already-loaded client data:

```
const isStale = (client, thresholdDays) => {
  const daysSinceActivity = differenceInDays(now, client.lastActivityAt)
  return daysSinceActivity > thresholdDays
}
```

Use `differenceInDays` from date-fns.

### Milestone Proximity Check

Collection group query executed on pipeline view mount:

- Collection group: `milestones`
- Filters: `completed == false`, `date >= 48 hours ago`, `date <= 48 hours from now`
- This returns milestone documents with their full path, from which `clientId` can be extracted

Build a `Set<string>` of client IDs that have approaching milestones. Merge with the stale client set.

## Needs Attention Banner

### Placement

Above the pipeline board, below the page header. Only visible when at least one client needs attention. Hidden when no clients are flagged.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ ⚠  3 clients need attention                        [Dismiss]│
│                                                              │
│  Johnson ── No activity for 18 days                          │
│  Martinez ── Site Visit due tomorrow                         │
│  Chen ── No activity for 21 days · Installation overdue      │
└──────────────────────────────────────────────────────────────┘
```

### Banner Styling

- Background: `bg-warning/10` (subtle warm tint)
- Left border: `border-l-4 border-warning`
- Padding: `p-4`
- Rounded: `rounded-r-lg`

### Banner Header

- Warning icon (Lucide `AlertTriangle`) in `text-warning`
- Count: "{n} client(s) need attention" in `text-sm font-medium`
- Dismiss button: `ghost` icon button with Lucide `X`, right-aligned

### Client Rows

Each flagged client shows:

| Element | Styling |
|---|---|
| Client name | `text-sm font-medium text-primary cursor-pointer` -- clickable, navigates to client detail |
| Reason(s) | `text-sm text-muted-foreground` after a dash separator |

**Reason text formats**:

| Trigger | Text |
|---|---|
| Staleness | "No activity for {n} days" |
| Milestone due today | "{title} due today" |
| Milestone due tomorrow | "{title} due tomorrow" |
| Milestone due in 2 days | "{title} due in 2 days" |
| Milestone overdue by 1 day | "{title} overdue by 1 day" |
| Milestone overdue by n days | "{title} overdue by {n} days" |
| Both triggers | Join with " · " (middle dot separator) |

### Dismiss Behavior

The dismiss button hides the banner for the current session. It reappears on page refresh or next visit. Dismiss state is stored in React component state only -- not persisted to Firestore.

**Rationale**: The banner is a reminder, not an alert. Dismissing it means "I've seen this, I'll handle it." It comes back next session in case the situation is still unresolved.

### Banner Expansion

If more than 3 clients need attention, show the first 3 and a "Show {n} more" text button that expands the list. Collapsed by default to keep the banner compact.

## Client Card Badges

### Pipeline Card Badge

On client cards in the pipeline view (see `07_Pipeline_View.md`), flagged clients show a small warning indicator.

- Badge: Lucide `AlertTriangle` icon, `w-4 h-4`, `text-warning`
- Position: Top-right corner of the card
- Tooltip on hover: Brief reason (e.g., "No activity for 18 days")

### Client Detail Page

No special badge on the client detail page. The architect can see the activity log and milestone statuses directly, which provides the same information in more detail.

## Edge Cases

**Client in "Complete" stage**: Staleness checks still apply to completed clients. An architect may want to follow up after project completion. If this creates noise, the architect can archive the client.

**Archived clients**: Never included in attention checks. The pipeline query already filters `archived == false`.

**New clients**: A freshly created client has `lastActivityAt` set to `createdAt`. The staleness clock starts at creation, not at some future point. A lead sitting untouched for 14+ days will be flagged.

**Threshold change**: If the architect changes their staleness threshold in Settings, the banner updates on the next pipeline view render. No historical recalculation needed -- it's a live comparison.

**Zero threshold**: If set to 0, every client would be flagged. The Settings UI should enforce a minimum of 1 day.

## Gaps & Assumptions

| Gap | Default Applied |
|---|---|
| No email or push notifications | Attention flags are passive, visible only when the architect opens the app. Notifications are post-MVP (see `17_Future_Features.md`) |
| No per-client snooze | Cannot snooze attention for a specific client (e.g., "remind me about Johnson in a week"). Dismiss hides the entire banner, not individual entries |
| No attention history | No record of when a client was flagged or for how long. The system is purely real-time |
| Collection group query requires index | Add `milestones` collection group index (`completed` ASC, `date` ASC) to Firestore indexes. Must be deployed before milestone proximity checks work |
| Milestone proximity is checked on pipeline mount only | If the architect leaves the pipeline open for hours, the banner does not update dynamically. It refreshes on next navigation to the pipeline or page reload |
| Missing critical fields not flagged | Per PRD decision, only staleness and milestone proximity are checked. Missing phone number, address, or other fields do not trigger attention |
| Performance with many clients | Collection group query and staleness check across all clients is fine for 5-15 active clients. At 50+ clients, consider caching or server-side computation |  
