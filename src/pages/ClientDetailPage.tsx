import { useParams } from 'react-router-dom';

export function ClientDetailPage() {
  const { clientId } = useParams();
  return (
    <div>
      <h1 className="text-xl font-semibold">Client: {clientId}</h1>
    </div>
  );
}
