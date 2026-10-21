# ADR 006: Cadeia de consentimento LGPD append-only, crypto-shredding e worker sem bypass de RLS

## Status

Aceito (REMED-06; schema pelo Agente 01 no PR #35, serviços pelo Agente 21 no PR #33). O orquestrador (Marks) aprovou o item "sem bypass" para o outbox REMED-05 e ele foi aplicado aqui pelo mesmo critério.

## Contexto

A auditoria forense (REMED-06) pediu três coisas:
- uma prova durável e à prova de adulteração de concessão, revogação e retratação de consentimento;
- o expurgo efetivo dos derivados (Flywheel) quando o consentimento é revogado;
- o atendimento ao direito de eliminação (LGPD art. 18, VI) **sem** apagar a prova de que o consentimento existiu.

Há uma tensão nisso: append-only conflita com eliminação.

## Decisão

1. **`ConsentAuditRecord` é append-only.** Ele é protegido por três camadas:
   - trigger `BEFORE UPDATE OR DELETE` e `BEFORE TRUNCATE`, que vale para qualquer papel via DML, inclusive o superuser;
   - privilégios mínimos, em que o app só tem `SELECT, INSERT`;
   - o papel de app **não é dono** da tabela. `scripts/db/create-app-role.sql` exclui as tabelas LGPD da transferência de posse e reaplica os grants mínimos com `lgpd_apply_consent_privileges()`.
   - `UNIQUE (organizationId, sequence)` e `UNIQUE (organizationId, currentHash)`. Não há unique global, então não existe oráculo de existência entre tenants.
   - `CHECK (kind = 'GENESIS' OR subjectRef ~ '^hs256:[a-f0-9]{64}$')`. Isso impede que entre e-mail, telefone ou hash sem chave.
2. **Âncora de cabeça (`ConsentAuditChainHead`)**, atualizada na mesma transação do append. O trigger garante que `genesisId/genesisHash` são imutáveis, que `lastSequence` é estritamente crescente e que DELETE/TRUNCATE ficam bloqueados. O app só tem `SELECT, INSERT, UPDATE`. A única exceção é o DELETE em cascata a partir de `Organization` (`pg_trigger_depth() > 1`), e ele só é possível quando a organização não tem mais registros na cadeia (FK `Restrict`). Com isso, o `verify()` do #33 detecta truncamento de cauda e recriação da gênese.
3. **Pseudonimização + crypto-shredding.** `subjectRef = hs256:HMAC-SHA256(chave do titular, ref)`.
   - A chave aleatória por titular fica em `ConsentSubjectKey` (o app tem `SELECT, INSERT, DELETE`). O endereço é `lookupId = HMAC(pepper do tenant, ref)`, e o pepper fica fora do banco (KMS ou segredo).
   - Destruir a chave torna o `subjectRef` da cadeia irreversível. É assim que o direito de eliminação é atendido sem quebrar a cadeia.
   - Todo DELETE de chave grava automaticamente um **tombstone** em `ConsentSubjectKeyTombstone` (org, lookupId, keyCreatedAt, shreddedAt, shreddedBy; **sem** material de chave). O registro é feito por um trigger `SECURITY DEFINER`, o tombstone é append-only e o app só tem `SELECT` nele. Isso torna o shredding demonstrável.
4. **Texto livre fora da cadeia.** `ConsentEventDetail` (o app tem `SELECT, INSERT, DELETE`) guarda motivo e observações e tem `retentionUntil`. A cadeia só guarda `reasonCode` (um enum com 5 valores).
5. **Outbox de expurgo (`ConsentPurgeTask`) e workers SEM bypass de RLS.**
   - As policies `tenant_isolation` **não** têm a cláusula `app.bypass_rls`, e **não existe** papel dedicado de bypass.
   - Qualquer worker cross-tenant precisa iterar **por organização**: listar as organizações pelo caminho já permitido (Organization está no allowlist de bypass) e, para cada uma, abrir uma transação com `set_config('app.current_tenant_id', orgId, true)` antes de ler ou atualizar as tasks. O teste de integração prova que `app.bypass_rls = on` não abre nada nessas tabelas.
   - **Impacto no #33:** `processPendingPurges` e `deleteMany` de retenção hoje fazem `findMany` sem `organizationId`, e precisam passar a usar esse loop por organização.

6. **O head avança no próprio banco.** O trigger `BEFORE INSERT` `consent_audit_advance_head` em `ConsentAuditRecord` é `SECURITY DEFINER` e roda o seguinte:
   - recusa quando `organizationId` ≠ `app.current_tenant_id`, antes de ler o head. Assim não vaza sequence nem hash de outro tenant;
   - `GENESIS` exige `sequence = 0` e `previousHash = 64 zeros`, e cria o head. Uma segunda gênese no mesmo tenant gera `GENESIS_REPLACED`;
   - nos demais eventos, faz `SELECT … FOR UPDATE` no head, que serializa os appends concorrentes do tenant. Exige `sequence = lastSequence + 1` e `previousHash = lastHash`, e então avança `lastSequence/lastHash`.

   Lacuna, reordenação e bifurcação são recusadas **no INSERT**. Somado ao guard de UPDATE do head (só cresce, gênese imutável), quem quiser esconder um truncamento de cauda precisa desligar os triggers como dono. Esse risco residual fica com a ancoragem externa (Agente 15).

## Garantia de HMAC: é da aplicação, não do banco (parecer 24 @102cb08c, P2-1)

O `CHECK (subjectRef ~ '^hs256:[a-f0-9]{64}$')` valida **apenas o formato**. O banco não consegue distinguir `hs256:HMAC(chave, ref)` de `hs256:` + `sha256(e-mail)` sem chave, que seria reversível por dicionário. A garantia de pseudonimização com chave é **da camada de aplicação** (`consentAuditChain.service.ts` do #33) e precisa ser coberta por um **teste de contrato no #33**: token ≠ `sha256(subjectRef)` e token muda quando a chave do titular muda.

**Mitigação no banco avaliada e rejeitada:** amarrar cada registro não-gênese a uma linha de `ConsentSubjectKey` por FK `(organizationId, subjectLookupId)`.
- (a) Uma FK impediria o DELETE da chave, que é justamente o crypto-shredding. As alternativas `ON DELETE SET NULL/CASCADE` exigiriam UPDATE ou DELETE na cadeia append-only.
- (b) Gravar o `lookupId = HMAC(pepper do tenant, ref)` na cadeia **recriaria a vinculabilidade** que o shredding remove: enquanto o pepper existir, qualquer um com o `ref` recalcula o `lookupId` e acha os eventos do titular mesmo depois da eliminação.
- (c) Mesmo com a FK, o banco continuaria sem verificar que o token foi derivado daquela chave, porque o HMAC é calculado fora do banco.

O ganho seria marginal e o custo seria quebrar a eliminação, por isso a decisão foi apenas o CHECK de formato + teste de contrato no #33 + revisão do Agente 15.

## Base legal para manter a cadeia

- **Art. 8º, §2º:** cabe ao controlador o ônus de provar que o consentimento foi obtido conforme a lei. A cadeia é essa prova e precisa sobreviver à revogação.
- **Art. 16, I:** autoriza conservar os dados após o término do tratamento para cumprir obrigação legal ou regulatória. A prova de consentimento e revogação se enquadra aqui.
- O que fica na cadeia depois do shredding (pseudônimo irreversível + finalidade + versão dos termos + datas) é o mínimo necessário (art. 6º, III). O conteúdo livre é expurgado (`ConsentEventDetail`) e os derivados de IA são removidos (Flywheel, #33).

## Riscos residuais

- **Superuser ou dono.** Quem tem posse da tabela pode `DISABLE TRIGGER`, `DROP TRIGGER` ou usar `session_replication_role = replica`. A mitigação é dupla: o app nunca é dono e a âncora de cabeça existe. A ancoragem externa periódica do `lastHash`, ou HMAC com chave em KMS, fica com o Agente 15.
- **Produção.** Falta evidência de que o runtime de produção usa `prospector_app` e não o dono. Isso é responsabilidade do 08A/15.

## Dependência aberta: segredo por tenant destrutível (parecer 24 @102cb08c, P2-2)

O passo 1 do runbook (destruir o pepper do tenant) **ainda não é possível** com o `EnvTenantPepperProvider` do #33. Ele deriva o pepper de um segredo global (`HMAC(LGPD_SUBJECT_PEPPER_SECRET, organizationId)`): destruir o segredo afetaria todos os tenants, e mantê-lo permite recalcular o pepper de qualquer tenant. Só o `KmsTenantPepperProvider`, com uma chave por tenant destrutível individualmente, cumpre o runbook.

**Dependência para o 21 e o 15:**
- exigir `KmsTenantPepperProvider` em produção, com falha no boot se `NODE_ENV=production` usar o provider de env;
- definir a política de destruição e rotação das chaves no KMS (15).

Até isso entrar, o offboarding atende a eliminação **por titular** (shredding de `ConsentSubjectKey`), mas **não** a desvinculação do tenant inteiro via pepper.

## Runbook — offboarding de tenant

1. **Destruir o pepper do tenant** no KMS ou segredo. Com isso, todo `lookupId` fica impossível de recalcular a partir do titular.
2. `DELETE FROM "ConsentSubjectKey"` para a organização, dentro do contexto do tenant. Isso gera os tombstones. Os `subjectRef` da cadeia ficam órfãos e irreversíveis.
3. Expurgar `ConsentEventDetail`, `ConsentPurgeTask` e as tabelas Flywheel (no contexto do tenant).
4. **A cadeia (`ConsentAuditRecord`) e o head são mantidos** até o fim do prazo legal (art. 16, I). Por causa da FK `Restrict`, a `Organization` não pode ser apagada até lá. Ela fica como tombstone (desativada).
5. **Fim do prazo legal (procedimento 01A, break-glass):** uma janela aprovada pelo DPO e pelo Agente 15, executada pelo dono ou migrador, nunca pelo app. Numa transação única:
   - `SET LOCAL lock_timeout`;
   - registrar o evento de auditoria externo (ticket, hash do `lastHash` final);
   - `ALTER TABLE "ConsentAuditRecord" DISABLE TRIGGER consent_audit_no_mutation`;
   - `DELETE ... WHERE "organizationId" = $org`;
   - `ENABLE TRIGGER`;
   - `DELETE FROM "Organization"`, que leva o head, a chave e o tombstone em cascata.

   A transação é atômica, então ninguém vê a tabela com o trigger desligado depois do COMMIT. A conferência posterior é `SELECT tgenabled FROM pg_trigger WHERE tgname LIKE 'consent_%'`, que deve retornar `O`.

## Fora deste ADR

A FK de Flywheel para `Lead` e o expurgo por titular dos derivados (autópsia, `attributionEvidence`, caches de IA e logs) pertencem ao #33 (Agente 21). O schema já tem os índices `(organizationId, leadId)` para isso.
