import { useCallback, useState } from 'react';
import type { Lead } from './types.js';

interface UseLeadCardStateProps {
  lead: Lead;
  onUpdateStatus?: (leadId: string, newStatus: string) => Promise<void>;
  onPromoteToDeal?: (lead: Lead) => Promise<void>;
}

export function useLeadCardState({ lead, onUpdateStatus, onPromoteToDeal }: UseLeadCardStateProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'playbook' | 'history' | 'enrichment'>('playbook');
  const [isCalling, setIsCalling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const toggleExpand = useCallback(() => setIsExpanded((prev) => !prev), []);

  const handleStatusChange = useCallback(
    async (newStatus: string) => {
      if (!onUpdateStatus) return;
      try {
        setIsSaving(true);
        await onUpdateStatus(lead.id, newStatus);
      } finally {
        setIsSaving(false);
      }
    },
    [lead.id, onUpdateStatus],
  );

  const handlePromote = useCallback(async () => {
    if (!onPromoteToDeal) return;
    try {
      setIsSaving(true);
      await onPromoteToDeal(lead);
    } finally {
      setIsSaving(false);
    }
  }, [lead, onPromoteToDeal]);

  const handleStartCall = useCallback(
    (phone: string) => {
      setIsCalling(true);
      window.dispatchEvent(
        new CustomEvent('voicehub:dial', { detail: { phone, leadId: lead.id } }),
      );
    },
    [lead.id],
  );

  return {
    isExpanded,
    toggleExpand,
    activeTab,
    setActiveTab,
    isCalling,
    isSaving,
    handleStatusChange,
    handlePromote,
    handleStartCall,
  };
}
