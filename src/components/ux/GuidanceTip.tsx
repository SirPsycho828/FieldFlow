import { useState } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuidanceTipProps {
  id: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function GuidanceTip({ id, children, icon, className }: GuidanceTipProps) {
  const storageKey = `ux-tip-${id}`;
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem(storageKey) === 'true'
  );

  if (dismissed) return null;

  function handleDismiss() {
    localStorage.setItem(storageKey, 'true');
    setDismissed(true);
  }

  return (
    <div className={cn(
      'flex items-start gap-3 rounded-lg border border-primary/15 bg-primary/5 p-3 text-sm',
      className
    )}>
      <span className="mt-0.5 shrink-0 text-primary">
        {icon ?? <Lightbulb className="h-4 w-4" />}
      </span>
      <p className="flex-1 text-muted-foreground leading-relaxed">{children}</p>
      <button
        onClick={handleDismiss}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss tip"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
