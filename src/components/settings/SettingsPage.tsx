import { BusinessProfileSection } from './BusinessProfileSection';
import { CalendarSection } from './CalendarSection';
import { PreferencesSection } from './PreferencesSection';

export function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <BusinessProfileSection />
      <CalendarSection />
      <PreferencesSection />
    </div>
  );
}
