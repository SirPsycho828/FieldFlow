import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { OnboardingGuard } from '@/components/auth/OnboardingGuard';
import { LoginPage } from '@/components/auth/LoginPage';
import { LandingRoute } from '@/pages/LandingRoute';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { AppShell } from '@/components/layout/AppShell';
import { PipelinePage } from '@/pages/PipelinePage';
import { ClientDetailPage } from '@/pages/ClientDetailPage';
import { ArchivePage } from '@/pages/ArchivePage';
import { SettingsPage } from '@/pages/SettingsPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingRoute />} />
          <Route path="/login" element={<LoginPage />} />
          {/* Onboarding wizard — auth-protected but outside AppShell */}
          <Route
            path="/onboarding"
            element={
              <AuthGuard>
                <OnboardingPage />
              </AuthGuard>
            }
          />
          {/* Main app — auth-protected + onboarding-gated */}
          <Route
            element={
              <AuthGuard>
                <OnboardingGuard>
                  <AppShell />
                </OnboardingGuard>
              </AuthGuard>
            }
          >
            <Route path="/pipeline" element={<PipelinePage />} />
            <Route path="/clients/:clientId" element={<ClientDetailPage />} />
            <Route path="/archive" element={<ArchivePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="bottom-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
