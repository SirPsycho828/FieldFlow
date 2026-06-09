import { RotateCcw, Wand2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BusinessProfileSection } from './BusinessProfileSection';
import { CalendarSection } from './CalendarSection';
import { PreferencesSection } from './PreferencesSection';
import { PageIntro } from '@/components/ux/PageIntro';
import { GuidanceTip } from '@/components/ux/GuidanceTip';
import { useTour } from '@/components/ux/TourProvider';
import { useOnboarding } from '@/hooks/useOnboarding';

export function SettingsPage() {
  const { startTour } = useTour();
  const { resetWizard } = useOnboarding();
  const navigate = useNavigate();

  async function handleRestartWizard() {
    await resetWizard();
    navigate('/onboarding');
  }

  function handleReplayTour() {
    startTour();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-heading text-2xl font-bold tracking-tight">Settings</h1>
      <PageIntro>
        Configure your business profile, calendar sync, and notification preferences.
      </PageIntro>
      <GuidanceTip id="settings-impact">
        Your business profile (name, logo, contact info) appears on invoice PDFs. Connect Google Calendar to automatically sync client milestones.
      </GuidanceTip>
      <BusinessProfileSection />
      <CalendarSection />
      <PreferencesSection />

      {/* Onboarding section */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base font-bold">Onboarding</CardTitle>
          <p className="text-sm text-muted-foreground">
            Re-run the setup wizard or replay the app tour anytime
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" onClick={handleRestartWizard}>
            <Wand2 className="h-3.5 w-3.5 mr-1.5" /> Restart Setup Wizard
          </Button>
          <Button variant="outline" size="sm" onClick={handleReplayTour}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Replay App Tour
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
