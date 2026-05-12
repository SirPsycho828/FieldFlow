import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import type { ClientDocument } from '@/types';

interface ClientCardProps {
  client: ClientDocument;
  isDragging?: boolean;
}

export function ClientCard({ client, isDragging }: ClientCardProps) {
  const navigate = useNavigate();

  const duration = client.lastActivityAt
    ? formatDistanceToNow(client.lastActivityAt.toDate(), { addSuffix: false })
    : '';

  return (
    <Card
      className={`p-3 cursor-pointer border border-border bg-card transition-all duration-150 ease-out
        ${isDragging ? 'shadow-md z-50 rotate-1' : 'hover:bg-muted/50 hover:shadow-sm hover:-translate-y-0.5'}
      `}
      onClick={() => !isDragging && navigate(`/clients/${client.id}`)}
      role="button"
      aria-label={`${client.name}, currently in ${client.stage} stage`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold truncate flex-1">{client.name}</h3>
      </div>
      {duration && (
        <p className="text-xs text-muted-foreground mt-1">{duration}</p>
      )}
      {client.budgetRange && (
        <p className="text-xs text-muted-foreground mt-0.5">{client.budgetRange}</p>
      )}
    </Card>
  );
}
