import { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export function PreferencesSection() {
  const { user, userDoc } = useAuth();
  const [value, setValue] = useState<string>('14');
  const [saved, setSaved] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Populate from userDoc
  useEffect(() => {
    if (userDoc?.settings?.stalenessThresholdDays != null) {
      setValue(String(userDoc.settings.stalenessThresholdDays));
    }
  }, [userDoc]);

  const persist = async (raw: string) => {
    if (!user) return;
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 365) return;

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        'settings.stalenessThresholdDays': parsed,
        updatedAt: serverTimestamp(),
      });
      setSaved(true);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaved(false), 2000);
    } catch {
      // silently fail — user can retry by blurring again
    }
  };

  const handleBlur = () => {
    persist(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only integers
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setValue(raw);
  };

  const isValid = (() => {
    const n = parseInt(value, 10);
    return !isNaN(n) && n >= 1 && n <= 365;
  })();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-base font-bold">Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="staleness-threshold" className="text-sm font-medium">
            Needs Attention threshold
          </Label>
          <p className="text-sm text-muted-foreground">
            Flag clients with no activity for more than:
          </p>
          <div className="flex items-center gap-2">
            <Input
              id="staleness-threshold"
              type="number"
              min={1}
              max={365}
              value={value}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className={`w-24 ${!isValid && value !== '' ? 'border-destructive' : ''}`}
            />
            <span className="text-sm text-muted-foreground">days</span>
            <span
              className={`text-xs text-muted-foreground transition-opacity duration-500 ${
                saved ? 'opacity-100' : 'opacity-0'
              }`}
            >
              Saved
            </span>
          </div>
          {!isValid && value !== '' && (
            <p className="text-xs text-destructive">Enter a value between 1 and 365</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
