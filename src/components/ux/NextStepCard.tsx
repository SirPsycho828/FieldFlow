import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NextStepCardProps {
  title: string;
  description: string;
  to: string;
  actionLabel?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function NextStepCard({ title, description, to, actionLabel, icon, className }: NextStepCardProps) {
  return (
    <div className={cn(
      'flex items-center gap-4 rounded-lg border-l-4 border-l-primary bg-card p-4 shadow-sm',
      className
    )}>
      {icon && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-heading text-sm font-bold">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Button asChild size="sm" className="shrink-0">
        <Link to={to}>
          {actionLabel ?? title}
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}
