import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export interface OnboardingState {
  wizardCompleted: boolean;
  wizardStepsCompleted: string[];
  wizardSkippedSteps: string[];
  completedAt: unknown | null;
}

const DEFAULT_STATE: OnboardingState = {
  wizardCompleted: false,
  wizardStepsCompleted: [],
  wizardSkippedSteps: [],
  completedAt: null,
};

export function useOnboarding() {
  const { user } = useAuth();
  const [state, setState] = useState<OnboardingState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setState(DEFAULT_STATE);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      const ref = doc(db, 'users', user!.uid, 'metadata', 'onboarding');
      const snap = await getDoc(ref);

      if (cancelled) return;

      if (snap.exists()) {
        const data = snap.data() as OnboardingState;
        setState(data);
      } else {
        // Check if this is an existing user (has clients or business profile)
        // If so, auto-mark wizard as completed (backfill)
        const userRef = doc(db, 'users', user!.uid);
        const userSnap = await getDoc(userRef);

        if (cancelled) return;

        if (userSnap.exists()) {
          const userData = userSnap.data();
          const hasProfile = userData.businessProfile?.name;
          // Existing users with a business profile are backfilled
          if (hasProfile) {
            const backfillState: OnboardingState = {
              wizardCompleted: true,
              wizardStepsCompleted: ['welcome', 'business-profile', 'first-client', 'done'],
              wizardSkippedSteps: [],
              completedAt: serverTimestamp(),
            };
            await setDoc(ref, backfillState);
            setState({ ...backfillState, completedAt: new Date() });
          } else {
            setState(DEFAULT_STATE);
          }
        }
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [user]);

  async function completeStep(stepId: string) {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'metadata', 'onboarding');
    const updated = {
      ...state,
      wizardStepsCompleted: [...new Set([...state.wizardStepsCompleted, stepId])],
    };
    setState(updated);
    await setDoc(ref, updated, { merge: true });
  }

  async function skipStep(stepId: string) {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'metadata', 'onboarding');
    const updated = {
      ...state,
      wizardSkippedSteps: [...new Set([...state.wizardSkippedSteps, stepId])],
    };
    setState(updated);
    await setDoc(ref, updated, { merge: true });
  }

  async function completeWizard() {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'metadata', 'onboarding');
    const updated: OnboardingState = {
      ...state,
      wizardCompleted: true,
      completedAt: serverTimestamp(),
    };
    setState({ ...updated, completedAt: new Date() });
    await setDoc(ref, updated);
  }

  async function resetWizard() {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'metadata', 'onboarding');
    setState(DEFAULT_STATE);
    await setDoc(ref, DEFAULT_STATE);
  }

  return {
    ...state,
    loading,
    completeStep,
    skipStep,
    completeWizard,
    resetWizard,
  };
}
