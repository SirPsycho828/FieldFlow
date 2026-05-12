import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { AttentionClient } from '@/hooks/useNeedsAttention';

interface NeedsAttentionBannerProps {
  attentionClients: AttentionClient[];
}

export function NeedsAttentionBanner({
  attentionClients,
}: NeedsAttentionBannerProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (dismissed || attentionClients.length === 0) return null;

  const INITIAL_SHOW = 3;
  const visibleClients = expanded
    ? attentionClients
    : attentionClients.slice(0, INITIAL_SHOW);
  const hiddenCount = attentionClients.length - INITIAL_SHOW;

  return (
    <div
      className="rounded-lg border-l-4 p-4 mb-6"
      style={{
        backgroundColor: 'hsl(38, 92%, 50%, 0.08)',
        borderLeftColor: 'hsl(38, 92%, 50%)',
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle
            className="h-4 w-4 shrink-0"
            style={{ color: 'hsl(38, 92%, 50%)' }}
          />
          <span className="text-sm font-semibold">
            {attentionClients.length}{' '}
            {attentionClients.length === 1 ? 'client' : 'clients'} need
            {attentionClients.length === 1 ? 's' : ''} attention
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Client rows */}
      <div className="space-y-1.5">
        {visibleClients.map(({ client, reasons }) => (
          <div key={client.id} className="flex items-start gap-1.5 text-sm">
            <button
              type="button"
              className="font-medium hover:underline shrink-0 text-foreground"
              onClick={() => navigate(`/clients/${client.id}`)}
            >
              {client.name}
            </button>
            <span className="text-muted-foreground">
              &mdash; {reasons.join(' · ')}
            </span>
          </div>
        ))}
      </div>

      {/* Expand / collapse */}
      {hiddenCount > 0 && !expanded && (
        <Button
          variant="link"
          size="sm"
          className="mt-2 h-auto p-0 text-xs"
          onClick={() => setExpanded(true)}
        >
          Show {hiddenCount} more
        </Button>
      )}
      {expanded && attentionClients.length > INITIAL_SHOW && (
        <Button
          variant="link"
          size="sm"
          className="mt-2 h-auto p-0 text-xs"
          onClick={() => setExpanded(false)}
        >
          Show less
        </Button>
      )}
    </div>
  );
}
