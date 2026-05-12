import { Loader2 } from 'lucide-react';

export function AuthLoadingScreen() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-lg font-semibold text-foreground">FieldFlow</span>
      </div>
    </div>
  );
}
