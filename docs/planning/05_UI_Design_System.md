## Overview

FieldFlow's visual language is clean, professional, and utility-focused. It targets landscape architects who value clarity over decoration. The design system uses shadcn/ui as the component foundation, Tailwind CSS 3.4 for styling, and Lucide React for icons. This file is the central reference for all visual decisions -- other feature files reference it rather than defining their own styles.

## Dependencies

- No file dependencies. This file is referenced by all feature files (06-16).

## Colors

### Brand Palette

| Token | Value | Usage |
|---|---|---|
| `primary` | `hsl(215, 70%, 45%)` | Primary buttons, active states, links, focus rings |
| `primary-foreground` | `hsl(0, 0%, 100%)` | Text on primary backgrounds |
| `primary-hover` | `hsl(215, 70%, 38%)` | Primary button hover |

### Semantic Palette

| Token | Value | Usage |
|---|---|---|
| `background` | `hsl(0, 0%, 99%)` | Page background |
| `card` | `hsl(0, 0%, 100%)` | Card surfaces |
| `muted` | `hsl(210, 20%, 96%)` | Subtle backgrounds, disabled states |
| `muted-foreground` | `hsl(215, 15%, 47%)` | Secondary text, placeholders |
| `border` | `hsl(214, 20%, 90%)` | Default borders |
| `foreground` | `hsl(222, 47%, 11%)` | Primary text |
| `destructive` | `hsl(0, 72%, 51%)` | Delete actions, error states |
| `success` | `hsl(142, 71%, 35%)` | Paid status, completed milestones |
| `warning` | `hsl(38, 92%, 50%)` | Needs Attention badges, approaching due dates |

### Pipeline Stage Colors

Each stage has a top-border color for its column header. These are subtle, muted tones -- not saturated.

| Stage | Border Color | Token |
|---|---|---|
| Lead | `hsl(210, 50%, 70%)` | `stage-lead` |
| Consultation | `hsl(175, 45%, 55%)` | `stage-consultation` |
| Proposal | `hsl(45, 65%, 58%)` | `stage-proposal` |
| Active Design | `hsl(260, 45%, 62%)` | `stage-active-design` |
| Installation | `hsl(25, 60%, 55%)` | `stage-installation` |
| Complete | `hsl(142, 45%, 48%)` | `stage-complete` |

Stage columns use a `3px solid` top border in their respective color. The column background is `background`. No colored fills on columns.

## Typography

| Element | Size | Weight | Font |
|---|---|---|---|
| Body text | 14px (`text-sm`) | 400 | System font stack (Tailwind default `font-sans`) |
| Page headings | 20px (`text-xl`) | 600 | |
| Section headings | 16px (`text-base`) | 600 | |
| Card titles | 14px (`text-sm`) | 600 | |
| Labels | 12px (`text-xs`) | 500 | `muted-foreground` color |
| Monospace (invoice numbers) | 13px | 400 | `font-mono` |

Base body text is 14px. This is a data-dense tool -- 16px would waste space on the pipeline view.

## Spacing

Tailwind's default spacing scale. Key conventions:

| Context | Value |
|---|---|
| Page padding | `p-6` (24px) |
| Card padding | `p-4` (16px) |
| Gap between cards in pipeline column | `gap-3` (12px) |
| Gap between pipeline columns | `gap-4` (16px) |
| Form field spacing | `space-y-4` (16px vertical) |
| Inline element gap (icon + text) | `gap-2` (8px) |

## Interaction Patterns

### Hover States

All interactive elements use **background tint + slight lift** on hover:

```
hover:bg-muted/50 hover:shadow-sm transition-all duration-150 ease-out
```

Cards in the pipeline use `hover:-translate-y-0.5` for the lift effect.

### Transitions

All transitions use `150ms ease-out`. Apply via `transition-all duration-150 ease-out` or component-specific transition properties.

### Focus Rings

**2px blue ring with 2px offset** for keyboard navigation:

```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
```

Apply to all interactive elements: buttons, inputs, links, cards, drag handles.

### Cursors

| Element | Cursor |
|---|---|
| Buttons, links | `cursor-pointer` |
| Draggable cards | `cursor-grab` (idle), `cursor-grabbing` (dragging) |
| Disabled elements | `cursor-not-allowed` |
| Text inputs | `cursor-text` (default) |

## Component Patterns

### Cards

Client cards in the pipeline and detail sections use shadcn/ui `Card` with these overrides:

- Border: `border border-border`
- Radius: `rounded-lg` (8px)
- Shadow: `shadow-sm` at rest, `shadow-md` on hover or while dragging
- Background: `bg-card`

### Buttons

Use shadcn/ui `Button` variants:

| Variant | Usage |
|---|---|
| `default` (primary fill) | Primary actions: "Save", "Create Client", "Generate PDF" |
| `outline` | Secondary actions: "Cancel", "Archive" |
| `ghost` | Tertiary/icon-only actions: sidebar nav items, card menu triggers |
| `destructive` | Permanent delete from archive view only |

Button sizes: `default` for forms, `sm` for inline/card actions, `icon` for icon-only buttons.

### Form Fields

Use shadcn/ui `Input`, `Textarea`, `Select` with React Hook Form.

**Error state** (three signals combined):
- Red border: `border-destructive`
- Red helper text below the field with the error message
- Subtle red background tint: `bg-destructive/5`

**Disabled state**: `opacity-50 cursor-not-allowed` (shadcn default).

### Dialogs

Use shadcn/ui `Dialog` for confirmations (archive, delete, stage change if needed). Use `Sheet` (slide-over panel) for forms that don't warrant a full page (quick-add client from pipeline).

### Badges

Use shadcn/ui `Badge` for status indicators:

| Context | Variant | Color |
|---|---|---|
| Invoice: Unpaid | `outline` | Default border |
| Invoice: Paid | `default` | `success` background |
| Milestone: Upcoming | `outline` | Default border |
| Milestone: Overdue | `destructive` | `destructive` background |
| Milestone: Completed | `default` | `success` background |
| Needs Attention flag | `default` | `warning` background |

## Loading States

### Skeleton Screens

Use for content loading (pipeline columns, client card sections, file lists). shadcn/ui provides a `Skeleton` component. Match the shape and size of the content being loaded.

Key skeleton patterns:
- Pipeline column: 3-4 card-shaped skeletons stacked vertically
- Client card header: rectangle for name, shorter rectangle for email
- File list: rows of icon + text skeletons

### Action Spinners

Use for button actions (save, upload, generate PDF). Replace the button label with a spinner inside the button. Keep the button the same width to prevent layout shift. Disable the button during loading.

Use Lucide's `Loader2` icon with `animate-spin`.

### Full-Page Loader

Used only during initial auth check (see `01_Auth.md`). Centered spinner with "FieldFlow" text below it on a `background` color page.

## Empty States

Every list/collection view needs an empty state. Pattern:

- Centered in the content area
- Lucide icon (muted, 48px)
- Short heading (e.g., "No clients yet")
- One-line description
- Primary action button (e.g., "Add Your First Client")

Key empty states:

| View | Icon | Heading | Action |
|---|---|---|---|
| Pipeline (no clients) | `Users` | No clients yet | Add Client |
| Notes tab (no notes) | `FileText` | No notes yet | Add Note |
| Files tab (no files) | `Upload` | No files yet | Upload Files |
| Invoices tab (no invoices) | `Receipt` | No invoices yet | Create Invoice |
| Milestones tab (no milestones) | `Calendar` | No milestones yet | Add Milestone |
| Archive (empty) | `Archive` | Archive is empty | (none) |

## Responsive Behavior

Desktop-first design. The pipeline board is a desktop experience (horizontal columns). On smaller screens, client cards and detail views adapt.

| Breakpoint | Behavior |
|---|---|
| `lg` (1024px+) | Full pipeline board with side-by-side columns |
| `md` (768-1023px) | Pipeline columns stack or become scrollable horizontally |
| `sm` (< 768px) | Client list view replaces pipeline. Client detail pages are full-width. Sidebar collapses to hamburger menu |

See `06_Layout_Navigation.md` for detailed layout behavior at each breakpoint.

## Gaps & Assumptions

| Gap | Default Applied |
|---|---|
| No dark mode | Light mode only at MVP. shadcn/ui supports dark mode via CSS variables, so adding it later is low effort |
| No animation library | Tailwind transitions only. No Framer Motion or spring animations. Drag-and-drop animation is handled by the DnD library |
| No toast/notification component specified | Use shadcn/ui `Sonner` (toast) for success/error feedback on actions (save, delete, upload). Auto-dismiss after 4 seconds |
| No explicit z-index scale | Follow shadcn/ui defaults. Dragging cards use `z-50`. Dialogs/sheets use shadcn defaults |
| No print styles | Not needed at MVP. Invoice PDFs are generated via jsPDF, not browser print |
| Exact color values are approximate | Tune during implementation. The relationships matter more than exact HSL values |  
