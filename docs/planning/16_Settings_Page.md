▸ Extended thinking (242 chars)  
## Overview

The Settings page is where architects configure their business profile (used on invoice PDFs), connect or disconnect Google Calendar sync, and set their staleness threshold for the Needs Attention system. It is a single scrollable page with distinct sections, not a tabbed interface. Settings are stored on the user document in Firestore.

## Dependencies

- `02_Database_Schema.md` -- `users/{uid}` document: `businessProfile`, `settings` map
- `03_Security_Rules.md` -- User document update rules, `private/tokens` subcollection
- `05_UI_Design_System.md` -- Form patterns, card layout, toast notifications
- `06_Layout_Navigation.md` -- Route `/settings`, sidebar nav item
- `11_Financials_Invoices.md` -- Business profile data appears on generated invoice PDFs
- `13_Google_Calendar_Sync.md` -- Calendar connection flow, token state detection

## Route

`/settings` -- accessible from the sidebar navigation and the user dropdown menu.

## Page Layout

Three sections stacked vertically, each in a card container. No tabs.

```
┌──────────────────────────────────────────┐
│ Settings                                  │
│                                           │
│ ┌───────────────────────────────────────┐ │
│ │ Business Profile                      │ │
│ │ ...                                   │ │
│ └───────────────────────────────────────┘ │
│                                           │
│ ┌───────────────────────────────────────┐ │
│ │ Google Calendar                       │ │
│ │ ...                                   │ │
│ └───────────────────────────────────────┘ │
│                                           │
│ ┌───────────────────────────────────────┐ │
│ │ Preferences                           │ │
│ │ ...                                   │ │
│ └───────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

## Section 1: Business Profile

### Purpose

Business profile information appears on generated invoice PDFs (see `11_Financials_Invoices.md`). If the profile is incomplete, invoices generate without a business header and the architect sees a prompt to complete their profile.

### Form Fields

| Field | Type | Required | Stored As |
|---|---|---|---|
| Business Name | Text input | No | `businessProfile.name` |
| Address | Textarea (2 rows) | No | `businessProfile.address` |
| Email | Text input | No | `businessProfile.email` |
| Phone | Text input | No | `businessProfile.phone` |
| Logo | File upload | No | Firebase Storage, URL in `businessProfile.logoUrl` |

All fields are optional. The profile section works as a progressive form -- architects fill in what they have and add more later.

### Logo Upload

- Upload area: A square zone (`w-24 h-24`) showing the current logo or a placeholder (Lucide `ImagePlus` icon with "Upload logo" text)
- Click to open file picker, or drag-and-drop onto the zone
- Accepted types: JPEG, PNG, WebP
- Max size: 5 MB
- Storage path: `users/{uid}/business/logo/{filename}` (see `02_Database_Schema.md`)
- On upload: replace any existing logo file in Storage, update `businessProfile.logoUrl` with the new download URL
- Show a "Remove" link below the logo if one is set. Removing deletes the Storage file and sets `logoUrl` to null

### Save Behavior

The business profile uses an explicit save pattern, not auto-save. An edit/save toggle or a persistent "Save" button at the bottom of the section.

**On save**:
1. Update `users/{uid}` document with the `businessProfile` map
2. Set `updatedAt` on the user document
3. Show toast: "Business profile saved"

**Validation**: If email is provided, validate format. No other validation -- all fields are freeform.

### Empty State

On first visit, all fields are empty. Show a subtle info callout above the form:

- Lucide `Info` icon in `text-primary`
- "Your business details appear on invoice PDFs. Fill these in before generating invoices."
- `bg-primary/5 border border-primary/20 rounded-lg p-3`

Hide the callout once any field has been saved.

## Section 2: Google Calendar

### Purpose

Connect or disconnect Google Calendar sync for milestones. See `13_Google_Calendar_Sync.md` for the full sync architecture.

### State Detection

On Settings page load, determine the calendar connection state:

| State | Detection | UI |
|---|---|---|
| Never connected | `calendarSyncEnabled == false` and no token in `private/tokens` | Connect button |
| Connected and active | `calendarSyncEnabled == true` and token exists | Toggle (on) + Connected status |
| Manually disabled | `calendarSyncEnabled == false` and token exists | Toggle (off) |
| Token revoked | `calendarSyncEnabled == true` and no token | Warning + Reconnect button |

**Reading token existence**: The `private/tokens` subcollection has `allow read: if false` in security rules (see `03_Security_Rules.md`). The client cannot read it directly.

**Resolution**: Store a `hasGoogleToken: boolean` field on the user document (not the token itself). Set it to `true` when a token is written to `private/tokens`, set to `false` when the token is cleared. This field is readable by the client and avoids exposing the actual token.

### Never Connected UI

```
┌───────────────────────────────────────┐
│ Google Calendar                       │
│                                       │
│ Sync milestones to your Google        │
│ Calendar as all-day events.           │
│                                       │
│ [Connect Google Calendar]             │
│                                       │
│ Milestones created or updated after   │
│ enabling sync will appear on your     │
│ calendar.                             │
└───────────────────────────────────────┘
```

**Connect button**: Primary variant. Clicking initiates the Google OAuth flow:

- **Google sign-in users**: Already have a token. Enabling sync just sets `calendarSyncEnabled: true`. The button should read "Enable Calendar Sync" instead and skip the OAuth flow.
- **Email/password users**: Initiates `linkWithPopup` using `GoogleAuthProvider` with Calendar scopes (see `13_Google_Calendar_Sync.md`).

### Connected UI

```
┌───────────────────────────────────────┐
│ Google Calendar                       │
│                                       │
│ Connected to steve@gmail.com    [On]  │
│                                       │
│ Milestones are syncing to your        │
│ primary Google Calendar.              │
│                                       │
│ [Disconnect]                          │
└───────────────────────────────────────┘
```

- **Toggle switch**: shadcn/ui `Switch` component. On/off controls `calendarSyncEnabled`
- **Email display**: Show the linked Google account email. For Google sign-in users, this is their auth email. For linked accounts, extract from the linked provider data
- **Disconnect link**: `ghost` variant, `text-destructive`. See disconnect flow below

### Token Revoked UI

```
┌───────────────────────────────────────┐
│ Google Calendar                       │
│                                       │
│ ⚠ Calendar disconnected.             │
│ Google access was revoked. Reconnect  │
│ to resume syncing milestones.         │
│                                       │
│ [Reconnect Google Calendar]           │
└───────────────────────────────────────┘
```

Warning styled with `bg-warning/10 border-l-4 border-warning`. Reconnect button initiates the same OAuth flow as initial connection.

### Toggle Behavior

**Turning off**:
1. Confirmation: "Existing calendar events will remain. New milestone changes won't sync."
2. Set `settings.calendarSyncEnabled: false`
3. Show toast: "Calendar sync disabled"

**Turning on** (when token exists):
1. Set `settings.calendarSyncEnabled: true`
2. Show toast: "Calendar sync enabled"
3. No confirmation needed

### Disconnect Flow

"Disconnect" removes the Google Calendar connection entirely.

Confirmation dialog:
- **Title**: "Disconnect Google Calendar?"
- **Description**: "Calendar sync will be disabled. Existing events will remain on your calendar. You can reconnect anytime."
- **Actions**: "Cancel" (outline) and "Disconnect" (`destructive` variant)

**On confirm**:
1. Set `settings.calendarSyncEnabled: false`
2. Set `hasGoogleToken: false`
3. Delete the token document from `users/{uid}/private/tokens` (this write is allowed -- see `03_Security_Rules.md`)
4. For email/password users who linked Google: call `unlink('google.com')` to remove the Google provider link
5. Show toast: "Google Calendar disconnected"

## Section 3: Preferences

### Staleness Threshold

```
┌───────────────────────────────────────┐
│ Preferences                          │
│                                       │
│ Needs Attention threshold             │
│ Flag clients with no activity for     │
│ more than:                            │
│                                       │
│ [14] days                             │
│                                       │
│ Clients inactive longer than this     │
│ will appear in the Needs Attention    │
│ banner on your pipeline.              │
└───────────────────────────────────────┘
```

- **Input**: Number input, inline with "days" label
- **Validation**: Minimum 1, maximum 365, integers only
- **Default**: 14
- **Save**: Auto-save on blur or Enter key. Update `settings.stalenessThresholdDays` on the user document
- **Feedback**: Subtle inline confirmation "Saved" text that fades after 2 seconds, or toast

### No Other Preferences at MVP

The Preferences section contains only the staleness threshold. Future additions (notification preferences, default tax rate, etc.) would go here. Keep the section present even with one item to establish the UI pattern.

## Data Loading

On Settings page mount, read the user document at `users/{uid}` with a real-time listener. This provides `businessProfile`, `settings`, and `hasGoogleToken`. The listener keeps the UI in sync if settings are changed from another tab.

## Mobile Behavior

All three sections stack vertically at full width. No layout changes needed. Form fields are full-width on mobile. Logo upload zone remains the same size.

## Gaps & Assumptions

| Gap | Default Applied |
|---|---|
| No account management (change email, change password, delete account) | Handle via Firebase Console at MVP. Add self-service account management post-MVP |
| No default tax rate setting | Tax rate is per-invoice. A default rate in settings would reduce repetition but adds complexity. Post-MVP |
| No theme or appearance settings | Light mode only at MVP. No user-controlled theming |
| `hasGoogleToken` field adds denormalization | The boolean must stay in sync with the actual token in `private/tokens`. Cloud Functions that clear tokens must also update this field. Documented in `04_Cloud_Functions.md` |
| No data export | No "download my data" feature. Handle manually via Firebase Console if requested |
| Logo image is not resized on upload | The full-resolution image is stored and used. For invoice PDFs, jsPDF handles scaling. If large logos cause performance issues, apply client-side resizing before upload |
| No profile completeness indicator | No progress bar or checklist showing which business profile fields are filled. The info callout serves as the initial prompt |
| Disconnect for Google sign-in users | If the user signed in with Google (not email/password), disconnecting Calendar does not sign them out or remove Google as their auth provider. It only removes the Calendar token and disables sync |  
