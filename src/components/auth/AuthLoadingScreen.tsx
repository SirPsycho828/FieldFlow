import { Kanban } from 'lucide-react';

export function AuthLoadingScreen() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 animate-pulse">
        <Kanban className="h-8 w-8 text-primary" />
        <span className="font-heading text-xl font-bold text-foreground tracking-tight">
          FieldFlow
        </span>
      </div>
    </div>
  );
}
