## Overview

FieldFlow uses a sidebar-plus-content layout. The sidebar provides navigation between the pipeline view, archive, and settings. The content area fills the remaining width and hosts all page content. The layout is desktop-first -- the sidebar is always visible on large screens and collapses to a hamburger menu on mobile.

## Dependencies

- `01_Auth.md` -- Auth context provides user data for the sidebar user menu and route protection
- `05_UI_Design_System.md` -- Colors, spacing, typography, and component patterns

## Route Structure

| Path | Page | Description |
|---|---|---|
| `/login` | Login | Auth page. No sidebar. See `01_Auth.md` |
| `/` | Pipeline | Default landing page. Pipeline board. See `07_Pipeline_View.md` |
| `/clients/:clientId` | Client Detail | Client card with tabs. See `08_Client_Card_Profile.md` |
| `/archive` | Archive | Archived clients list. See `15_Archive_Management.md` |
| `/settings` | Settings | Business profile, Calendar, preferences. See `16_Settings_Page.md` |

All routes except `/login` render inside the app shell (sidebar + content area). The login page is a standalone layout with no sidebar.

## App Shell

```
┌──────────────────────────────────────────────────┐
│ ┌──────────┐ ┌─────────────────────────────────┐ │
│ │          │ │                                 │ │
│ │ Sidebar  │ │         Content Area            │ │
│ │  (240px) │ │    (remaining width, p-6)       │ │
│ │          │ │                                 │ │
│ │          │ │                                 │ │
│ │          │ │                                 │ │
│ │          │ │                                 │ │
│ │ [User]   │ │                                 │ │
│ └──────────┘ └─────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

### Sidebar

**Width**: `w-60` (240px) fixed on desktop.

**Background**: `bg-card` with a `border-r border-border` separating it from the content area.

**Structure** (top to bottom):

1. **App header** -- Logo/icon + "FieldFlow" text. `p-4 mb-2`. Clicking navigates to `/` (pipeline).

2. **Navigation items** -- Vertical list of nav links.

3. **User section** -- Pinned to the bottom of the sidebar.

### Navigation Items

| Label | Icon (Lucide) | Path | Notes |
|---|---|---|---|
| Pipeline | `Kanban` | `/` | Active when on `/` exactly |
| Archive | `Archive` | `/archive` | Active when on `/archive` |
| Settings | `Settings` | `/settings` | Active when on `/settings` |

**Nav item styling**:
- Default: `ghost` button style, full width, left-aligned text with icon
- Active: `bg-muted text-foreground font-medium`
- Hover: `bg-muted/50` with `duration-150 ease-out` transition
- Icon size: `w-5 h-5`, `gap-3` between icon and label

Client detail pages (`/clients/:clientId`) do not have a dedicated nav item. The Pipeline item stays highlighted when viewing a client, since clients are accessed from the pipeline.

### User Section

Pinned to the bottom of the sidebar with `mt-auto`. Contains:

- User avatar (first letter of `displayName` in a colored circle, `w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm`)
- Display name (truncated with `truncate` if long)
- Email below the name in `text-xs text-muted-foreground`, also truncated

Clicking the user section opens a dropdown menu (shadcn/ui `DropdownMenu`) with:

| Item | Icon | Action |
|---|---|---|
| Settings | `Settings` | Navigate to `/settings` |
| Sign Out | `LogOut` | Call `signOut()` from auth context |

## Content Area

**Layout**: Fills remaining width after the sidebar. `p-6` padding on all sides.

**Page header pattern**: Each page starts with a header row containing:
- Page title (left-aligned, `text-xl font-semibold`)
- Primary action button (right-aligned, if applicable)

```
┌─────────────────────────────────────────┐
│ Page Title                    [Action]  │
│                                         │
│ Page content...                         │
│                                         │
└─────────────────────────────────────────┘
```

Page header examples:

| Page | Title | Action Button |
|---|---|---|
| Pipeline | Pipeline | + Add Client |
| Archive | Archive | (none) |
| Settings | Settings | (none) |
| Client Detail | {client.name} | (context-specific actions) |

### Scroll Behavior

The content area scrolls independently of the sidebar. The sidebar is fixed/sticky for the full viewport height. Use `h-screen overflow-y-auto` on the sidebar and content area independently.

The pipeline view has its own horizontal scroll behavior for columns (see `07_Pipeline_View.md`). The content area's vertical scroll accommodates pages with more content than viewport height (client detail, settings).

## Client Detail Page Layout

When viewing a client (`/clients/:clientId`), the content area shows a detail layout with a back navigation link and tabbed content.

**Back link**: Top of the content area, above the page header. Left arrow icon + "Back to Pipeline" (or "Back to Archive" if navigated from archive). Uses `useNavigate(-1)` or explicit path based on referrer.

**Page header**: Client name as the title. Right side contains action buttons (Archive, Edit, etc. -- see `08_Client_Card_Profile.md`).

**Tabs**: Below the header, a horizontal tab bar (shadcn/ui `Tabs`) with:

| Tab | Contents | Reference |
|---|---|---|
| Overview | Contact info + property details | `08_Client_Card_Profile.md` |
| Notes | Running notes + activity log | `09_Notes_Activity_Log.md` |
| Files | File uploads organized by folder | `10_File_Management.md` |
| Invoices | Invoice list + create/edit | `11_Financials_Invoices.md` |
| Milestones | Milestone timeline | `12_Milestones_Scheduling.md` |

Default active tab: **Overview**.

Tab state is not persisted in the URL. Navigating away and back resets to Overview. This keeps routing simple.

## Responsive Behavior

### Desktop: 1024px+ (`lg`)

Full layout as described above. Sidebar visible, content area fills remaining width.

### Tablet: 768-1023px (`md`)

Sidebar collapses to an icon-only rail (`w-16`, 64px). Shows only icons, no labels. Hovering an icon shows a tooltip with the label. The user section shows only the avatar circle.

Content area gains the space freed by the narrower sidebar.

### Mobile: below 768px (`sm`)

Sidebar is hidden entirely. A top bar replaces it:

```
┌─────────────────────────────────────────┐
│ [☰]  FieldFlow              [Avatar]   │
├─────────────────────────────────────────┤
│                                         │
│         Content Area (p-4)              │
│                                         │
└─────────────────────────────────────────┘
```

**Top bar**: `h-14`, `bg-card`, `border-b border-border`. Hamburger icon on the left, app name centered, user avatar on the right.

**Hamburger menu**: Opens a shadcn/ui `Sheet` (slide-over from left) containing the full sidebar navigation. Closes on nav item click or outside tap.

**Content padding**: Reduced to `p-4` on mobile for more usable space.

**Client detail tabs on mobile**: Tabs scroll horizontally if they overflow. Use `overflow-x-auto` on the tab list with `scrollbar-hide`.

## Navigation Behavior

### Page Transitions

No animated page transitions. React Router swaps content instantly. This keeps the implementation simple and avoids jank on slower devices.

### Active State Detection

Use React Router's `NavLink` component with its built-in active class support. Match exact paths for Pipeline (`/`) and prefix paths for other routes.

### Deep Linking

All routes are directly accessible via URL. Firebase Hosting must be configured for SPA routing -- all paths return `index.html`:

```json
{
  "hosting": {
    "rewrites": [
      { "source": "**", "destination": "/index.html" }
    ]
  }
}
```

### 404 Handling

Unmatched routes redirect to `/` (pipeline). No dedicated 404 page at MVP.

Invalid client IDs (`/clients/:clientId` where the document doesn't exist) show an error state in the content area: "Client not found" message with a button to return to the pipeline.

## Gaps & Assumptions

| Gap | Default Applied |
|---|---|
| No breadcrumb navigation | Back link on client detail page is sufficient. Breadcrumbs add complexity for a shallow route hierarchy |
| No keyboard shortcuts | Not needed at MVP. Could add post-MVP (e.g., `G P` for pipeline, `G A` for archive) |
| Tab state not in URL | Simplifies routing. Revisit if users report frustration with losing tab position |
| No sidebar collapse toggle on desktop | Sidebar is always 240px on desktop. A collapse toggle adds UI complexity for minimal benefit at this screen count |
| No loading state between page navigations | Data loads fast enough from Firestore listeners that a skeleton per-page is sufficient. No route-level loading bar |
| Mobile pipeline behavior not fully specified | See `07_Pipeline_View.md` for how the pipeline adapts to mobile (list view replaces board) |  
