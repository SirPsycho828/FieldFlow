import { cn } from '@/lib/utils';

interface PageIntroProps {
  children: React.ReactNode;
  className?: string;
}

export function PageIntro({ children, className }: PageIntroProps) {
  return (
    <p className={cn('max-w-2xl text-sm text-muted-foreground -mt-4 mb-4', className)}>
      {children}
    </p>
  );
}
