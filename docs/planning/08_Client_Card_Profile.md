## Overview

The client detail page is the central hub for everything about a single client. It opens when an architect clicks a client card on the pipeline board or in the archive view. The page displays contact information, property details, and a tabbed interface for notes, files, invoices, and milestones. This file covers the profile/overview tab and the shared page shell. Other tabs are defined in their own files.

## Dependencies

- `02_Database_Schema.md` -- `clients/{clientId}` document shape, all field definitions
- `05_UI_Design_System.md` -- Card patterns, form error states, badge variants, empty states
- `06_Layout_Navigation.md` -- Content area layout, back link, tab structure
- `07_Pipeline_View.md` -- Navigation from pipeline card click

## Page Shell

### URL

`/clients/:clientId`

### Data Loading

Read the client document at `users/{uid}/clients/{clientId}` using a real-time listener (`onSnapshot`). If the document does not exist or `clientId` is invalid, show a "Client not found" message with a "Back to Pipeline" button.

### Header

```
← Back to Pipeline

Johnson Residence                    [Stage: Active Design ▾]  [⋮]
```

**Back link**: Left arrow icon + "Back to Pipeline" (or "Back to Archive" if referred from `/archive`). `text-sm text-muted-foreground` with hover underline.

**Client name**: `text-xl font-semibold` as the page title.

**Stage selector**: A dropdown (shadcn/ui `Select`) showing the current stage. Selecting a different stage immediately updates the client's `stage` field in Firestore, updates `lastActivityAt`, and writes a `stage_change` activity log entry. This is the mobile-friendly alternative to drag-and-drop.

**Actions menu**: A three-dot icon button (Lucide `MoreVertical`) opening a `DropdownMenu` with:

| Action | Icon | Behavior |
|---|---|---|
| Edit Client | `Pencil` | Opens edit mode on the Overview tab |
| Archive | `Archive` | Confirmation dialog, then sets `archived: true`. See `15_Archive_Management.md` |
| Delete | `Trash2` | Only visible if client is archived. See `15_Archive_Management.md` |

### Tab Bar

Horizontal tabs below the header (shadcn/ui `Tabs`). See `06_Layout_Navigation.md` for tab list. Default tab is Overview.

## Overview Tab

The Overview tab displays client contact information and property details in a read-only layout with an edit mode toggle.

### Read Mode Layout

Two-column layout on desktop (`lg`), single column on mobile.

**Left column -- Contact Information:**

| Field | Display | Icon |
|---|---|---|
| Email | Displayed as a `mailto:` link | `Mail` |
| Phone | Displayed as a `tel:` link | `Phone` |
| Address | Plain text, line-wrapped | `MapPin` |
| Source | Badge style | `UserPlus` |
| Budget Range | Plain text | `DollarSign` |

Each field shows the icon, label in `text-xs text-muted-foreground`, and value below it. If a field is empty, show `text-muted-foreground` italic text: "Not provided".

**Right column -- Property Details:**

| Field | Display |
|---|---|
| Lot Size | Plain text |
| Soil Type | Plain text |
| Sun Exposure | Plain text |
| Existing Features | Multi-line plain text |

Same layout pattern as contact info. Heading: "Property Details" in `text-base font-semibold`.

**Empty state**: If no property details fields are populated, show a muted message: "No property details yet. Click Edit to add." instead of four "Not provided" rows.

### Edit Mode

Triggered by the "Edit Client" action in the header menu or an "Edit" button on the Overview tab itself. Replaces the read-only display with a form.

**Form structure**: Same two-column layout. Each display field becomes an input.

| Field | Input Type | Validation |
|---|---|---|
| Name | Text input | Required, non-empty |
| Email | Text input | Optional, valid email format if provided |
| Phone | Text input | Optional, no format enforcement |
| Address | Textarea | Optional |
| Source | Select dropdown | Optional, same options as quick-add form |
| Budget Range | Text input | Optional, freeform |
| Lot Size | Text input | Optional, freeform |
| Soil Type | Text input | Optional, freeform |
| Sun Exposure | Text input | Optional, freeform |
| Existing Features | Textarea | Optional |

Use React Hook Form with Zod schema validation. Only `name` is required.

**Form actions**: "Save" (primary) and "Cancel" (outline) buttons at the bottom of the form. Cancel reverts to read mode without saving. Save writes to Firestore and returns to read mode.

**On save**: Update the client document. Set `updatedAt` to server timestamp. If any fields changed, also update `lastActivityAt` and write an activity log entry. Show a success toast.

## Stage Change from Dropdown

The stage selector in the header allows changing a client's stage without drag-and-drop. This is the primary stage-change mechanism on mobile.

**Behavior on stage change**:

1. Update `client.stage` to the selected value
2. Update `client.stageOrder` to `max(existing orders in target stage) + 1.0` (append to bottom of new column)
3. Update `client.lastActivityAt` to server timestamp
4. Write activity log entry: type `stage_change`, description "Moved to {new stage label}"
5. All four writes in a single batch write
6. Show toast: "Moved to {stage label}"

The stage dropdown shows all six stages. The current stage is visually indicated (check mark or highlighted). No confirmation dialog for stage changes -- they are easily reversible.

## Client Summary Section

Below the header and above the tabs, show a compact summary strip with key metrics for the client at a glance.

```
┌─────────────────────────────────────────────────────────┐
│ Created: Mar 15, 2026  │  Notes: 4  │  Files: 7  │  Invoices: $12,500  │  Next: Site Visit (May 20) │
└─────────────────────────────────────────────────────────┘
```

| Metric | Source | Format |
|---|---|---|
| Created | `createdAt` | `MMM d, yyyy` via date-fns |
| Notes | Count of `notes` subcollection | Integer |
| Files | Count of `files` subcollection | Integer |
| Invoices | Sum of `total` from `invoices` subcollection | Currency, e.g., "$12,500" |
| Next milestone | Nearest future uncompleted milestone | Title + date, or "None" |

**Data source for counts**: These counts require reading subcollections. Load them on the client detail page mount. Use `getCountFromServer()` for notes and files counts (avoids downloading all documents just to count). For invoices, a query is needed anyway to compute the total, so use the results. For next milestone, query milestones where `completed == false` ordered by `date` ascending, limit 1.

**Styling**: `text-xs text-muted-foreground`. Separated by vertical dividers. Horizontal scroll on mobile if overflow.

## Client Detail Data Architecture

The client detail page loads data from multiple subcollections. Each tab manages its own data loading independently to avoid fetching everything upfront.

| Tab | Data Loaded | When |
|---|---|---|
| Overview | Client document (already loaded via page-level listener) + subcollection counts | On page mount |
| Notes | `notes` subcollection | When Notes tab is selected |
| Files | `files` subcollection | When Files tab is selected |
| Invoices | `invoices` subcollection | When Invoices tab is selected |
| Milestones | `milestones` subcollection | When Milestones tab is selected |

Each tab attaches its own Firestore listener when activated and detaches when the user switches away. This keeps Firestore read costs proportional to what the user actually views.

**Exception**: The summary strip loads counts on mount regardless of active tab, since it is always visible.

## Gaps & Assumptions

| Gap | Default Applied |
|---|---|
| No client photo/avatar | Clients display a letter avatar (first letter of name) similar to the user avatar in the sidebar. Same pattern: colored circle with white text |
| No duplicate client detection | Architects can create two clients with the same name. At 5-15 clients this is easily noticed and self-corrected |
| No field history or change tracking | Only the activity log records that a change happened, not what changed. Full field-level audit trail is post-MVP |
| Subcollection counts may be slightly stale | `getCountFromServer()` is a point-in-time read, not real-time. Counts update when the user navigates away and back, or refreshes. Acceptable tradeoff for avoiding full subcollection listeners just for counts |
| No print view for client profile | Not needed at MVP. Architects who want a printable summary can use browser print or export post-MVP |
| Budget range is freeform text, not structured | No currency parsing, no min/max fields. The display shows whatever the architect typed. Structured budget tracking is post-MVP |  
