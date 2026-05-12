## Overview

The Milestones tab on the client detail page lets architects track key dates for a client's project -- site visits, install starts, final walkthroughs, and any other scheduled events. Milestones display as a vertical timeline sorted by date. Each milestone can optionally sync to Google Calendar as a separate event (see `13_Google_Calendar_Sync.md`). This file covers the milestones UI and data operations. Calendar sync mechanics are in the next file.

## Dependencies

- `02_Database_Schema.md` -- `milestones/{milestoneId}` subcollection shape
- `05_UI_Design_System.md` -- Badge variants (upcoming, overdue, completed), empty states, form patterns
- `08_Client_Card_Profile.md` -- Tab structure, summary strip "Next milestone" display
- `13_Google_Calendar_Sync.md` -- Calendar sync triggered by milestone writes

## Data Loading

Attach a Firestore real-time listener on `users/{uid}/clients/{clientId}/milestones` ordered by `date` ascending when the Milestones tab becomes active. Detach on tab switch or page unmount.

## Milestone List

### Layout

Milestones display as a vertical timeline with a thin connecting line.

```
┌──────────────────────────────────────────────────┐
│ Milestones                     [+ Add Milestone]  │
│                                                   │
│  ●── Site Assessment                              │
│  │   Mar 15, 2026                    [Completed]  │
│  │                                                │
│  ●── Design Presentation                          │
│  │   Apr 2, 2026                     [Completed]  │
│  │                                                │
│  ◉── Installation Start            ← upcoming     │
│  │   May 20, 2026                    [Upcoming]   │
│  │                                                │
│  ○── Planting Phase                               │
│  │   Jun 8, 2026                     [Upcoming]   │
│  │                                                │
│  ○── Final Walkthrough                            │
│      Jul 1, 2026                     [Upcoming]   │
└──────────────────────────────────────────────────┘
```

### Timeline Visual

- **Connecting line**: `border-l-2 border-border` running vertically on the left, connecting milestone nodes
- **Node indicators**: Circles on the line, styled by status
- **Last milestone**: No line extending below it

### Milestone Item

Each milestone row contains:

| Element | Position | Styling |
|---|---|---|
| Status node | Left, on the timeline line | Circle icon, color varies by status |
| Title | Top right of node | `text-sm font-medium` |
| Date | Below title | `text-xs text-muted-foreground`, formatted as `MMM d, yyyy` |
| Status badge | Far right, aligned with title | shadcn/ui `Badge` |
| Actions | Far right, next to badge | Icon buttons on hover |

### Milestone Status

Status is derived from `completed` flag and `date` relative to today. Not stored as a field.

| Condition | Status | Node Style | Badge |
|---|---|---|---|
| `completed == true` | Completed | Lucide `CircleCheck`, `text-success` | `success` background, "Completed" |
| `completed == false` and `date` is past | Overdue | Lucide `AlertCircle`, `text-destructive` | `destructive` background, "Overdue" |
| `completed == false` and `date` is today or within 48 hours | Due Soon | Lucide `Clock`, `text-warning` | `warning` background, "Due Soon" |
| `completed == false` and `date` is future (beyond 48 hours) | Upcoming | Lucide `Circle`, `text-muted-foreground` | `outline` variant, "Upcoming" |

**"Due Soon" threshold**: 48 hours. This matches the Needs Attention milestone proximity flag described in `14_Needs_Attention.md`.

### Milestone Actions

Visible on hover (desktop) or via a three-dot menu (mobile):

| Action | Icon | Behavior |
|---|---|---|
| Toggle complete | `CircleCheck` | Toggles `completed` field |
| Edit | `Pencil` | Opens edit form |
| Delete | `Trash2` | Confirmation dialog, then delete |

### Empty State

Lucide `Calendar` icon, "No milestones yet" heading, "Add key dates like site visits and installation" description, "Add Milestone" button.

## Add Milestone

The "Add Milestone" button opens a `Dialog` (shadcn/ui) with a compact form.

### Form Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| Title | Text input | Yes | Placeholder: "e.g., Site Visit, Install Start" |
| Date | Date picker | Yes | Default: empty |

Two fields only. Milestones are intentionally simple -- a title and a date. No time, no duration, no description, no assignee.

### Quick-Add Suggestions

Below the title field, show a row of clickable suggestion chips for common landscape milestones:

| Suggestion |
|---|
| Site Assessment |
| Design Presentation |
| Client Approval |
| Installation Start |
| Planting Phase |
| Final Walkthrough |

Clicking a chip fills the title field. The architect can still type a custom title.

### Form Validation (Zod)

| Rule | Error Message |
|---|---|
| Title required | Title is required |
| Date required | Date is required |

No restriction on past dates -- architects may want to log milestones that already occurred.

### On Save

Batch write:
1. Create the milestone document with `completed: false`, `calendarEventId: null`
2. Update `client.lastActivityAt`
3. Write activity log entry: type `milestone_created`, description "Added milestone: {title}"
4. Close the dialog
5. Show success toast: "Milestone added"

If Calendar sync is enabled, the Firestore write triggers the `onMilestoneWrite` Cloud Function which creates the Calendar event asynchronously (see `13_Google_Calendar_Sync.md`).

## Edit Milestone

Same dialog as Add, pre-filled with existing values. The title and date can both be modified.

### On Save

1. Update the milestone document with new title and/or date, set `updatedAt`
2. No activity log entry for edits
3. No `lastActivityAt` update for edits
4. Close the dialog
5. Show success toast: "Milestone updated"

If Calendar sync is enabled and `calendarEventId` exists, the Cloud Function updates the existing Calendar event.

## Toggle Complete

Single-click action, no confirmation needed.

**Marking complete**:
1. Update milestone: `completed: true`, set `updatedAt`
2. Update `client.lastActivityAt`
3. Write activity log entry: type `milestone_completed`, description "Completed milestone: {title}"
4. Show toast: "Milestone completed"

**Marking incomplete** (undo):
1. Update milestone: `completed: false`, set `updatedAt`
2. No activity log entry (it is a correction)
3. Show toast: "Milestone reopened"

Calendar events are not deleted when a milestone is completed. The event remains on the calendar as a historical record. If the architect doesn't want it, they can delete the milestone entirely.

## Delete Milestone

Confirmation dialog: "Delete {title}? This will also remove it from Google Calendar if synced."

**On confirm**:
1. Delete the milestone document
2. No activity log entry for deletion
3. No `lastActivityAt` update
4. Show toast: "Milestone deleted"

The Firestore deletion triggers `onMilestoneWrite` (delete case), which removes the Calendar event if `calendarEventId` was set.

## Milestone Ordering

Milestones are sorted by `date` ascending (chronological). Completed milestones are **not** separated into a different section -- they remain in chronological position so the timeline reads as a coherent project history.

If two milestones share the same date, sort by `createdAt` ascending as a tiebreaker.

## Client Summary Integration

The summary strip on the client detail page (see `08_Client_Card_Profile.md`) shows the next upcoming milestone. This is the nearest-future uncompleted milestone.

**Query**: `milestones` where `completed == false`, ordered by `date` ascending, limit 1. Run on client detail page mount.

**Display**: "{title} ({date})" or "None" if no upcoming milestones exist.

## Mobile Behavior

The timeline layout remains vertical on mobile. The connecting line and nodes scale down slightly. Actions are accessed via a three-dot menu on each milestone row instead of hover icons.

Date picker uses the native mobile date picker for better touch interaction.

## Gaps & Assumptions

| Gap | Default Applied |
|---|---|
| No time-of-day on milestones | All-day events only. Landscape milestones are day-level planning. Calendar events are created as all-day events |
| No recurring milestones | Each milestone is a one-time entry. Recurring events (weekly site checks) would need to be created individually |
| No milestone categories or color coding | All milestones look the same except for status. Categories (design, installation, admin) could be added post-MVP |
| No drag-to-reorder milestones | Order is strictly by date. Cannot manually reorder milestones with the same date |
| No milestone dependencies | No "blocked by" or "starts after" relationships between milestones. Simple flat list |
| No notifications for approaching milestones | The Needs Attention system flags milestones due within 48 hours on the pipeline view, but no push notifications or emails |
| Quick-add suggestions are hardcoded | The six suggestion chips are not user-configurable. They cover the most common landscape project milestones |
| Completed milestones stay visible forever | No auto-hide or archive for old completed milestones. At 5-15 clients with a handful of milestones each, the list stays manageable |  
