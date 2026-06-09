import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BusinessProfileSection } from './BusinessProfileSection';
import { CalendarSection } from './CalendarSection';
import { PreferencesSection } from './PreferencesSection';
import { PageIntro } from '@/components/ux/PageIntro';
import { GuidanceTip } from '@/components/ux/GuidanceTip';
import { useTour } from '@/components/ux/TourProvider';

export function SettingsPage() {
  const { startTour } = useTour();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Settings</h1>
        <Button variant="outline" size="sm" onClick={startTour}>
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Replay Tour
        </Button>
      </div>
      <PageIntro>
        Configure your business profile, calendar sync, and notification preferences.
      </PageIntro>
      <GuidanceTip id="settings-impact">
        Your business profile (name, logo, contact info) appears on invoice PDFs. Connect Google Calendar to automatically sync client milestones.
      </GuidanceTip>
      <BusinessProfileSection />
      <CalendarSection />
      <PreferencesSection />
    </div>
  );
}
