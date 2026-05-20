import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen';
import { LandingPage } from './LandingPage';

export function LandingRoute() {
  const { user, loading } = useAuth();

  if (loading) return <AuthLoadingScreen />;
  if (user) return <Navigate to="/pipeline" replace />;

  return <LandingPage />;
}
