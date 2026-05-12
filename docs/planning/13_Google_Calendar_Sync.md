## Overview

Google Calendar sync pushes milestone events from FieldFlow to the architect's Google Calendar. Each milestone becomes its own all-day calendar event (e.g., "Site Visit - Johnson"). Sync is optional, off by default, and enabled per-user from the Settings page. The sync is one-way: FieldFlow writes to Google Calendar, but changes made directly in Google Calendar are not pulled back. All sync operations happen server-side via Cloud Functions.

## Dependencies

- `01_Auth.md` -- Google OAuth scopes, refresh token capture on Google sign-in
- `02_Database_Schema.md` -- `milestones/{milestoneId}` shape, `calendarEventId` field, user `settings.calendarSyncEnabled`
- `04_Cloud_Functions.md` -- `onMilestoneWrite` function implementation, error handling, retry behavior
- `12_Milestones_Scheduling.md` -- Milestone create/edit/delete triggers that cause sync
- `16_Settings_Page.md` -- Calendar connection toggle and OAuth flow for email/password users

## Sync Architecture

```
Architect creates/edits/deletes milestone
        │
        ▼
Firestore write to milestones/{milestoneId}
        │
        ▼
onMilestoneWrite Cloud Function fires
        │
        ├── Is calendarSyncEnabled? ──No──► Exit
        │
        ├── Has valid refresh token? ──No──► Disable sync, exit
        │
        ▼
Google Calendar API call
        │
        ▼
Write calendarEventId back to milestone doc
```

**Key principle**: The frontend never calls the Google Calendar API directly. All Calendar operations go through Cloud Functions using the stored refresh token. This keeps the API key and token refresh logic server-side.

## Enabling Calendar Sync

### For Google Sign-In Users

Users who signed in with Google already have a refresh token stored (captured during sign-in with Calendar scopes -- see `01_Auth.md`). Enabling sync in Settings simply sets `settings.calendarSyncEnabled: true`. No additional OAuth flow needed.

### For Email/Password Users

Users who signed in with email/password do not have a Google OAuth token. To enable Calendar sync, they must link their Google account.

**Flow**:
1. User navigates to Settings and clicks "Connect Google Calendar"
2. Frontend initiates `linkWithPopup` using `GoogleAuthProvider` with the Calendar scope
3. On success, extract the refresh token from the credential result
4. Write the refresh token to `users/{uid}/private/tokens` (see `03_Security_Rules.md`)
5. Set `settings.calendarSyncEnabled: true`
6. Show toast: "Google Calendar connected"

**If linking fails** (popup closed, account conflict): Show error toast with the Firebase Auth error mapped to user-friendly text. Do not enable sync.

**Account conflict**: If the Google account is already linked to a different FieldFlow account, Firebase throws `auth/credential-already-in-use`. Display: "This Google account is linked to another FieldFlow account."

### Disabling Calendar Sync

Toggle `settings.calendarSyncEnabled` to `false` in Settings. Existing calendar events are **not** deleted when sync is disabled. They remain on the calendar as historical records. New milestone changes will simply not propagate.

Show a confirmation when disabling: "Existing calendar events will remain. New milestone changes won't sync."

## Sync Operations

### Create Event

Triggered when a new milestone document is created and sync is enabled.

**Calendar API call**: `calendar.events.insert` on the user's primary calendar.

**Event payload**:

| Field | Value |
|---|---|
| `summary` | `"{milestone.title} - {client.name}"` |
| `start.date` | Milestone date formatted as `YYYY-MM-DD` |
| `end.date` | Same date (single all-day event) |
| `description` | `"FieldFlow - {client.name}"` |
| `reminders.useDefault` | `true` |
| `source.title` | `"FieldFlow"` |

**After insert**: Write the returned `event.id` to `milestone.calendarEventId` via Admin SDK.

### Update Event

Triggered when a milestone document is updated (title or date changed) and `calendarEventId` exists.

**Calendar API call**: `calendar.events.update` using the stored `calendarEventId`.

**Updated fields**: Rebuild `summary` (in case title or client name changed) and `start.date`/`end.date` (in case date changed). Send the full event payload, not a partial patch.

**If the event no longer exists** (404 from Calendar API): The user deleted it manually from Google Calendar. Create a new event instead and update `calendarEventId` with the new ID.

### Delete Event

Triggered when a milestone document is deleted and `calendarEventId` exists.

**Calendar API call**: `calendar.events.delete` using the stored `calendarEventId`.

**If the event no longer exists** (404): Silently succeed. The desired end state (no event) is already achieved.

## Token Refresh and Expiry

The stored refresh token grants offline access to the user's Google Calendar. Access tokens derived from it expire after 1 hour. The Cloud Function refreshes the access token on every invocation using the `googleapis` library's built-in token refresh.

### Token Revocation

Google may revoke refresh tokens if:
- The user removes FieldFlow from their Google account's connected apps
- The user changes their Google password
- The token has been unused for 6 months
- Google's security systems flag the token

### Handling Revoked Tokens

When the Cloud Function receives an `invalid_grant` error:

1. Clear the refresh token from `users/{uid}/private/tokens`
2. Set `settings.calendarSyncEnabled` to `false`
3. Log the event for debugging
4. Exit cleanly (do not retry)

The next time the user opens Settings, they will see Calendar sync is disabled. The UI shows a message: "Google Calendar disconnected. Reconnect to resume syncing." with a "Reconnect" button that re-initiates the OAuth flow.

### Detecting Disconnected State

On the Settings page, determine connection status by checking:
1. Is `settings.calendarSyncEnabled` true?
2. Does a token exist in `users/{uid}/private/tokens`?

| `calendarSyncEnabled` | Token exists | State | UI |
|---|---|---|---|
| `false` | No | Never connected | "Connect Google Calendar" button |
| `false` | Yes | Manually disabled | Toggle switch (off) |
| `true` | Yes | Active | Toggle switch (on), "Connected" label |
| `true` | No | Token revoked | Warning: "Disconnected. Reconnect to resume." |

## Existing Milestones

When a user enables Calendar sync, **existing milestones are not retroactively synced**. Only milestones created or edited after sync is enabled will appear on the calendar.

If an architect wants an existing milestone on their calendar, they edit and save it (even without changing any values). The Firestore update triggers `onMilestoneWrite`, which sees no `calendarEventId` and creates a new event.

This is documented in the Settings page UI: "Milestones created or updated after enabling sync will appear on your calendar."

## Rate Limits

Google Calendar API has a per-user rate limit of approximately 500 requests per 100 seconds. For a solo architect managing 5-15 clients with a few milestones each, this is not a practical concern.

The Cloud Function handles 429 (rate limit) errors by failing and relying on Cloud Functions' built-in retry mechanism (up to 3 attempts -- see `04_Cloud_Functions.md`).

## Sync Status Indicator

No per-milestone sync status indicator at MVP. The architect does not see whether a specific milestone has synced to Calendar. They trust that it worked, and can verify by checking Google Calendar.

**Rationale**: Adding sync status (pending, synced, failed) per milestone introduces UI complexity and requires the frontend to poll or listen for `calendarEventId` changes. At MVP scale with reliable Cloud Functions, the silent sync model is sufficient.

If a sync fails permanently (after 3 retries), the milestone exists in FieldFlow but not on the calendar. The architect can trigger a re-sync by editing the milestone.

## Gaps & Assumptions

| Gap | Default Applied |
|---|---|
| One-way sync only | FieldFlow writes to Google Calendar. Changes made in Google Calendar (rescheduling, deleting) are not reflected in FieldFlow. Two-way sync is significantly more complex and deferred indefinitely |
| No calendar selection | Events sync to the user's primary calendar only. No option to choose a specific calendar. Add calendar picker post-MVP if architects want a dedicated "FieldFlow" calendar |
| No batch sync for existing milestones | Architects must edit each milestone individually to trigger sync. A "Sync All" button could be added post-MVP |
| No sync for completed milestones | Completing a milestone does not delete or modify the Calendar event. The event remains as a historical marker |
| No event color or category in Calendar | Events are plain, no color coding by stage or milestone type. Google Calendar API supports event colors but it adds complexity |
| No link back to FieldFlow from Calendar event | The `description` field mentions FieldFlow and the client name but does not include a clickable URL to the client detail page. Add post-MVP when the app has a stable public URL |
| `linkWithPopup` may not work in all browsers | Some browsers block popups. If popup is blocked, show instructions: "Allow popups for this site and try again." `linkWithRedirect` is a fallback but adds redirect-flow complexity |
| No webhook for token revocation | FieldFlow discovers revoked tokens only when a sync attempt fails. There is no proactive notification. The Settings page checks token state on load |  
