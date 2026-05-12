## Overview

FieldFlow uses Firebase Authentication with two sign-in methods: email/password and Google sign-in. Google sign-in serves double duty -- it authenticates the user and establishes the OAuth connection needed for Google Calendar sync (see `13_Google_Calendar_Sync.md`). The app is single-tenant: each architect sees only their own data. There are no roles, no teams, no admin panel at MVP.

## Dependencies

- `02_Database_Schema.md` -- User document created on first sign-in
- `03_Security_Rules.md` -- All rules gate on `request.auth.uid`
- `05_UI_Design_System.md` -- Login page styling, form error states, loading states
- `13_Google_Calendar_Sync.md` -- Google OAuth scopes for Calendar access

## Auth Methods

### Email/Password

Standard Firebase email/password authentication. Use `createUserWithEmailAndPassword` for registration and `signInWithEmailAndPassword` for login.

**Registration fields**: Email, password, display name. No email verification required at MVP (user base is tiny and invite-only in practice).

**Password requirements**: Minimum 8 characters. Firebase enforces this natively. No additional complexity rules at MVP.

### Google Sign-In

Use `signInWithPopup` with `GoogleAuthProvider`. Configure the provider with Calendar scopes so the OAuth consent screen requests Calendar access upfront during sign-in, rather than requiring a separate authorization flow later.

**Required OAuth scopes**:
- `https://www.googleapis.com/auth/calendar.events` -- Create, update, and delete calendar events for milestone sync

**Scope request strategy**: Request the Calendar scope at sign-in time for Google users. This means Google sign-in users get Calendar sync capability immediately. Email/password users who want Calendar sync will connect Google separately from the Settings page (see `16_Settings_Page.md`).

**Token storage**: After Google sign-in, store the OAuth refresh token in the user's Firestore document (see `02_Database_Schema.md`). Cloud Functions use this token to create Calendar events on the user's behalf. The access token is short-lived and refreshed server-side as needed.

## Auth State Management

### Auth Observer

Set up `onAuthStateChanged` as the single source of truth for auth state. This listener fires on:
- Initial page load (determines if user is already signed in)
- Sign-in
- Sign-out
- Token refresh

### Auth Context

Wrap the app in a React context provider that exposes:

| Value | Type | Purpose |
|---|---|---|
| user | `User \| null` | Firebase Auth user object |
| userDoc | `UserDocument \| null` | Firestore user document (see `02_Database_Schema.md`) |
| loading | `boolean` | True during initial auth check |
| signOut | `() => Promise<void>` | Sign-out handler |

**Loading state**: On initial page load, `loading` is `true` until `onAuthStateChanged` fires its first callback. During this state, show a full-screen skeleton loader (see `05_UI_Design_System.md`). Do not flash the login page.

### Route Protection

All routes except `/login` require authentication. Use a route guard component that:
1. If `loading` is true, render the skeleton loader
2. If `user` is null, redirect to `/login`
3. If `user` exists, render the requested route

The login page has the inverse guard: if the user is already authenticated, redirect to `/` (pipeline view).

## User Document Creation

On first sign-in (either method), create a user document in Firestore if one does not already exist. This happens client-side immediately after successful authentication.

**Detection**: After `onAuthStateChanged` fires with a user, read `users/{uid}`. If the document does not exist, create it.

**Initial user document shape** (see `02_Database_Schema.md` for full schema):

| Field | Value |
|---|---|
| `uid` | Firebase Auth UID |
| `email` | From Auth user object |
| `displayName` | From Auth user object or registration form |
| `createdAt` | Server timestamp |
| `settings.stalenessThresholdDays` | `14` |
| `settings.calendarSyncEnabled` | `false` |
| `businessProfile` | Empty/null -- populated later in Settings |
| `googleRefreshToken` | From Google OAuth credential, or null for email/password users |

**Google refresh token capture**: When using Google sign-in, the `signInWithPopup` result includes `OAuthCredential`. Extract the refresh token from `result.credential` and write it to the user document. This token is needed by Cloud Functions for Calendar sync.

## Login Page

### Layout

Single centered card on a clean background. App logo and name ("FieldFlow") above the card.

The card contains two sections separated by an "or" divider:
1. **Google sign-in button** at the top (primary action, prominent styling)
2. **Email/password form** below the divider

### Email/Password Form States

**Login mode** (default):
- Email field
- Password field
- "Sign In" submit button
- "Don't have an account? Sign up" toggle link

**Registration mode**:
- Display name field
- Email field
- Password field
- "Create Account" submit button
- "Already have an account? Sign in" toggle link

Toggle between modes client-side. No separate routes.

### Error Handling

Display Firebase Auth error messages mapped to user-friendly text:

| Firebase Error Code | Display Message |
|---|---|
| `auth/email-already-in-use` | An account with this email already exists |
| `auth/invalid-email` | Please enter a valid email address |
| `auth/wrong-password` | Incorrect password |
| `auth/user-not-found` | No account found with this email |
| `auth/too-many-requests` | Too many attempts. Please wait and try again |
| `auth/popup-closed-by-user` | Sign-in was cancelled |
| `auth/network-request-failed` | Network error. Check your connection |

Use the error state pattern from `05_UI_Design_System.md`: red border + red helper text below the relevant field + subtle red background tint.

### Loading States

- **Form submission**: Disable the submit button and show a spinner inside it
- **Google popup**: Show a subtle overlay or disable the Google button while the popup is open

## Sign Out

Sign-out button lives in the sidebar user menu (see `06_Layout_Navigation.md`). Calls `signOut()` from Firebase Auth, which triggers `onAuthStateChanged` with `null`, which triggers redirect to `/login` via the route guard.

No confirmation dialog for sign-out. It's a low-risk, easily reversible action.

## Session Behavior

Firebase Auth handles session persistence automatically using `browserLocalPersistence` (the default). Sessions survive browser restarts and tab closes. The auth token auto-refreshes every hour.

**No custom session timeout at MVP**. Firebase's default behavior is sufficient for a small-user-base tool.

**Multiple tabs**: Firebase Auth state syncs across tabs automatically. Signing out in one tab signs out everywhere.

## Security Considerations

### Client-Side Only at MVP

All auth operations happen client-side. There are no custom auth endpoints or Cloud Functions for authentication. Firebase Auth handles all token validation, session management, and credential storage.

### Firestore Rules Dependency

Every Firestore read and write is gated on `request.auth.uid` matching the document's owner field. See `03_Security_Rules.md` for the full ruleset. The auth system's only job is ensuring `request.auth` is populated -- Firestore rules handle authorization.

### OAuth Token Security

The Google refresh token stored in the user's Firestore document is sensitive. Firestore security rules must ensure only the owning user and Cloud Functions (via admin SDK) can read it. The token is never sent to the client after initial storage -- only Cloud Functions access it server-side for Calendar operations.

### No Password Reset at MVP

Password reset ("Forgot password?") is deferred. The user base is tiny and the developer can reset passwords manually via Firebase Console if needed. Add `sendPasswordResetEmail` flow post-MVP.

## Gaps & Assumptions

| Gap | Default Applied |
|---|---|
| No email verification flow | Skipped for MVP. User base is small and trusted. Add post-MVP if spam accounts become a concern. |
| No password reset UI | Deferred. Handle manually via Firebase Console. Low risk with < 50 users. |
| No account deletion UI | Deferred. Handle via Firebase Console if requested. |
| No re-authentication for sensitive actions | Not needed at MVP. No destructive account-level actions exist. |
| Google OAuth consent screen configuration not detailed | Requires setting up OAuth consent screen in Google Cloud Console with Calendar scope. Must be in "testing" mode for < 100 users or submitted for verification for production. |
| Refresh token rotation | Google may rotate refresh tokens. Cloud Functions should handle `invalid_grant` errors by clearing the stored token and flagging the user to re-authorize. See `13_Google_Calendar_Sync.md`. |
| No multi-device sign-out ("sign out everywhere") | Not needed. Firebase sessions are per-device by default. |  
