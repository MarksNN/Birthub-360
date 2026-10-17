/**
 * Contrato de composição entre `src/features/roleplay/` e `src/features/playbook/`.
 * Porta hexagonal para fornecer critérios de qualificação e matriz de objeções
 * para a simulação e avaliação pedagógica do Roleplay de Vendas sem acoplar
 * internals de `playbook` diretamente em `roleplay` (proibido por .dependency-cruiser.cjs,
 * regra no-cross-feature-imports).
 *
 * A implementação real (`PlaybookRoleplayAdapter`, dona: feature `playbook`) é
 * registrada no container de DI em `src/shared/di/setup.ts` — a raiz de composição
 * com permissão arquitetural de conectar ambos os domínios.
 */
export interface RoleplayPlaybookPort {
  findQualificationCriteria(organizationId: string): Promise<string[]>;
  findObjections(organizationId: string): Promise<string[]>;
}
