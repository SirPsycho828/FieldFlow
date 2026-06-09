import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileTopBar } from './MobileTopBar';
import { TourProvider } from '@/components/ux/TourProvider';

export function AppShell() {
  return (
    <TourProvider>
      <div className="flex h-screen">
        {/* Sidebar - hidden on mobile, icon rail on md, full on lg */}
        <Sidebar />

        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Mobile top bar - shown only on mobile */}
          <MobileTopBar />

          {/* Content area */}
          <main className="flex-1 overflow-y-auto p-6 max-sm:p-4">
            <Outlet />
          </main>
        </div>
      </div>
    </TourProvider>
  );
}
