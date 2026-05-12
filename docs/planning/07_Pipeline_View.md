## Overview

The pipeline view is FieldFlow's home screen -- a Kanban-style board with six fixed columns representing the stages a landscape client moves through. Architects open the app and immediately see where every active client stands. Clients appear as cards within their stage column and can be dragged between stages. A "Needs Attention" banner sits above the board when stale clients exist (see `14_Needs_Attention.md`).

## Dependencies

- `02_Database_Schema.md` -- `clients` subcollection, `stage` and `stageOrder` fields
- `05_UI_Design_System.md` -- Card patterns, stage colors, hover/drag states, empty states
- `06_Layout_Navigation.md` -- Content area layout, page header with "Add Client" button
- `14_Needs_Attention.md` -- Banner component rendered above the board

## Pipeline Stages

Six fixed stages, ordered left to right. Not user-configurable.

| Order | Stage Key | Display Label | Top Border Color Token |
|---|---|---|---|
| 1 | `lead` | Lead | `stage-lead` |
| 2 | `consultation` | Consultation | `stage-consultation` |
| 3 | `proposal` | Proposal | `stage-proposal` |
| 4 | `active_design` | Active Design | `stage-active-design` |
| 5 | `installation` | Installation | `stage-installation` |
| 6 | `complete` | Complete | `stage-complete` |

## Data Loading

Single Firestore real-time listener on `users/{uid}/clients` with `where("archived", "==", false)`. This returns all active clients in one query. The frontend groups them by `stage` and sorts within each group by `stageOrder` ascending.

**Listener setup**: Attach on component mount, detach on unmount. Use Firestore's `onSnapshot` for real-time updates.

**Initial load**: Show skeleton cards in each column (see `05_UI_Design_System.md`) until the first snapshot arrives.

**Empty state**: If zero clients exist, show a centered empty state across the full board area: `Users` icon, "No clients yet" heading, "Add your first client to get started" description, and an "Add Client" primary button.

## Board Layout

```
┌────────────────────────────────────────────────────────┐
│ Pipeline                                [+ Add Client] │
├────────────────────────────────────────────────────────┤
│ (Needs Attention banner, if applicable)                │
├──────────┬──────────┬──────────┬────────┬──────┬──────┤
│ Lead (2) │Consult(1)│Proposal  │Active  │Install│Done │
│ ═══════  │ ═══════  │(3)══════ │Design  │(0)═══│(4)══│
│ ┌──────┐ │ ┌──────┐ │ ┌──────┐ │(1)════ │      │┌────┐│
│ │Card  │ │ │Card  │ │ │Card  │ │┌──────┐│      ││Card││
│ └──────┘ │ └──────┘ │ └──────┘ ││Card  ││      │└────┘│
│ ┌──────┐ │          │ ┌──────┐ │└──────┘│      │┌────┐│
│ │Card  │ │          │ │Card  │ │        │      ││Card││
│ └──────┘ │          │ └──────┘ │        │      │└────┘│
│          │          │ ┌──────┐ │        │      │┌────┐│
│          │          │ │Card  │ │        │      ││Card││
│          │          │ └──────┘ │        │      │└────┘│
└──────────┴──────────┴──────────┴────────┴──────┴──────┘
```

### Column Structure

Each column consists of:

1. **Column header**: Stage label + client count badge. `3px` top border in the stage color. `p-3` padding. `text-sm font-semibold` for the label. Count in a `muted` badge next to the label.

2. **Card list area**: Vertical stack of client cards with `gap-3`. Scrolls vertically if cards overflow the viewport. Each column uses `overflow-y-auto` independently.

3. **Empty column**: Shows muted text "No clients" centered in the column area. No action button per column -- the global "Add Client" button handles creation.

### Column Sizing

All columns are equal width. Use CSS grid with `grid-template-columns: repeat(6, minmax(200px, 1fr))`. Minimum column width of 200px ensures cards remain readable.

When total column width exceeds viewport, the board scrolls horizontally. Wrap the grid in `overflow-x-auto`.

## Client Cards

Each card in the pipeline represents one client document. Cards are compact to maximize the number visible without scrolling.

### Card Contents

| Element | Source Field | Styling |
|---|---|---|
| Client name | `name` | `text-sm font-semibold truncate` |
| Stage duration | Calculated from `updatedAt` or `lastActivityAt` | `text-xs text-muted-foreground`, e.g., "3 days" |
| Budget range | `budgetRange` | `text-xs text-muted-foreground`, only if present |
| Needs Attention badge | Staleness check | Warning badge, only if stale. See `14_Needs_Attention.md` |

Cards do **not** show: email, phone, property details, notes, files, or invoices. Those belong on the detail page.

### Card Interactions

**Click**: Navigate to `/clients/:clientId` to open the client detail page.

**Hover**: `bg-muted/50`, `shadow-sm` lift, `-translate-y-0.5`, `duration-150 ease-out` (see `05_UI_Design_System.md`).

**Drag**: Cursor changes to `cursor-grab` on hover, `cursor-grabbing` while dragging. Card gets `shadow-md` and `z-50` while being dragged. A visual placeholder indicates the drop position.

## Drag and Drop

### Library

Use `@dnd-kit/core` with `@dnd-kit/sortable`. This is the standard React DnD library that works well with vertical lists and cross-container movement. It supports keyboard accessibility out of the box.

### Drag Behavior

**What can be dragged**: Client cards.

**Where they can drop**: Any of the six stage columns, at any position within the column.

**Cross-column move**: Dragging a card from one column to another updates the client's `stage` field. The card is removed from the source column and inserted at the drop position in the target column.

**Within-column reorder**: Dragging a card within the same column reorders it. Updates `stageOrder` for affected cards.

### Drop Handling

On drop, perform a Firestore batch write:

1. Update the dragged client's `stage` (if changed) and `stageOrder`
2. Update `stageOrder` for other cards in the target column that shifted
3. Update `lastActivityAt` on the dragged client (stage change counts as activity)
4. Write an activity log entry with type `stage_change` (only if stage actually changed, not for within-column reorder)

**Optimistic update**: Update the local UI immediately on drop. If the Firestore write fails, revert the card to its original position and show an error toast.

### stageOrder Strategy

Use fractional ordering to avoid updating every card on every move:

- When inserting between two cards with orders `1.0` and `2.0`, assign `1.5`
- When inserting at the top, assign `min(existing) - 1.0`
- When inserting at the bottom, assign `max(existing) + 1.0`
- When the gap between adjacent cards becomes smaller than `0.001`, rebalance the entire column to integer values (`1.0, 2.0, 3.0, ...`)

This minimizes Firestore writes on each move. Rebalancing requires updating all cards in the column but happens rarely.

## Add Client

The "Add Client" button in the page header opens a `Sheet` (slide-over panel from the right, see `05_UI_Design_System.md`) with a quick-add form.

### Quick-Add Form Fields

| Field | Required | Default |
|---|---|---|
| Name | Yes | |
| Email | No | |
| Phone | No | |
| Stage | Yes | `lead` (preselected) |
| Source | No | (dropdown: Referral, Website, Social Media, Word of Mouth, Other) |

This is a minimal creation form. Additional fields (property details, address, budget) are added on the client detail page after creation.

### On Submit

1. Create the client document in Firestore with `archived: false`, `lastActivityAt: serverTimestamp()`, and `stageOrder` set to `max(existing orders in target stage) + 1.0`
2. Write an activity log entry with type `client_created`
3. Close the sheet
4. Show a success toast: "Client added"
5. The real-time listener picks up the new client and it appears in the correct column automatically

## Mobile View (below 768px)

The Kanban board does not work on narrow screens. Replace it with a grouped list view.

### Mobile Layout

- **Stage selector**: Horizontal scrollable pills/tabs at the top, one per stage with count. Active stage is highlighted. Defaults to showing all stages.
- **Client list**: Vertical list of client cards grouped by stage. Each group has a stage header with the colored left border and count.
- **Cards**: Same content as desktop cards but full-width. Tapping navigates to client detail.
- **No drag-and-drop on mobile**: Stage changes on mobile happen from the client detail page via a stage selector dropdown (see `08_Client_Card_Profile.md`).

## Keyboard Accessibility

`@dnd-kit` provides keyboard DnD support by default:
- `Tab` to focus a card
- `Space` to pick up
- Arrow keys to move
- `Space` to drop
- `Escape` to cancel

Ensure all cards have `role="button"` and descriptive `aria-label` values (e.g., "Move Johnson, currently in Proposal stage").

## Gaps & Assumptions

| Gap | Default Applied |
|---|---|
| No column WIP limits | Any number of clients can be in any stage. Landscape work doesn't follow strict WIP limits |
| No filtering or search on pipeline | Not needed at MVP with 5-15 active clients. See `17_Future_Features.md` |
| No bulk actions (move multiple clients) | Move one at a time via drag or detail page. Bulk actions add significant complexity |
| No undo on stage change | Drag back to the previous column to reverse. No toast-based undo action |
| `@dnd-kit` not in the tech stack table | Add `@dnd-kit/core` and `@dnd-kit/sortable` to project dependencies. It was implied by the drag requirement but not listed in `00_README.md` |
| No animation on card entering/leaving columns | Cards appear/disappear instantly on real-time updates. CSS transitions on list changes are complex with DnD libraries. Acceptable at MVP |
| Source dropdown values are hardcoded | The list (Referral, Website, Social Media, Word of Mouth, Other) is not user-configurable. Sufficient for MVP |  
