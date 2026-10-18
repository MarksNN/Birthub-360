# ONDA 01 — ESTRATÉGIA DE CONTINGÊNCIA E PLANO DE ROLLBACK
**Projeto:** Birthub 360  
**Onda:** 01 — Fundação da Inteligência Autônoma  
**Data:** 2026-10-17  
**Responsáveis:** Agente 00 (Coordenador), Agente 08A (Operações Git e Deploy AWS), Agente 10 (Infraestrutura, Observabilidade e SRE)

---

## 1. Princípios de Segurança e Reversibilidade

As alterações introduzidas na **Onda 01** foram projetadas para serem **retrocompatíveis** e **desacopladas**:
1. **Sem Modificações Destrutivas de Schema**: Nenhuma migração destrutiva ou remoção de tabelas/colunas foi executada no banco PostgreSQL.
2. **Feature Flags e Chaves de Desativação**: Os novos serviços possuem fallbacks fail-safe automáticos quando redis ou banco estão indisponíveis.
3. **Isolamento de Branches**: Todo o trabalho reside na branch `integracao/onda-01`, sem tocar a branch `main` até aprovação e autorização explícita do usuário.

---

## 2. Níveis de Rollback e Procedimentos

### Nível 1: Desativação em Tempo de Execução (Zero Downtime)
Caso seja identificado comportamento anômalo em produção (ex: degradação no Redis ou latência elevada no Model Cascade):
- **Desativar Cache Semântico**: Setar variável de ambiente `FINOPS_SEMANTIC_CACHE_ENABLED=false`. O sistema continuará chamando os provedores diretamente sem erros.
- **Limpar Cache Corrompido**: Executar o script de expurgo por tenant ou flush da chave `semcache:*` via redis-cli:
  ```bash
  redis-cli --scan --pattern "semcache:*" | xargs redis-cli del
  ```
- **Fallback de Objeções no Roleplay**: O `PlaybookRoleplayAdapter` já possui fallback nativo: se o flywheel não retornar objeções curadas, utiliza as regras estáticas de `DEFAULT_OBJECTION_MATRIX`.

### Nível 2: Reversão de Código na Branch de Integração
Se for necessário reverter um commit específico na branch `integracao/onda-01`:
1. Identificar o commit causador via `git log -n 5 --oneline`.
2. Executar reversão limpa:
   ```bash
   git revert <commit-hash> -m 1 --no-edit
   ```
3. Rodar a suíte de testes de integração:
   ```bash
   npm run typecheck
   npm run test:architecture
   npx vitest run tests/integration/onda-01/intelligenceCoreFlow.integration.test.ts
   ```

### Nível 3: Reversão Completa da Onda (Disaster Recovery)
Caso seja determinada a desistência completa da Onda 01 antes do merge em `main`:
1. Retornar o working tree para `main`:
   ```bash
   git checkout main
   git pull origin main
   ```
2. A branch `integracao/onda-01` pode ser arquivada ou descartada sem qualquer impacto nos serviços existentes.

---

## 3. Matriz de Contatos e SLA de Rollback

- **Tempo Máximo de Decisão de Rollback (MTTD)**: 5 minutos após alarme crítico de SRE/Observabilidade.
- **Tempo Máximo de Execução de Reversão (MTTR)**: Menos de 3 minutos via desativação de flag ou redis flush.
- **Risco de Perda de Dados de Negócio**: **ZERO**, pois todos os dados operacionais (leads, contatos, tarefas) continuam persistidos nas tabelas relacionais primárias com integridade RLS.
