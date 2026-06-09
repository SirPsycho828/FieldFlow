import { cn } from '@/lib/utils';

interface StatusItem {
  label: string;
  value: string | number;
  detail?: string;
}

interface StatusSummaryProps {
  items: StatusItem[];
  className?: string;
}

export function StatusSummary({ items, className }: StatusSummaryProps) {
  return (
    <div className={cn(
      'grid grid-cols-2 gap-4 rounded-lg border bg-card p-4 sm:flex sm:items-center sm:divide-x sm:divide-border',
      className
    )}>
      {items.map((item) => (
        <div key={item.label} className="flex flex-col sm:px-5 first:sm:pl-0 last:sm:pr-0">
          <span className="font-heading text-xl font-bold tracking-tight">{item.value}</span>
          <span className="text-xs text-muted-foreground">{item.label}</span>
          {item.detail && (
            <span className="text-xs text-muted-foreground mt-0.5">{item.detail}</span>
          )}
        </div>
      ))}
    </div>
  );
}
