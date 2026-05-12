## Overview

The Invoices tab on the client detail page lets architects create simple invoices, track payment status with a paid/unpaid toggle, and generate downloadable PDF invoices. This is a tracking tool, not a payment processor -- no Stripe, no online payments, no automatic reminders at MVP. Architects create an invoice, send the PDF to their client via email manually, and toggle the status when paid.

## Dependencies

- `02_Database_Schema.md` -- `invoices/{invoiceId}` subcollection shape, line item structure, amount storage in cents
- `05_UI_Design_System.md` -- Badge variants (paid/unpaid), form patterns, empty states, toast notifications
- `08_Client_Card_Profile.md` -- Tab structure, summary strip invoice total
- `16_Settings_Page.md` -- Business profile data used in PDF generation

## Data Loading

Attach a Firestore real-time listener on `users/{uid}/clients/{clientId}/invoices` ordered by `date` descending when the Invoices tab becomes active. Detach on tab switch or page unmount.

## Invoice List View

### Layout

```
┌──────────────────────────────────────────────────┐
│ Invoices                          [+ New Invoice] │
│                                                   │
│ ┌───────────────────────────────────────────────┐ │
│ │ INV-2026-003   May 5, 2026      $3,250.00    │ │
│ │ Backyard redesign - Phase 2     [Unpaid]  ⋮   │ │
│ ├───────────────────────────────────────────────┤ │
│ │ INV-2026-002   Apr 12, 2026     $5,000.00    │ │
│ │ Backyard redesign - Phase 1     [Paid]    ⋮   │ │
│ ├───────────────────────────────────────────────┤ │
│ │ INV-2026-001   Mar 20, 2026     $4,250.00    │ │
│ │ Initial consultation + design   [Paid]    ⋮   │ │
│ └───────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

### Invoice Row

Each invoice displays as a row in a list (not a card grid). Two-line layout per row:

| Line | Left | Right |
|---|---|---|
| Top | Invoice number in `font-mono text-sm` | Total in `text-sm font-semibold`, formatted as currency |
| Bottom | First line item description (truncated) in `text-xs text-muted-foreground` | Status badge + actions menu |

**Status badge**: Uses shadcn/ui `Badge`:
- Unpaid: `outline` variant, default border color
- Paid: `default` variant with `success` background

**Actions menu**: Three-dot button (Lucide `MoreVertical`) with dropdown:

| Action | Behavior |
|---|---|
| Toggle paid/unpaid | Switches status immediately |
| Edit | Opens the invoice form pre-filled |
| Generate PDF | Generates and downloads the PDF |
| Delete | Confirmation dialog, then permanent delete |

### Empty State

Lucide `Receipt` icon, "No invoices yet" heading, "Create your first invoice for this client" description, "New Invoice" button.

## Invoice Form

Opened by the "New Invoice" button or the "Edit" action. Renders as a `Dialog` (shadcn/ui) with enough space for line items.

### Form Fields

**Header section**:

| Field | Type | Required | Default |
|---|---|---|---|
| Invoice Number | Text input, `font-mono` | Yes | Auto-generated: `INV-{YYYY}-{NNN}` |
| Invoice Date | Date picker | Yes | Today |
| Due Date | Date picker | No | Empty |
| Payment Terms | Text input | No | Empty, placeholder: "e.g., Net 30" |

**Line items section**:

| Column | Type | Width |
|---|---|---|
| Description | Text input | ~70% |
| Amount | Number input, currency formatted | ~25% |
| Remove | Icon button (Lucide `X`) | ~5% |

- "Add Line Item" text button below the list (Lucide `Plus` icon)
- Minimum 1 line item required
- Start with 1 empty row for new invoices

**Tax section**:

| Field | Type | Default |
|---|---|---|
| Tax Rate (%) | Number input | Empty (no tax) |

**Calculated totals** (displayed, not editable):

| Label | Calculation |
|---|---|
| Subtotal | Sum of all line item amounts |
| Tax | Subtotal x tax rate / 100 (hidden if no tax rate) |
| Total | Subtotal + tax |

Display totals formatted as currency, right-aligned below the line items. Update in real-time as the architect types.

### Amount Handling

All amounts are displayed in dollars but stored in cents in Firestore (see `02_Database_Schema.md`). Convert on save: multiply displayed value by 100 and round to integer. Convert on load: divide stored value by 100 for display.

Use `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })` for display formatting.

### Form Validation (Zod)

| Rule | Error Message |
|---|---|
| Invoice number required | Invoice number is required |
| Invoice date required | Invoice date is required |
| At least 1 line item | Add at least one line item |
| Each line item needs a description | Description is required |
| Each line item amount > 0 | Amount must be greater than zero |
| Tax rate 0-100 if provided | Tax rate must be between 0 and 100 |

### On Save (New Invoice)

Batch write:
1. Create the invoice document in `clients/{clientId}/invoices` with `status: "unpaid"`
2. Update `client.lastActivityAt`
3. Write activity log entry: type `invoice_created`, description "Created invoice {invoiceNumber}"
4. Close the dialog
5. Show success toast: "Invoice created"

### On Save (Edit)

1. Update the invoice document
2. No activity log entry for edits (reduces noise)
3. No `lastActivityAt` update for edits
4. Close the dialog
5. Show success toast: "Invoice updated"

## Status Toggle

The most frequent invoice action. Accessible from:
- The actions menu on each invoice row
- A prominent toggle button on the invoice edit view

**Toggle to paid**:
1. Update invoice: `status: "paid"`, `paidAt: serverTimestamp()`
2. Update `client.lastActivityAt`
3. Write activity log entry: type `invoice_paid`, description "Marked invoice {invoiceNumber} as paid"
4. Show toast: "Invoice marked as paid"

**Toggle to unpaid**:
1. Update invoice: `status: "unpaid"`, `paidAt: null`
2. No activity log entry for un-marking (it is a correction, not a business event)
3. Show toast: "Invoice marked as unpaid"

## PDF Generation

### Trigger

"Generate PDF" action in the invoice row menu. Reads the invoice data fresh from Firestore at generation time (not from in-memory state) to ensure accuracy. See `00_README.md` for this design decision.

### PDF Content

Generated client-side using jsPDF. The PDF layout:

```
┌─────────────────────────────────┐
│ [Logo]  Business Name           │
│         Business Address        │
│         Email | Phone           │
│                                 │
│         INVOICE                 │
│                                 │
│ Invoice #: INV-2026-003        │
│ Date: May 5, 2026              │
│ Due Date: June 4, 2026         │
│ Payment Terms: Net 30           │
│                                 │
│ Bill To:                        │
│ Client Name                     │
│ Client Address                  │
│                                 │
│ ─────────────────────────────── │
│ Description              Amount │
│ ─────────────────────────────── │
│ Phase 2 - Planting     $2,000  │
│ Materials              $1,250  │
│ ─────────────────────────────── │
│ Subtotal               $3,250  │
│ Tax (8.5%)               $276  │
│ Total                  $3,526  │
│ ─────────────────────────────── │
│                                 │
│ Status: UNPAID                  │
└─────────────────────────────────┘
```

### Data Sources

| Section | Source |
|---|---|
| Business info + logo | User's `businessProfile` from `users/{uid}` document. If not configured, omit the header section and show a toast warning: "Add your business info in Settings for professional invoices" |
| Invoice fields | Invoice document from Firestore (fresh read) |
| Client info | Client document `name`, `email`, `address` |

### PDF Output

- **Filename**: `{invoiceNumber}_{clientName}.pdf` with spaces replaced by underscores
- **Behavior**: Trigger browser download immediately. No save to Firebase Storage (see `00_README.md`)
- **Page size**: US Letter (8.5 x 11 in)

### Missing Business Profile

If the user has not configured their business profile in Settings, the PDF is still generated but without the business header block. Show a persistent toast with a link: "Add your business info in Settings for professional invoices."

## Invoice Deletion

"Delete" action in the invoice row menu. Shows confirmation dialog: "Delete invoice {invoiceNumber}? This cannot be undone."

**On confirm**:
1. Delete the invoice document
2. No activity log entry for deletion
3. No `lastActivityAt` update
4. Show toast: "Invoice deleted"

## Gaps & Assumptions

| Gap | Default Applied |
|---|---|
| No currency selection | USD only. Stored in cents as integers. Add currency field post-MVP if needed for international architects |
| No invoice emailing from the app | Architect downloads the PDF and sends manually. Email integration is post-MVP (see `17_Future_Features.md`) |
| No payment reminders | No automated follow-up on unpaid invoices. Post-MVP feature |
| No recurring invoices | Each invoice is manually created. Recurring/template invoices are post-MVP |
| No partial payments | Status is binary: paid or unpaid. No deposit tracking or partial payment amounts at MVP |
| No invoice numbering uniqueness enforcement | Auto-generated numbers are sequential per client, but the architect can type any value. Duplicates are possible but unlikely with the auto-generation default |
| jsPDF layout may need tuning | The PDF layout described above is a target. jsPDF's coordinate-based API requires manual positioning. Expect iteration on spacing and alignment during implementation |
| No tax presets | Tax rate is entered per invoice. No saved default tax rate. If architects want a consistent rate, they re-enter it each time. Add a default tax rate to Settings post-MVP |  
