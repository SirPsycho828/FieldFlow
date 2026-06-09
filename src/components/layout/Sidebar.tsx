import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Kanban, Archive, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserMenu } from './UserMenu';

const navItems = [
  { label: 'Pipeline', icon: Kanban, path: '/pipeline', tourId: 'nav-pipeline' },
  { label: 'Archive', icon: Archive, path: '/archive', tourId: 'nav-archive' },
  { label: 'Settings', icon: Settings, path: '/settings', tourId: 'nav-settings' },
];

interface SidebarNavItemsProps {
  onNavigate?: () => void;
}

export function SidebarNavItems({ onNavigate }: SidebarNavItemsProps) {
  const location = useLocation();

  // Pipeline is active on '/pipeline' and any '/clients/:clientId' route
  function isPipelineActive(path: string) {
    if (path !== '/pipeline') return false;
    return location.pathname === '/pipeline' || location.pathname.startsWith('/clients/');
  }

  return (
    <nav className="flex flex-col gap-1 px-2">
      {navItems.map(({ label, icon: Icon, path, tourId }) => (
        <NavLink
          key={path}
          to={path}
          end
          onClick={onNavigate}
          data-tour={tourId}
          className={({ isActive }) => {
            const active = path === '/pipeline' ? isPipelineActive(path) : isActive;
            return cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 ease-out w-full',
              'text-muted-foreground hover:bg-secondary hover:text-foreground',
              active && 'bg-primary/10 text-primary font-medium'
            );
          }}
        >
          {({ isActive }) => {
            const active = path === '/pipeline' ? isPipelineActive(path) : isActive;
            return (
              <>
                <Icon className={cn('w-5 h-5 shrink-0', active && 'text-primary')} />
                <span className="hidden lg:block">{label}</span>
                {active && <span className="sr-only">(current)</span>}
              </>
            );
          }}
        </NavLink>
      ))}
    </nav>
  );
}

export function Sidebar() {
  const navigate = useNavigate();

  return (
    <aside className="hidden md:flex flex-col w-16 lg:w-60 h-screen bg-card border-r border-border shrink-0 sticky top-0">
      {/* App header */}
      <div className="flex items-center h-16 px-3 lg:px-5 border-b border-border shrink-0">
        <button
          onClick={() => navigate('/pipeline')}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          aria-label="Go to pipeline"
        >
          <Kanban className="w-5 h-5 text-primary shrink-0" />
          <span className="hidden lg:block font-heading text-base font-bold text-foreground tracking-tight">
            FieldFlow
          </span>
        </button>
      </div>

      {/* Nav items */}
      <div className="flex-1 py-4 overflow-y-auto">
        <SidebarNavItems />
      </div>

      {/* User menu */}
      <div className="border-t border-border">
        <UserMenu />
      </div>
    </aside>
  );
}
