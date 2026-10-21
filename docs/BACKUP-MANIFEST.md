# MANIFESTO DE BACKUP COMPLETO — BIRTH HUB 360°

- **Data de Geração do Backup:** 21 de outubro de 2026, 19:02 (Horário de Brasília)
- **Data de Auditoria e Validação Forense:** 21 de outubro de 2026, 19:02 (Horário de Brasília)
- **Origem:** `C:\Github\Birthub-360`
- **Destino do Backup:** `G:\Meu Drive\Birthub 360`
- **Commit HEAD em main no bundle e no GitHub:** `34717c176` (`fix(sec): redigir logs de smtp e verificacao de email em auth.ts conforme debt-wave-01`)
- **Checksum SHA-256 do Bundle Atual:** `58f56097606253439c2df87c7c72acdc0c232591b1c3d58e9673c19ad5e2ddae`
- **Checksum SHA-256 do Bundle Antecessor (Commit fa29ab576):** `b352835c87fcb338089721ca8e1e61cf93ec58480603fa6077565c7d338839e5`
- **Checksum SHA-256 do Bundle Base (Commit b4ad0669d):** `7b7215b7be18bc01fc44cacbebb32b49643bef02601d453a8b322ff441afb86a`
- **Tamanho do Bundle:** `422.143.846 bytes` (~422 MB)
- **Status da Working Tree no Host:** 100% limpa, zero arquivos pendentes ou untracked no momento da geração.

---

## 1. Conteúdo Preservado no Backup

1. **`Birthub-360-full-history.bundle` (422.143.846 bytes):**
   - Bundle Git completo contendo **todas as 305 entradas do repositório** (298 referências nomeadas + 7 apontadores HEAD de worktree).
   - Preserva o histórico completo de branches locais, tags, referências remotas (`refs/remotes/*`), stashes (`refs/stash`), checkpoints e branches de trabalho de todos os agentes.

2. **`Birthub-360-source/`:**
   - Espelho completo dos arquivos e pastas do projeto em estado legível diretamente no Google Drive.
   - Inclui: `src/`, `docs/`, `tests/`, `scripts/`, `.agents/` (runs, reviews, handoffs, prompts), configurações e workflows.
   - Excluídos apenas diretórios efêmeros (`node_modules`, `.git`, `dist`, `.worktrees`, `.turbo`).

3. **`PLANO-100-PASSOS-BIRTHUB360.html`:**
   - Painel interativo mestre de execução e governança forense dos 100 passos, com sincronização auditável e rastreamento pelo ciclo de vida em 5 estados.

---

## 2. Procedimento Operacional de Restauração

> [!WARNING]
> Uma clonagem convencional (`git clone Birthub-360-full-history.bundle`) ou `git clone --bare` restaura apenas as 41 branches locais e 144 tags (totalizando 185 referências), **descartando as 102 referências remotas e 18 referências forenses** (`refs/stash`, checkpoints e histórico de agentes).

### 2.1 Procedimento de Restauração Total Forense (298 Referências Nomeadas)
Para restaurar integralmente todo o grafo de referências do projeto em um repositório isolado:

```bash
# 1. Inicializar repositório bare isolado
git init --bare Birthub-360-recuperacao.git

# 2. Importar todas as referências do bundle de forma irrestrita
git -C Birthub-360-recuperacao.git fetch "/caminho/Birthub-360-full-history.bundle" '+refs/*:refs/*'

# 3. Criar clone de trabalho a partir do repositório recuperado
git clone Birthub-360-recuperacao.git Birthub-360-trabalho
```

### 2.2 Reconstituição de Worktrees Físicas
O bundle Git preserva os objetos, commits e branches associadas a cada worktree, mas **não restaura automaticamente a estrutura física de diretórios no sistema operacional**. 
Para recriar as worktrees ativas:
```bash
cd Birthub-360-trabalho
git worktree add .worktrees/debt-wave-01 fix/debt-wave-01-security-lgpd
git worktree add .worktrees/pr-741-gate-v2 fix/pr-741-application-gate-v2
git worktree add .worktrees/pr-741-gate-v3 fix/pr-741-application-gate-v3
```

> [!IMPORTANT]
> **Regra de Segurança:** Nunca sobrescreva um repositório em produção diretamente a partir do bundle sem antes validar a integridade e os testes em um diretório temporário isolado.

---

## 3. Estado Auditado dos Pull Requests (HEADs Reais no GitHub)

Censo auditado dos 17 PRs abertos no repositório GitHub ([`MarksNN/Birthub-360`](https://github.com/MarksNN/Birthub-360)), com seus respectivos SHAs HEAD reais obtidos via `refs/pull/*/head` em 21/10/2026:

| PR | Branch | HEAD SHA Real | Título / Descrição | Status Governança 24 |
| :--- | :--- | :--- | :--- | :--- |
| **#18** | `agente/01-remed-02-persist-graph-winloss` | `a98ca53f` | Persistir Grafo de Contas (`AccountGraphNode`, `AccountGraphEdge`) e Autópsia (`WinLossAutopsyReport`) | Aprovado Condicionado |
| **#20** | `agente/02-remed-04-08` | `44902c4d` | REMED-04 aprovação real de rebalanceamento + REMED-08 code-splitting | Draft |
| **#22** | `agente/05-execute-tenancy` | `11cf78c6` | Execute com organizationId explícito + pré-condições sem Failed | Aprovado com Condições |
| **#23** | `agente/04-predictive-rebalance-whatif` | `1fb3dd34` | Recomendações de rebalanceamento e What-If reais | Aprovado Condicionado |
| **#25** | `agente/gha-agents-capabilities` | `49d9ba42` | Cargo e capabilities para account-detective, promise-guardian | Bloqueado por E2E |
| **#26** | `agente/gha-openapi-drift-factory` | `8f1822b2` | verify:openapi-drift resolve routers exportados via factory | Aprovado Condicionado |
| **#28** | `agente/01-migration-drift` | `17a7e927` | Zerar drift schema.prisma x migrations (DATA-007) | Aprovado com Condições |
| **#29** | `agente/gha-capabilities-normalized` | `4f375ec2` | Regenerar capabilities.normalized.json | Em Revisão |
| **#32** | `agente/16-remed-05` | `fcc8ab0e` | Outbox transacional, relay com backoff/dead-letter | Em Revisão |
| **#33** | `agente/21-lgpd-consent-chain-kanon` | `d5dab316` | LGPD: REMED-06 e REMED-07 (k-anonymity K=5) | Em Revisão |
| **#34** | `agente/01-remed-05-outbox-schema` | `933d047c` | Schema da outbox transacional (`DomainEventOutbox`, `DomainEventConsumption`) | Bloqueado por RLS |
| **#35** | `agente/01-lgpd-consent-flywheel-schema` | `9ede6ab4` | REMED-06 — ConsentAuditRecord append-only + Flywheel | Em Revisão |
| **#37** | `agente/01-rebalance-approval-schema` | `f0426aad` | RebalanceApproval com unique por org, note redigida, RLS | Bloqueado por RLS |
| **#38** | `agente/15-security-audit-global-channel`| `6b259b98` | Eventos globais de auditoria fora da outbox por tenant | Em Revisão |
| **#39** | `agente/01-db-owner-role-separation` | `7910ba5b` | Separar papel dono (prospector_migrator) do app (NOBYPASSRLS) | Em Revisão |
| **#40** | `agente/01-prisma-tx-propagation` | `a766c673` | runInTransaction — propagação de tx no client estendido | Em Revisão |
| **#41** | `agente/15-db-role-boot-check` | `50f6eaa4` | Check de boot do papel do banco — fatal em produção | Em Revisão |

---

## 4. Verificação de Integridade

- **Checksum SHA-256 do Bundle Atual (Commit 34717c176):**
  ```text
  58f56097606253439c2df87c7c72acdc0c232591b1c3d58e9673c19ad5e2ddae
  ```
- **Checksum SHA-256 do Bundle Antecessor (Commit fa29ab576):**
  ```text
  b352835c87fcb338089721ca8e1e61cf93ec58480603fa6077565c7d338839e5
  ```
- **Checksum SHA-256 do Bundle Base (Commit b4ad0669d):**
  ```text
  7b7215b7be18bc01fc44cacbebb32b49643bef02601d453a8b322ff441afb86a
  ```
- **Comando de validação no PowerShell:**
  ```powershell
  Get-FileHash -Path "Birthub-360-full-history.bundle" -Algorithm SHA256
  ```
