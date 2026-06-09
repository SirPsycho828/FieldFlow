import { Navigate } from 'react-router-dom';
import { useOnboarding } from '@/hooks/useOnboarding';
import { AuthLoadingScreen } from './AuthLoadingScreen';

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { wizardCompleted, loading } = useOnboarding();

  if (loading) return <AuthLoadingScreen />;
  if (!wizardCompleted) return <Navigate to="/onboarding" replace />;

  return <>{children}</>;
}
