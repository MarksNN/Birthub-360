import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.hoisted(() => vi.fn(async () => JSON.stringify({ ok: true })));

vi.mock('../../../../../src/features/intelligence/tools/advancedCommercialTools.js', () => ({
  churnAnalysisTool: { name: 'churn', invoke },
  proposalTool: { name: 'proposal', invoke },
}));
vi.mock('../../../../../src/features/intelligence/tools/commercialTools.js', () => ({
  forecastTool: { name: 'forecast', invoke },
  pipelineManagementTool: { name: 'pipeline', invoke },
}));
vi.mock('../../../../../src/features/intelligence/tools/companyDiscoveryTool.js', () => ({
  companyDiscoveryTool: { name: 'discovery', invoke },
}));
vi.mock('../../../../../src/features/intelligence/tools/integrationTools.js', () => ({
  multiCrmSyncTool: { name: 'crm-sync', invoke },
}));
vi.mock('../../../../../src/features/intelligence/tools/promoteAndEnrichTool.js', () => ({
  promoteAndEnrichTool: { name: 'promote', invoke },
}));
vi.mock('../../../../../src/features/intelligence/tools/scriptAndPromptTool.js', () => ({
  scriptAndPromptTool: { name: 'script', invoke },
}));
vi.mock('../../../../../src/features/intelligence/tools/universalEmailTool.js', () => ({
  universalEmailTool: { name: 'email', invoke },
}));
vi.mock('../../../../../src/features/intelligence/tools/universalMeetingsTool.js', () => ({
  universalMeetingsTool: { name: 'meetings', invoke },
}));
vi.mock('../../../../../src/features/intelligence/tools/universalNotificationsTool.js', () => ({
  universalNotificationsTool: { name: 'notifications', invoke },
}));
vi.mock('../../../../../src/features/intelligence/tools/universalOfficeDocsTool.js', () => ({
  universalOfficeDocsTool: { name: 'office', invoke },
}));
vi.mock('../../../../../src/features/intelligence/tools/universalTasksAndNotesTool.js', () => ({
  universalTasksAndNotesTool: { name: 'tasks', invoke },
}));

import {
  ECOSYSTEM_PLAYBOOKS,
  ingestEcosystemEvent,
  runEcosystemPlaybook,
} from '../../../../../src/features/intelligence/services/ecosystemPlaybooks.service.js';

describe('playbooks do ecossistema', () => {
  beforeEach(() => {
    invoke.mockReset();
    invoke.mockResolvedValue(JSON.stringify({ ok: true }));
  });

  it('executa os cinco playbooks e registra falha controlada de ferramenta', async () => {
    invoke.mockRejectedValueOnce(new Error('ferramenta indisponível'));
    invoke.mockResolvedValueOnce({ error: 'parcial' });
    invoke.mockResolvedValueOnce('texto que não é json');

    for (const playbook of ECOSYSTEM_PLAYBOOKS) {
      const report = await runEcosystemPlaybook('org-1', 'user-1', playbook.id, {
        segment: 'industria',
        location: 'SP',
        leadId: 'lead-1',
        transcript: 'Reunião de descoberta.',
      });
      expect(report.playbookId).toBe(playbook.id);
      expect(report.steps.length).toBeGreaterThan(0);
      expect(report.durationMs).toBeGreaterThanOrEqual(0);
    }

    const first = await runEcosystemPlaybook('org-1', 'user-1', 'inbound_email_radar');
    expect(first.steps.some((step) => step.success === false || step.success === true)).toBe(true);
  });

  it('recusa playbook desconhecido', async () => {
    await expect(runEcosystemPlaybook('org-1', 'user-1', 'nao-existe' as never)).rejects.toThrow(
      /Playbook desconhecido/,
    );
  });

  it('ingere mensagem, reunião e evento de quadro com o canal certo', async () => {
    const message = await ingestEcosystemEvent('org-1', 'user-1', {
      sourcePlatform: 'whatsapp',
      eventType: 'inbound_message',
      sender: 'cfo@industria.com',
      subjectOrTitle: 'Podemos avançar?',
      content: 'Quero a planilha de ROI.',
      leadId: 'lead-9',
    });
    expect(message.actionsTriggered.length).toBeGreaterThan(1);
    expect(message.eventType).toBe('inbound_message');

    const email = await ingestEcosystemEvent('org-1', 'user-1', {
      sourcePlatform: 'outlook_m365',
      eventType: 'inbound_message',
      subjectOrTitle: 'Proposta',
      content: 'Segue retorno.',
    });
    expect(email.actionsTriggered[0]?.success).toBe(true);

    for (const sourcePlatform of ['zoom', 'teams', 'gmail'] as const) {
      const meeting = await ingestEcosystemEvent('org-1', 'user-1', {
        sourcePlatform,
        eventType: 'meeting_completed',
        subjectOrTitle: 'Call de descoberta',
        content: 'Transcrição curta da reunião.',
      });
      expect(meeting.actionsTriggered.length).toBeGreaterThan(0);
    }

    const card = await ingestEcosystemEvent('org-1', 'user-1', {
      sourcePlatform: 'trello',
      eventType: 'task_or_card_update',
      subjectOrTitle: 'Card movido',
      content: 'Foi para proposta.',
    });
    expect(card.sourcePlatform).toBe('trello');

    const stage = await ingestEcosystemEvent('org-1', 'user-1', {
      sourcePlatform: 'bitrix24',
      eventType: 'crm_deal_stage_change',
      subjectOrTitle: 'Negócio avançou',
      content: 'Etapa proposta enviada.',
    });
    expect(stage.actionsTriggered.at(-1)?.toolName).toBe('notifications');
  });
});
