import { useState } from 'react';
import { toast } from 'sonner';
import { writeBatch, doc, serverTimestamp, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { addActivityEntry } from '@/lib/activityLog';
import { useAuth } from '@/contexts/AuthContext';
import { STAGES, STAGE_LABELS, type Stage } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface StageSelectorProps {
  clientId: string;
  clientName: string;
  currentStage: Stage;
}

export function StageSelector({ clientId, clientName, currentStage }: StageSelectorProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const handleChange = async (newStage: Stage) => {
    if (!user || newStage === currentStage || saving) return;

    setSaving(true);
    try {
      // Get the max stageOrder in the target stage
      const stageQuery = query(
        collection(db, 'users', user.uid, 'clients'),
        where('stage', '==', newStage),
        where('archived', '==', false),
        orderBy('stageOrder', 'desc')
      );

      let maxOrder = 0;
      try {
        const snap = await getDocs(stageQuery);
        if (!snap.empty) {
          maxOrder = snap.docs[0].data().stageOrder || 0;
        }
      } catch {
        // Index not yet deployed, default to 0
      }

      const batch = writeBatch(db);
      const clientRef = doc(db, 'users', user.uid, 'clients', clientId);
      batch.update(clientRef, {
        stage: newStage,
        stageOrder: maxOrder + 1,
        lastActivityAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      addActivityEntry(
        batch,
        user.uid,
        clientId,
        clientName,
        'stage_change',
        `Moved to ${STAGE_LABELS[newStage]}`
      );

      await batch.commit();
      toast.success(`Moved to ${STAGE_LABELS[newStage]}`);
    } catch {
      toast.error('Failed to update stage');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Select
      value={currentStage}
      onValueChange={(val) => handleChange(val as Stage)}
      disabled={saving}
    >
      <SelectTrigger className="w-44 h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STAGES.map((s) => (
          <SelectItem key={s} value={s} className="text-xs">
            {STAGE_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
