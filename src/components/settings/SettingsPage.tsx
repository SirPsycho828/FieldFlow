import { BusinessProfileSection } from './BusinessProfileSection';
import { CalendarSection } from './CalendarSection';
import { PreferencesSection } from './PreferencesSection';
import { PageIntro } from '@/components/ux/PageIntro';
import { GuidanceTip } from '@/components/ux/GuidanceTip';

export function SettingsPage() {
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
    </div>
  );
}
