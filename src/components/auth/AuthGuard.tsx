import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthLoadingScreen } from './AuthLoadingScreen';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <AuthLoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
