import type React from 'react';
import { LeadCardDecisorProfile } from './lead-card/LeadCardDecisorProfile.js';
import { LeadCardEnrichmentBadge } from './lead-card/LeadCardEnrichmentBadge.js';
import { LeadCardHeader } from './lead-card/LeadCardHeader.js';
import { LeadCardHistoryPreview } from './lead-card/LeadCardHistoryPreview.js';
import { LeadCardPlaybookAdvisor } from './lead-card/LeadCardPlaybookAdvisor.js';
import { LeadCardQuickActions } from './lead-card/LeadCardQuickActions.js';
import type { Lead, LeadStatus } from './lead-card/types.js';
import { useLeadCardState } from './lead-card/useLeadCardState.js';

export interface LeadCardProps {
  lead: any;
  index?: number;
  pitch?: any;
  aiConfig?: any;
  onUpdateMessage?: (messageId: string, content: string, status: string) => void;
  user?: any;
  onUpdateStage?: (id: any, stage: any) => Promise<void> | void;
  onUpdateTags?: (id: any, tags: any) => Promise<void> | void;
  onUpdateStatus?: (leadId: string, newStatus: string) => Promise<void> | void;
  onPromoteToDeal?: (lead: any) => Promise<void>;
  theme?: string;
  isReadOnly?: boolean;
  onLeadSaved?: (updatedLead: any) => void;
  isUserView?: boolean;
  startCollapsed?: boolean;
  className?: string;
  [key: string]: any;
}

export function LeadCard({
  lead,
  onUpdateStatus,
  onUpdateStage,
  onPromoteToDeal,
  className = '',
}: LeadCardProps): React.ReactElement {
  const effectiveUpdateStatus = onUpdateStatus
    ? async (id: string, st: string) => {
        await onUpdateStatus(id, st);
      }
    : onUpdateStage
      ? async (id: string, st: string) => {
          await onUpdateStage(id, st);
        }
      : undefined;

  const {
    isExpanded,
    toggleExpand,
    activeTab,
    setActiveTab,
    isSaving,
    handleStatusChange,
    handlePromote,
    handleStartCall,
  } = useLeadCardState({
    lead,
    onUpdateStatus: effectiveUpdateStatus,
    onPromoteToDeal,
  });

  return (
    <article
      className={`rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/90 p-5 shadow-sm hover:shadow-md transition-all ${className}`}
      aria-label={`Lead: ${lead.companyName} — Decisor: ${lead.contactName || 'Não identificado'}`}
    >
      <LeadCardHeader
        companyName={lead.companyName}
        sector={lead.sector}
        icpScore={lead.icpScore}
        status={lead.status}
        onStatusChange={(newStatus: LeadStatus) => handleStatusChange(newStatus)}
        isSaving={isSaving}
      />

      <LeadCardDecisorProfile
        name={lead.contactName}
        title={lead.contactTitle}
        email={lead.contactEmail}
        phone={lead.contactPhone}
        linkedinUrl={lead.contactLinkedin}
      />

      <LeadCardQuickActions
        phone={lead.contactPhone}
        email={lead.contactEmail}
        whatsappUrl={lead.whatsappUrl}
        onCall={handleStartCall}
        onPromote={handlePromote}
        isSaving={isSaving}
      />

      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
        <LeadCardEnrichmentBadge
          source={lead.enrichmentSource}
          confidence={lead.enrichmentConfidence}
        />
        <button
          type="button"
          onClick={toggleExpand}
          className="text-xs font-semibold text-brand hover:underline cursor-pointer"
          aria-expanded={isExpanded}
        >
          {isExpanded ? 'Ocultar Inteligência ▲' : 'Ver Recomendações de IA ▼'}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10 space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('playbook')}
              className={`px-3 py-1 text-xs rounded-md font-medium cursor-pointer ${
                activeTab === 'playbook' ? 'bg-brand text-midnight font-bold' : 'text-slate-500'
              }`}
            >
              Playbook IA
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1 text-xs rounded-md font-medium cursor-pointer ${
                activeTab === 'history' ? 'bg-brand text-midnight font-bold' : 'text-slate-500'
              }`}
            >
              Histórico de Toques
            </button>
          </div>

          {activeTab === 'playbook' && <LeadCardPlaybookAdvisor lead={lead} />}
          {activeTab === 'history' && <LeadCardHistoryPreview leadId={lead.id} />}
        </div>
      )}
    </article>
  );
}

export default LeadCard;
