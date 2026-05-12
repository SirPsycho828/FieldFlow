import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { STAGES, STAGE_LABELS, type Stage, type ClientDocument } from '@/types';

interface MobilePipelineListProps {
  clientsByStage: Record<Stage, ClientDocument[]>;
}

export function MobilePipelineList({ clientsByStage }: MobilePipelineListProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {STAGES.map((stage) => {
        const clients = clientsByStage[stage];
        return (
          <div key={stage}>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-sm font-semibold">{STAGE_LABELS[stage]}</h2>
              <Badge variant="secondary" className="text-xs">{clients.length}</Badge>
            </div>
            {clients.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No clients</p>
            ) : (
              <div className="space-y-2">
                {clients.map((client) => (
                  <Card
                    key={client.id}
                    className="p-3 cursor-pointer hover:bg-muted/50 transition-all duration-150"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    <h3 className="text-sm font-semibold">{client.name}</h3>
                    {client.budgetRange && (
                      <p className="text-xs text-muted-foreground mt-0.5">{client.budgetRange}</p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
