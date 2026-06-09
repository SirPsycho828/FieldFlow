import { useCallback } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
  const { user, userDoc, loading: authLoading } = useAuth();

  // Read onboarding state from the user document (real-time via AuthContext)
  const onboarding: OnboardingState = (userDoc as Record<string, unknown>)?.onboarding as OnboardingState ?? DEFAULT_STATE;

  // Backfill: existing users with a business profile name are treated as wizard-complete
  const wizardCompleted = onboarding.wizardCompleted || !!userDoc?.businessProfile?.name;

  const userRef = user ? doc(db, 'users', user.uid) : null;

  const completeStep = useCallback(async (stepId: string) => {
    if (!userRef) return;
    const updated = {
      ...onboarding,
      wizardStepsCompleted: [...new Set([...onboarding.wizardStepsCompleted, stepId])],
    };
    await updateDoc(userRef, { onboarding: updated });
  }, [userRef, onboarding]);

  const skipStep = useCallback(async (stepId: string) => {
    if (!userRef) return;
    const updated = {
      ...onboarding,
      wizardSkippedSteps: [...new Set([...onboarding.wizardSkippedSteps, stepId])],
    };
    await updateDoc(userRef, { onboarding: updated });
  }, [userRef, onboarding]);

  const completeWizard = useCallback(async () => {
    if (!userRef) return;
    const updated: OnboardingState = {
      ...onboarding,
      wizardCompleted: true,
      completedAt: serverTimestamp(),
    };
    await updateDoc(userRef, { onboarding: updated });
  }, [userRef, onboarding]);

  const resetWizard = useCallback(async () => {
    if (!userRef) return;
    await updateDoc(userRef, { onboarding: DEFAULT_STATE });
  }, [userRef]);

  return {
    ...onboarding,
    wizardCompleted,
    loading: authLoading,
    completeStep,
    skipStep,
    completeWizard,
    resetWizard,
  };
}
