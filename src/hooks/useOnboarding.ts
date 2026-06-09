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
  const rawOnboarding = (userDoc as Record<string, unknown>)?.onboarding as OnboardingState | undefined;
  const onboarding: OnboardingState = rawOnboarding ?? DEFAULT_STATE;

  // Backfill: existing users created before the wizard was added (no onboarding field)
  // are auto-completed so they skip the wizard. Also covers users with a business profile.
  const isPreWizardUser = userDoc != null && rawOnboarding === undefined;
  const wizardCompleted = onboarding.wizardCompleted || isPreWizardUser || !!userDoc?.businessProfile?.name;

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
