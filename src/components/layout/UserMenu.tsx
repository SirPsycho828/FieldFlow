import { useNavigate } from 'react-router-dom';
import { Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface UserMenuProps {
  compact?: boolean;
}

export function UserMenu({ compact = false }: UserMenuProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const displayName = user?.displayName ?? user?.email ?? 'User';
  const email = user?.email ?? '';
  const initial = displayName.charAt(0).toUpperCase();

  const avatar = (
    <div
      className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center shrink-0 cursor-pointer select-none"
      aria-label={`User menu for ${displayName}`}
    >
      {initial}
    </div>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-3 w-full rounded-md px-3 py-2 hover:bg-muted/50 transition-all duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-ring',
            compact && 'justify-center px-0'
          )}
        >
          {avatar}
          {!compact && (
            <div className="hidden lg:flex flex-col items-start min-w-0">
              <span className="text-sm font-medium text-foreground truncate max-w-[140px]">
                {displayName}
              </span>
              <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                {email}
              </span>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-52">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground truncate">{email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/settings')}>
          <Settings className="w-4 h-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut()}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
