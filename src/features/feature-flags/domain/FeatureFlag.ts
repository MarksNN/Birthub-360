/**
 * Catálogo de feature flags conhecidas pela plataforma — definido em código (revisado em PR),
 * não criável livremente via API. `FeatureFlagsUseCases.syncRegistry()` garante, no boot do
 * servidor, que toda chave aqui existe como linha em `FeatureFlag` (upsert idempotente); o valor
 * default global fica ali. O que É alterável em runtime, sem deploy, é o override por
 * organização (`OrganizationFeatureFlag`, via PUT/DELETE /api/feature-flags/:key, só ADMIN).
 *
 * Isto é deliberadamente mais restrito que "qualquer ADMIN pode criar/editar o default global de
 * qualquer flag": um ADMIN de uma organização não deve conseguir mudar o comportamento de TODAS
 * as outras organizações só alterando o catálogo global — só o próprio tenant.
 */
export interface FeatureFlagDefinition {
  key: string;
  description: string;
  enabledByDefault: boolean;
}

export const FEATURE_FLAG_REGISTRY: readonly FeatureFlagDefinition[] = [
  {
    key: 'bug_report_module',
    description: 'Exibe o botão flutuante "Reportar problema" no frontend, para todas as marcas.',
    enabledByDefault: true,
  },
  {
    key: 'BEHAVIORAL_ENGINE_ENABLED',
    description:
      'Ativa o motor de gamificação adaptativa e missões baseadas em gargalos comerciais (Eixo 4).',
    enabledByDefault: true,
  },
  {
    key: 'ADAPTIVE_CADENCE_ENABLED',
    description:
      'Ativa a otimização inteligente de cadências e resgate de leads estagnados do Self-Driving CRM (Eixo 7).',
    enabledByDefault: true,
  },
  {
    key: 'ROI_SIMULATOR_ENABLED',
    description:
      'Ativa a simulação econômica determinística em 3 cenários e geração de Business Cases (Eixo 17).',
    enabledByDefault: true,
  },
  {
    key: 'VALUE_REALIZATION_ENABLED',
    description:
      'Ativa o acompanhamento contínuo pós-venda de promessas e valor entregue ao cliente (Eixo 17).',
    enabledByDefault: true,
  },
  {
    key: 'REVENUE_ORACLE_ENABLED',
    description:
      'Ativa o Cockpit Executivo de projeção de receita, backtesting e simulação What-If (Eixo 20).',
    enabledByDefault: true,
  },
  {
    key: 'TERRITORY_RECOMMENDATIONS_ENABLED',
    description:
      'Ativa as recomendações supervisionadas de redistribuição equilibrada de contas e leads (Eixo 20).',
    enabledByDefault: true,
  },
];

export interface ResolvedFeatureFlag {
  key: string;
  description: string;
  enabled: boolean;
  /** true quando o valor efetivo vem de um override da organização, não do default global. */
  isOverridden: boolean;
  /** Id do ADMIN que fez a última alteração do override — só presente quando `isOverridden` é
   *  true (o default global do catálogo não tem "quem alterou"). Sem FK (ver
   *  OrganizationFeatureFlag no schema): pode apontar para um usuário já removido. */
  updatedByUserId?: string | null;
  /** Quando o override foi alterado pela última vez — mesma condição de `updatedByUserId`. */
  updatedAt?: Date | null;
}

export interface FeatureFlagRecord {
  id: string;
  key: string;
  description: string;
  enabled: boolean;
}

export interface OrganizationOverride {
  enabled: boolean;
  updatedByUserId?: string | null;
  updatedAt?: Date;
}

export interface FeatureFlagRepository {
  upsertCatalogEntry(flag: FeatureFlagDefinition): Promise<void>;
  findByKey(key: string): Promise<FeatureFlagRecord | null>;
  findByKeyWithOrganizationOverride(
    key: string,
    organizationId: string,
  ): Promise<(FeatureFlagRecord & { organizationOverride: OrganizationOverride | null }) | null>;
  findAllWithOrganizationOverride(
    organizationId: string,
  ): Promise<Array<FeatureFlagRecord & { organizationOverride: OrganizationOverride | null }>>;
  upsertOrganizationOverride(
    organizationId: string,
    featureFlagId: string,
    enabled: boolean,
    updatedByUserId: string,
  ): Promise<void>;
  deleteOrganizationOverride(organizationId: string, featureFlagId: string): Promise<void>;
}
