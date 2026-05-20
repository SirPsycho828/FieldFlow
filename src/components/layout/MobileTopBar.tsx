import { useState } from 'react';
import { Menu, Kanban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { SidebarNavItems } from './Sidebar';
import { UserMenu } from './UserMenu';

export function MobileTopBar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <header className="md:hidden flex items-center h-14 bg-card border-b border-border px-4 shrink-0">
        {/* Hamburger */}
        <button
          onClick={() => setOpen(true)}
          className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-secondary transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>

        {/* Centered app name */}
        <button
          onClick={() => navigate('/pipeline')}
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 hover:opacity-80 transition-opacity"
        >
          <Kanban className="w-4 h-4 text-primary" />
          <span className="font-heading text-base font-bold text-foreground tracking-tight">
            FieldFlow
          </span>
        </button>

        {/* User avatar (right) */}
        <div className="ml-auto">
          <UserMenu compact />
        </div>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0 flex flex-col">
          <SheetHeader className="px-5 py-4 border-b border-border shrink-0">
            <SheetTitle className="text-left flex items-center gap-2">
              <Kanban className="w-4 h-4 text-primary" />
              <span className="font-heading text-base font-bold tracking-tight">FieldFlow</span>
            </SheetTitle>
          </SheetHeader>

          <nav className="flex-1 py-3 overflow-y-auto">
            <SidebarNavItems onNavigate={() => setOpen(false)} />
          </nav>

          <div className="border-t border-border">
            <UserMenu />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
