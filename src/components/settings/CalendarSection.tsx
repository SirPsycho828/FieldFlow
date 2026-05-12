import { useState } from 'react';
import { toast } from 'sonner';
import {
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  linkWithPopup,
  unlink,
  GoogleAuthProvider,
} from 'firebase/auth';
import { CalendarDays, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');

type CalendarState = 'never_connected' | 'connected' | 'manually_disabled' | 'token_revoked';

function getCalendarState(
  calendarSyncEnabled: boolean,
  hasGoogleToken: boolean
): CalendarState {
  if (!calendarSyncEnabled && !hasGoogleToken) return 'never_connected';
  if (calendarSyncEnabled && hasGoogleToken) return 'connected';
  if (!calendarSyncEnabled && hasGoogleToken) return 'manually_disabled';
  // calendarSyncEnabled && !hasGoogleToken
  return 'token_revoked';
}

function isGoogleSignInUser(): boolean {
  const currentUser = auth.currentUser;
  if (!currentUser) return false;
  return currentUser.providerData.some((p) => p.providerId === 'google.com');
}

export function CalendarSection() {
  const { user, userDoc } = useAuth();

  const [connecting, setConnecting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [toggleOffDialogOpen, setToggleOffDialogOpen] = useState(false);

  if (!userDoc) return null;

  const calendarState = getCalendarState(
    userDoc.settings?.calendarSyncEnabled ?? false,
    userDoc.hasGoogleToken ?? false
  );

  const userRef = doc(db, 'users', user!.uid);

  // Connect Google Calendar (for email/password users: link account)
  const handleConnect = async () => {
    if (!user) return;
    setConnecting(true);
    try {
      if (isGoogleSignInUser()) {
        // Already a Google user — just enable sync
        await updateDoc(userRef, {
          'settings.calendarSyncEnabled': true,
          hasGoogleToken: true,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Link Google account via popup
        const result = await linkWithPopup(user, googleProvider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken ?? null;

        // Store token in private subcollection
        if (token) {
          await updateDoc(doc(db, 'users', user.uid, 'private', 'tokens'), {
            googleAccessToken: token,
          }).catch(() => {
            // Doc might not exist yet, that's okay
          });
        }

        await updateDoc(userRef, {
          hasGoogleToken: true,
          'settings.calendarSyncEnabled': true,
          updatedAt: serverTimestamp(),
        });
      }
      toast.success('Google Calendar connected');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // User cancelled — no error toast
      } else if (code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use') {
        toast.error('This Google account is already linked to another user');
      } else {
        toast.error('Failed to connect Google Calendar');
      }
    } finally {
      setConnecting(false);
    }
  };

  // Toggle calendar sync on
  const handleToggleOn = async () => {
    if (!user) return;
    setToggling(true);
    try {
      await updateDoc(userRef, {
        'settings.calendarSyncEnabled': true,
        updatedAt: serverTimestamp(),
      });
      toast.success('Calendar sync enabled');
    } catch {
      toast.error('Failed to enable calendar sync');
    } finally {
      setToggling(false);
    }
  };

  // Toggle calendar sync off (shows confirmation)
  const handleToggleOff = async () => {
    if (!user) return;
    setToggling(true);
    setToggleOffDialogOpen(false);
    try {
      await updateDoc(userRef, {
        'settings.calendarSyncEnabled': false,
        updatedAt: serverTimestamp(),
      });
    } catch {
      toast.error('Failed to disable calendar sync');
    } finally {
      setToggling(false);
    }
  };

  // Disconnect: revoke token, unlink provider if needed
  const handleDisconnect = async () => {
    if (!user) return;
    setDisconnecting(true);
    try {
      // Delete private tokens doc
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'private', 'tokens'));
      } catch {
        // Ignore if doesn't exist
      }

      // Unlink Google provider if this is an email/password user with linked Google
      if (!isGoogleSignInUser()) {
        try {
          await unlink(user, 'google.com');
        } catch {
          // Already unlinked or provider not found
        }
      }

      await updateDoc(userRef, {
        hasGoogleToken: false,
        'settings.calendarSyncEnabled': false,
        updatedAt: serverTimestamp(),
      });

      toast.success('Google Calendar disconnected');
      setDisconnectDialogOpen(false);
    } catch {
      toast.error('Failed to disconnect calendar');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          Google Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* never_connected */}
        {calendarState === 'never_connected' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect Google Calendar to automatically add milestones to your calendar.
            </p>
            <Button onClick={handleConnect} disabled={connecting} size="sm" className="gap-2">
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
              Connect Google Calendar
            </Button>
          </div>
        )}

        {/* connected */}
        {calendarState === 'connected' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="calendar-toggle" className="text-sm font-medium">
                  Calendar sync
                </Label>
                <p className="text-xs text-muted-foreground">
                  {userDoc.email}
                </p>
              </div>
              <Switch
                id="calendar-toggle"
                checked={true}
                disabled={toggling}
                onCheckedChange={(checked) => {
                  if (!checked) setToggleOffDialogOpen(true);
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Milestones created or updated after enabling sync will appear on your calendar.
            </p>
            <button
              type="button"
              onClick={() => setDisconnectDialogOpen(true)}
              className="text-xs text-muted-foreground hover:text-destructive underline underline-offset-2"
            >
              Disconnect
            </button>
          </div>
        )}

        {/* manually_disabled */}
        {calendarState === 'manually_disabled' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="calendar-toggle" className="text-sm font-medium">
                  Calendar sync
                </Label>
                <p className="text-xs text-muted-foreground">
                  {userDoc.email}
                </p>
              </div>
              <Switch
                id="calendar-toggle"
                checked={false}
                disabled={toggling}
                onCheckedChange={(checked) => {
                  if (checked) handleToggleOn();
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Milestones created or updated after enabling sync will appear on your calendar.
            </p>
            <button
              type="button"
              onClick={() => setDisconnectDialogOpen(true)}
              className="text-xs text-muted-foreground hover:text-destructive underline underline-offset-2"
            >
              Disconnect
            </button>
          </div>
        )}

        {/* token_revoked */}
        {calendarState === 'token_revoked' && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-300">
                Calendar access was revoked. Reconnect to resume syncing milestones.
              </p>
            </div>
            <Button onClick={handleConnect} disabled={connecting} size="sm" variant="outline" className="gap-2">
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
              Reconnect Google Calendar
            </Button>
          </div>
        )}
      </CardContent>

      {/* Toggle off confirmation */}
      <Dialog open={toggleOffDialogOpen} onOpenChange={setToggleOffDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable calendar sync?</DialogTitle>
            <DialogDescription>
              Existing calendar events will remain. New milestones will not be synced until you re-enable.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToggleOffDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleToggleOff} disabled={toggling}>
              {toggling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Disable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect confirmation */}
      <Dialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Google Calendar?</DialogTitle>
            <DialogDescription>
              Calendar sync will be disabled and your Google account will be unlinked. Existing calendar events will remain.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectDialogOpen(false)} disabled={disconnecting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDisconnect} disabled={disconnecting}>
              {disconnecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
