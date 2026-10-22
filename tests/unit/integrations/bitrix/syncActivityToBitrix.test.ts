import { describe, expect, it } from 'vitest';
import {
  BitrixActivitySyncService,
  type SyncActivityInput,
} from '../../../../src/features/integrations/bitrix/syncActivityToBitrix.js';

describe('BitrixActivitySyncService (Passo 054)', () => {
  const service = new BitrixActivitySyncService();
  const now = new Date();

  it('deve sincronizar com sucesso quando a versão local for a mais recente', async () => {
    const input: SyncActivityInput = {
      activityId: 'act-101',
      organizationId: 'org-bitrix-alpha',
      bitrixEntityId: 555,
      activityType: 'CALL',
      subject: 'Follow-up de proposta',
      description: 'Ligação realizada',
      localUpdatedAt: new Date(now.getTime() + 1000), // Mais recente
      remoteUpdatedAt: now,
    };

    const res = await service.syncActivity(input);
    expect(res.synced).toBe(true);
    expect(res.conflictDetected).toBe(false);
    expect(res.bitrixActivityId).toBeDefined();
  });

  it('deve detectar conflito e NÃO sobrescrever dados se a versão remota do Bitrix for mais recente', async () => {
    const input: SyncActivityInput = {
      activityId: 'act-102',
      organizationId: 'org-bitrix-alpha',
      bitrixEntityId: 555,
      activityType: 'MEETING',
      subject: 'Reunião de Demonstração',
      description: 'Alteração local desatualizada',
      localUpdatedAt: now,
      remoteUpdatedAt: new Date(now.getTime() + 10000), // Remoto mais recente
    };

    const res = await service.syncActivity(input);
    expect(res.synced).toBe(false);
    expect(res.conflictDetected).toBe(true);
    expect(res.reason).toContain('Versão remota no Bitrix é mais recente');
  });
});
