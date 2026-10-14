# Relatório Técnico de Auditoria

Este relatório documenta 200 verificações abrangendo as 40 categorias exigidas.

## DEBT-DT-01-001 - Código-fonte
- **Problema:** Verificação de ocorrências suspeitas de 'any' relacionadas a Código-fonte
- **Evidência:**
```text
prisma/migrations/20260717002917_init_crm_core/migration.sql:2:CREATE TABLE "Company" (
prisma/migrations/20260717002917_init_crm_core/migration.sql:29:    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
prisma/migrations/20260717002917_init_crm_core/migration.sql:45:    "companyId" TEXT NOT NULL,
```
- **Prioridade:** P1 - Alta
- **Impacto:** Potencial dívida técnica em Código-fonte necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'any'

## DEBT-DT-01-002 - Código-fonte
- **Problema:** Verificação de ocorrências suspeitas de 'TODO:' relacionadas a Código-fonte
- **Evidência:**
```text
prisma/schema.prisma:2187:/// comentário "// TODO: salvar no CRM no futuro". `contactId`/`leadId` ficam nulos quando o
src/features/ai-voice/flowise-router.service.ts:17:    // TODO: Implement actual API call to Flowise endpoint
src/features/integrations/monday/monday.service.ts:19:    // TODO: Validar API Key via chamada GraphQL básica e persistir na conexão
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Código-fonte necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'TODO:'

## DEBT-DT-01-004 - Código-fonte
- **Problema:** Verificação de ocorrências suspeitas de '@ts-expect-error' relacionadas a Código-fonte
- **Evidência:**
```text
src/features/voice-hub/components/useReducedMotion.test.ts:19:    // @ts-expect-error -- simulate an environment where matchMedia is unavailable
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Código-fonte necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de '@ts-expect-error'

## DEBT-DT-01-005 - Código-fonte
- **Problema:** Verificação de ocorrências suspeitas de 'console.log' relacionadas a Código-fonte
- **Evidência:**
```text
scripts/agent-import/build-normalized-catalog.ts:290:  console.log('agents.normalized.json gerado em', outPath);
scripts/agent-import/build-normalized-catalog.ts:291:  console.log(JSON.stringify(summary, null, 2));
scripts/agent-import/classify.ts:2:// console.log — para poder ser reexecutado por scripts/agent-import/build-normalized-catalog.ts
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Código-fonte necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'console.log'

## DEBT-DT-02-002 - Arquitetura
- **Problema:** Verificação de ocorrências suspeitas de 'import *' relacionadas a Arquitetura
- **Evidência:**
```text
prisma/migrations/20260803180000_bitrix_bidirectional_sync/migration.sql:5:ALTER TABLE "BitrixConnection" ADD COLUMN "lastImportedAt" TIMESTAMP(3);
prisma/migrations/20260804200000_bitrix_sync_rule/migration.sql:9:    "lastImportedCount" INTEGER NOT NULL DEFAULT 0,
prisma/migrations/20260807100000_enable_rls_remaining_tables/migration.sql:19:-- IMPORTANTE antes de aplicar em produção: testar o fluxo de login/signup/reset de senha
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Arquitetura necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'import *'

## DEBT-DT-02-003 - Arquitetura
- **Problema:** Verificação de ocorrências suspeitas de 'process.env' relacionadas a Arquitetura
- **Evidência:**
```text
scripts/backup/run-backup-restore-drill.ts:62:  const pgHost = process.env.POSTGRES_HOST || 'localhost';
scripts/backup/run-backup-restore-drill.ts:63:  const pgPort = Number.parseInt(process.env.POSTGRES_PORT || '5434', 10);
scripts/backup/run-backup-restore-drill.ts:64:  const pgUser = process.env.POSTGRES_USER || 'prospector';
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Arquitetura necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'process.env'

## DEBT-DT-02-004 - Arquitetura
- **Problema:** Verificação de ocorrências suspeitas de 'global' relacionadas a Arquitetura
- **Evidência:**
```text
prisma/migrations/20260807100000_enable_rls_remaining_tables/migration.sql:143:-- 10. AiEngineSetting — CASO DIFERENTE dos demais: é uma config global por ferramenta
prisma/migrations/20260815030000_feature_flags_and_bug_reports/migration.sql:2:-- Reportar Problemas). Três tabelas novas: FeatureFlag (catálogo global), OrganizationFeatureFlag
prisma/migrations/20260815030000_feature_flags_and_bug_reports/migration.sql:19:-- Catálogo global, sem organizationId (nada de tenant para isolar) — mesmo caso de
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Arquitetura necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'global'

## DEBT-DT-02-005 - Arquitetura
- **Problema:** Verificação de ocorrências suspeitas de 'window' relacionadas a Arquitetura
- **Evidência:**
```text
scripts/ai/bootstrap-ollama.bat:3:echo  Central Birth Hub 360 -- Bootstrap do Ollama no Windows
scripts/architecture/audit-repo.cjs:579:            <li><strong>Data Enrichment Caching:</strong> Strict 24-hour cache window (via <code>enrichedAt</code> on Company model) to minimize third-party API costs. (<span class="badge implemented">IMPLEMENTADO</span>)</li>
scripts/architecture/check-hotspots.ts:103:  // quebra de linha do Windows (\r\n) faz o \n literal destes padrões nunca casar, e a função
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Arquitetura necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'window'

## DEBT-DT-03-001 - Frontend e UX
- **Problema:** Verificação de ocorrências suspeitas de '!important' relacionadas a Frontend e UX
- **Evidência:**
```text
src/features/auth/components/NewLoginScreen.css:27:  color: var(--color-brand-primary) !important;
src/features/auth/components/NewLoginScreen.css:28:  background: var(--color-brand-primary) !important;
src/features/auth/components/NewLoginScreen.css:29:  border: 1px solid var(--color-brand-primary) !important;
```
- **Prioridade:** P1 - Alta
- **Impacto:** Potencial dívida técnica em Frontend e UX necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de '!important'

## DEBT-DT-03-002 - Frontend e UX
- **Problema:** Verificação de ocorrências suspeitas de 'style=' relacionadas a Frontend e UX
- **Evidência:**
```text
scripts/architecture/audit-repo.cjs:337:            <a href="${link.href}" style="${activePage === link.href ? 'color: var(--primary); font-weight: 600; background: rgba(59, 130, 246, 0.1);' : ''}">
scripts/architecture/audit-repo.cjs:1082:                <td><span class="badge" style="background: rgba(234,179,8,0.2); color: #eab308; border: 1px solid rgba(234,179,8,0.5)">HIGH</span></td>
scripts/architecture/audit-repo.cjs:1088:                <td><span class="badge" style="background: rgba(239,68,68,0.2); color: #ef4444; border: 1px solid rgba(239,68,68,0.5)">CRITICAL</span></td>
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Frontend e UX necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'style='

## DEBT-DT-03-003 - Frontend e UX
- **Problema:** Verificação de ocorrências suspeitas de 'alert(' relacionadas a Frontend e UX
- **Evidência:**
```text
scripts/architecture/audit-repo.cjs:931:            <li><strong>Toast Notifications:</strong> Global toast system (<code>src/lib/toast.ts</code>) handles success/error feedback. Native <code>alert()</code> is strictly prohibited.</li>
scripts/architecture/audit-repo.cjs:1025:                <strong>Usage:</strong> Non-blocking user feedback (<code>toast.success</code>, <code>toast.error</code>). Replaces all native <code>alert()</code> calls.
scripts/update_prospecting.py:150:                                                onClick={(e) => { e.preventDefault(); alert('Gerando Quebra-Gelo com IA para ' + dm.name + '...'); }}
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Frontend e UX necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'alert('

## DEBT-DT-03-004 - Frontend e UX
- **Problema:** Verificação de ocorrências suspeitas de 'px' relacionadas a Frontend e UX
- **Evidência:**
```text
prisma/AGENTS.md:39:- `npx tsc --noEmit`
scripts/architecture/audit-repo.cjs:76:      width: 250px;
scripts/architecture/audit-repo.cjs:78:      border-right: 1px solid var(--border);
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Frontend e UX necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'px'

## DEBT-DT-03-005 - Frontend e UX
- **Problema:** Verificação de ocorrências suspeitas de 'z-index' relacionadas a Frontend e UX
- **Evidência:**
```text
scripts/generate-handoffs-checklist.cjs:36::root{--bg:#f8fafc;--surface:#fff;--ink:#0b132b;--ink-2:#475569;--line:#cbd5e1;--brand:#ffbe0b;--link:#174a9c;--navy:#0b132b}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,sans-serif}a{color:var(--link);text-underline-offset:3px}button,input,select{font:inherit}button,select,input[type=search]{min-height:44px;border:1px solid var(--line);border-radius:6px;padding:9px 12px;background:var(--surface);color:var(--ink)}button{cursor:pointer}button.primary{background:var(--brand);color:var(--navy);border-color:var(--brand);font-weight:650}:focus-visible{outline:3px solid var(--link);outline-offset:3px}.skip{position:absolute;top:-80px;left:16px;background:var(--surface);padding:12px;z-index:3}.skip:focus{top:12px}header{background:var(--navy);color:var(--surface);padding:32px max(24px,calc((100vw - 1280px)/2))}header p{max-width:900px}header a{color:var(--brand)}.eyebrow,.wave{font-size:12px;letter-spacing:.08em;text-transform:uppercase}.eyebrow{color:var(--brand)}h1{font-size:clamp(30px,4vw,48px);line-height:1.12;margin:14px 0}header .stamp{font-size:13px}main{max-width:1328px;margin:auto;padding:28px 24px}.overview{display:flex;gap:24px;align-items:center;border-bottom:1px solid var(--line);padding-bottom:22px}.total{font-size:52px;line-height:1;font-weight:750}.overview p{margin:4px 0}.counts{color:var(--ink-2);font-size:14px}.toolbar{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:12px;margin:22px 0}.toolbar label{font-size:13px;font-weight:600;display:flex;flex-direction:column;gap:6px}.actions{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-bottom:20px}.actions p{margin:0;color:var(--ink-2);font-size:14px}#feedback{font-size:14px;color:var(--ink-2);min-height:24px}.row{display:grid;grid-template-columns:64px minmax(0,1fr) 235px;gap:20px;padding:24px 0;border-top:1px solid var(--line)}.row[hidden]{display:none}.check{display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;color:var(--ink-2);font:12px/1.4 ui-monospace,monospace;min-height:44px}.check input{width:24px;height:24px;accent-color:var(--link)}.wave{color:var(--ink-2)}h2{font-size:18px;line-height:1.4;margin:5px 0;font-weight:650}h2 a{text-decoration:none}h2 a:hover{text-decoration:underline}.path{font:12px/1.5 ui-monospace,monospace;color:var(--ink-2);overflow-wrap:anywhere;margin:8px 0}.status{font-size:14px}.status>span{display:block;border-left:3px solid var(--brand);padding-left:10px;font-weight:650}.status small{display:block;color:var(--ink-2);margin:8px 0 0 13px}summary{cursor:pointer;color:var(--link);font-size:14px;padding:8px 0;min-height:44px}dl{display:grid;grid-template-columns:165px minmax(0,1fr);gap:8px 12px;font-size:13px;margin:12px 0}dt{font-weight:650}dd{margin:0;overflow-wrap:anywhere}.hash{font-family:ui-monospace,monospace}footer{border-top:1px solid var(--line);margin-top:24px;padding-top:20px;color:var(--ink-2);font-size:13px}.empty{padding:30px 0}noscript{display:block;padding:16px;border:1px solid var(--line)}
scripts/generate-html-manual.cjs:259:      z-index: 1000;
scripts/visual-capture-agent.ts:184:        .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.9); }
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Frontend e UX necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'z-index'

## DEBT-DT-04-001 - Backend e APIs
- **Problema:** Verificação de ocorrências suspeitas de 'req.body' relacionadas a Backend e APIs
- **Evidência:**
```text
src/bootstrap/webhooks.ts:27:  // lead cross-tenant sem RLS, nenhuma idempotência e req.body undefined (montado antes do
src/features/activities/presentation/ActivityController.ts:51:      const activity = await this.activityUseCases.createActivity(orgId, req.body);
src/features/activities/presentation/ActivityController.ts:64:        req.body,
```
- **Prioridade:** P1 - Alta
- **Impacto:** Potencial dívida técnica em Backend e APIs necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'req.body'

## DEBT-DT-04-002 - Backend e APIs
- **Problema:** Verificação de ocorrências suspeitas de 'res.send' relacionadas a Backend e APIs
- **Evidência:**
```text
scripts/fix-ts-morph.js:86:                            if (text.startsWith('res.json') || text.startsWith('res.status') || text.startsWith('res.send')) {
src/bootstrap/frontend.ts:13:// como uma rota real que faz acesso a disco (`res.sendFile`) sem rate limit. Limite bem mais
src/bootstrap/frontend.ts:129:      res.sendFile(path.join(distPath, 'index.html'));
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Backend e APIs necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'res.send'

## DEBT-DT-04-003 - Backend e APIs
- **Problema:** Verificação de ocorrências suspeitas de 'setTimeout' relacionadas a Backend e APIs
- **Evidência:**
```text
scripts/architecture/audit-repo.cjs:1087:                <td>Eliminate simulated/mocked functionality (Onda 1 directive). Replace <code>setTimeout</code> mocks with real async DB calls.</td>
scripts/ci/check-bundle-budget.mjs:78:    // ficar ocioso (requestIdleCallback/setTimeout) para nao competir com o formulario no load
scripts/design-system-audit.js:753:    setTimeout(() => {
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Backend e APIs necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'setTimeout'

## DEBT-DT-04-004 - Backend e APIs
- **Problema:** Verificação de ocorrências suspeitas de 'Math.random' relacionadas a Backend e APIs
- **Evidência:**
```text
scripts/architecture/audit-repo.cjs:1039:          <p>Frontend unique ID generation strictly utilizes <code>crypto.randomUUID()</code> to ensure cryptographic safety and collision resistance, expressly avoiding weak implementations like <code>Math.random()</code>.</p>
scripts/reset-passwords.core.ts:58: * `crypto.randomBytes`, não `Math.random()`.
scripts/security/reencrypt-credentials.ts:74:    iv[i] = Math.floor(Math.random() * 256);
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Backend e APIs necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'Math.random'

## DEBT-DT-04-005 - Backend e APIs
- **Problema:** Verificação de ocorrências suspeitas de 'catch (e)' relacionadas a Backend e APIs
- **Evidência:**
```text
scripts/architecture/audit-repo.cjs:26:  } catch (e) {
scripts/capture-visual-audit-authenticated.cjs:92:      } catch (e) {
scripts/capture-visual-audit.cjs:101:      } catch (e) {
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Backend e APIs necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'catch (e)'

## DEBT-DT-05-001 - Banco de dados
- **Problema:** Verificação de ocorrências suspeitas de 'SELECT *' relacionadas a Banco de dados
- **Evidência:**
```text
prisma/migrations/20260722020322_enable_rls/migration.sql:70:        SELECT id FROM "Lead"
prisma/migrations/20260722020322_enable_rls/migration.sql:79:        SELECT id FROM "Lead"
prisma/migrations/20260731170000_knowledge_base_tenant_scope/migration.sql:19:SET "organizationId" = (SELECT "id" FROM "Organization" ORDER BY "createdAt" ASC LIMIT 1)
```
- **Prioridade:** P1 - Alta
- **Impacto:** Potencial dívida técnica em Banco de dados necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'SELECT *'

## DEBT-DT-05-002 - Banco de dados
- **Problema:** Verificação de ocorrências suspeitas de 'DROP TABLE' relacionadas a Banco de dados
- **Evidência:**
```text
prisma/migrations/20260720235926_sync_accumulated_schema_drift/migration.sql:37:DROP TABLE "User";
prisma/migrations/20260810130000_remove_knowledge_document/migration.sql:9:-- DROP TABLE remove a política RLS e o índice/PK junto, não precisa de passos separados.
prisma/migrations/20260810130000_remove_knowledge_document/migration.sql:11:DROP TABLE "KnowledgeDocument";
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Banco de dados necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'DROP TABLE'

## DEBT-DT-05-003 - Banco de dados
- **Problema:** Verificação de ocorrências suspeitas de 'DELETE FROM' relacionadas a Banco de dados
- **Evidência:**
```text
prisma/migrations/20260731170000_knowledge_base_tenant_scope/migration.sql:24:DELETE FROM "Document" WHERE "organizationId" IS NULL;
prisma/migrations/20260804210000_bitrix_multi_connection/migration.sql:26:DELETE FROM "BitrixSyncRule" WHERE "connectionId" IS NULL;
prisma/migrations/20260820100000_agent_memory_status_and_unique/migration.sql:20:DELETE FROM "AgentMemory" a
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Banco de dados necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'DELETE FROM'

## DEBT-DT-05-004 - Banco de dados
- **Problema:** Verificação de ocorrências suspeitas de 'prisma.$queryRaw' relacionadas a Banco de dados
- **Evidência:**
```text
prisma/AGENTS.md:1:# AGENTS.md — Prisma, Schema e Migrações
prisma/AGENTS.md:11:- `schema.prisma`
prisma/AGENTS.md:18:- Não usar `prisma db push` como solução de produção.
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Banco de dados necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'prisma.$queryRaw'

## DEBT-DT-05-005 - Banco de dados
- **Problema:** Verificação de ocorrências suspeitas de 'updateMany' relacionadas a Banco de dados
- **Evidência:**
```text
prisma/migrations/20260915120000_fix_prospect_company_lead_columns/migration.sql:8:-- (`prisma.prospect.updateMany({ where: { leadId: { in: duplicateIds }, organizationId } , ... })`)
prisma/schema.prisma:3275:  // (LeadDeduplicationService.ts, `prisma.prospect.updateMany({ where: { leadId: { in:
scripts/set-admin.core.ts:6:// `prisma.user.updateMany({ data: { role: 'ADMIN' } })` SEM `where` — ou seja, `tsx
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Banco de dados necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'updateMany'

## DEBT-DT-06-001 - Segurança e privacidade
- **Problema:** Verificação de ocorrências suspeitas de 'password' relacionadas a Segurança e privacidade
- **Evidência:**
```text
prisma/migrations/20260716232635_init/migration.sql:18:    "passwordHash" TEXT NOT NULL,
prisma/migrations/20260720235926_sync_accumulated_schema_drift/migration.sql:44:    "passwordHash" TEXT NOT NULL,
prisma/migrations/20260720235926_sync_accumulated_schema_drift/migration.sql:81:    "password" TEXT,
```
- **Prioridade:** P1 - Alta
- **Impacto:** Potencial dívida técnica em Segurança e privacidade necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'password'

## DEBT-DT-06-002 - Segurança e privacidade
- **Problema:** Verificação de ocorrências suspeitas de 'secret' relacionadas a Segurança e privacidade
- **Evidência:**
```text
prisma/migrations/20260810000000_bitrix_full_wiring_sync_status_audit/migration.sql:8:ADD COLUMN     "webhookSecret" TEXT;
prisma/migrations/20260814120000_three_cx_connection/migration.sql:2:-- (URL do PABX, ramal, apiKey/apiSecret) num `Map` em memória (`memory3CXStore`), perdido a cada
prisma/migrations/20260814120000_three_cx_connection/migration.sql:8:-- apiKey/apiSecret são cifrados em repouso (AES-256-GCM) de forma transparente pela extensão
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Segurança e privacidade necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'secret'

## DEBT-DT-06-003 - Segurança e privacidade
- **Problema:** Verificação de ocorrências suspeitas de 'token' relacionadas a Segurança e privacidade
- **Evidência:**
```text
prisma/migrations/20260720235926_sync_accumulated_schema_drift/migration.sql:59:    "token" TEXT NOT NULL,
prisma/migrations/20260720235926_sync_accumulated_schema_drift/migration.sql:75:    "accessToken" TEXT,
prisma/migrations/20260720235926_sync_accumulated_schema_drift/migration.sql:76:    "refreshToken" TEXT,
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Segurança e privacidade necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'token'

## DEBT-DT-06-004 - Segurança e privacidade
- **Problema:** Verificação de ocorrências suspeitas de 'eval(' relacionadas a Segurança e privacidade
- **Evidência:**
```text
src/features/prospecting/crawlee/crawler.ts:18:      const links = await page.$$eval('a', (anchors: HTMLAnchorElement[]) =>
src/lib/queue/distributedLock.ts:47:      await cacheConnection.eval(
src/lib/queue/distributedLock.ts:71:      const result = await cacheConnection.eval(
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Segurança e privacidade necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'eval('

## DEBT-DT-06-005 - Segurança e privacidade
- **Problema:** Verificação de ocorrências suspeitas de 'localStorage' relacionadas a Segurança e privacidade
- **Evidência:**
```text
prisma/migrations/20260813230000_fix_ailog_rls_unattributed_internal_writes/migration.sql:5:-- AsyncLocalStorage. Nesses casos o gateway grava `organizationId = NULL`.
prisma/schema.prisma:3365:// dashboard com histórico real (o protótipo guardava isso em localStorage, que não serve pra um
scripts/capture-screens.mjs:42:    localStorage.setItem('atlas_theme', 'dark');
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Segurança e privacidade necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'localStorage'

## DEBT-DT-07-001 - Infraestrutura e DevOps
- **Problema:** Verificação de ocorrências suspeitas de 'latest' relacionadas a Infraestrutura e DevOps
- **Evidência:**
```text
prisma/migrations/20260913170000_win_loss_report_sources/migration.sql:8:-- Dois valores próprios (não reusa `ON_DEMAND`): `/report/latest` já filtra estritamente
prisma/schema.prisma:1851:/// a mesma forma (`content` em markdown + `metrics` de contexto); `/report/latest` continua
prisma/schema.prisma:1859:  /// porque `/report/latest` já filtra estritamente `ON_DEMAND` para o relatório executivo — um
```
- **Prioridade:** P1 - Alta
- **Impacto:** Potencial dívida técnica em Infraestrutura e DevOps necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'latest'

## DEBT-DT-07-002 - Infraestrutura e DevOps
- **Problema:** Verificação de ocorrências suspeitas de 'docker-compose' relacionadas a Infraestrutura e DevOps
- **Evidência:**
```text
prisma/migrations/20260731170000_knowledge_base_tenant_scope/migration.sql:45:-- (o docker-compose usa a imagem pgvector, mas ambientes locais frequentemente têm um Postgres
scripts/ai/bootstrap-ollama.bat:11:    echo Container %OLLAMA_CONTAINER% nao esta rodando. Verifique o docker-compose up.
scripts/db/bootstrap-app-role.sh:14:# Exemplo (docker-compose local, ja rodando):
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Infraestrutura e DevOps necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'docker-compose'

## DEBT-DT-07-004 - Infraestrutura e DevOps
- **Problema:** Verificação de ocorrências suspeitas de 'root' relacionadas a Infraestrutura e DevOps
- **Evidência:**
```text
scripts/architecture/audit-repo.cjs:49:    :root {
scripts/architecture/check-hotspots.ts:25:const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
scripts/architecture/check-hotspots.ts:26:const EXCEPTIONS_PATH = path.join(ROOT, 'docs/architecture/HOTSPOT_EXCEPTIONS.md');
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Infraestrutura e DevOps necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'root'

## DEBT-DT-08-002 - Testes e QA
- **Problema:** Verificação de ocorrências suspeitas de 'it.only' relacionadas a Testes e QA
- **Evidência:**
```text
src/features/voice-hub/components/NotificationCenter/NotificationCenter.tsx:138:        // does not rely on the parent DOM structure it is rendered into (it only needs to sit
src/lib/voice-hub/controllers/knowledge.controller.test.ts:34:// The canonical EICAR antivirus test string — genuinely plain ASCII text, so it only tests
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Testes e QA necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'it.only'

## DEBT-DT-08-004 - Testes e QA
- **Problema:** Verificação de ocorrências suspeitas de 'assert.equal' relacionadas a Testes e QA
- **Evidência:**
```text
scripts/verify-handoffs-checklist.cjs:20:    assert.equal(records.length, sources.length);
scripts/verify-handoffs-checklist.cjs:21:    assert.equal(records.length, 196, 'A missão inicial deve cobrir os 196 documentos');
scripts/verify-handoffs-checklist.cjs:22:    assert.equal(new Set(records.map((r) => r.path)).size, 196);
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Testes e QA necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'assert.equal'

## DEBT-DT-08-005 - Testes e QA
- **Problema:** Verificação de ocorrências suspeitas de 'sleep(' relacionadas a Testes e QA
- **Evidência:**
```text
src/features/automations/automation.engine.ts:157:function sleep(ms: number): Promise<void> {
src/features/automations/automation.engine.ts:382:        await sleep(ACTION_RETRY_BASE_DELAY_MS * attempt);
src/features/cadence/dialer/infrastructure/http/retry.ts:11:function defaultSleep(ms: number): Promise<void> {
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Testes e QA necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'sleep('

## DEBT-DT-09-001 - Integrações externas
- **Problema:** Verificação de ocorrências suspeitas de 'fetch(' relacionadas a Integrações externas
- **Evidência:**
```text
scripts/update_dock_quick_actions.py:52:        const res = await fetch(endpoint, {
scripts/update_dock_quick_actions.py:104:        const res = await fetch(endpoint, {
scripts/verify-integrations.ts:62:    const response = await fetch(
```
- **Prioridade:** P1 - Alta
- **Impacto:** Potencial dívida técnica em Integrações externas necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'fetch('

## DEBT-DT-09-003 - Integrações externas
- **Problema:** Verificação de ocorrências suspeitas de 'bitrix' relacionadas a Integrações externas
- **Evidência:**
```text
prisma/migrations/20260726013952_add_ai_engine_setting/migration.sql:24:    "bitrixId" TEXT,
prisma/migrations/20260803120000_bitrix_connection/migration.sql:1:-- Conexão do Bitrix24 por organização — webhook de entrada gerado pelo próprio usuário no
prisma/migrations/20260803120000_bitrix_connection/migration.sql:2:-- portal Bitrix24 dele. Antes disso a URL do webhook não era persistida em lugar nenhum: cada
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Integrações externas necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'bitrix'

## DEBT-DT-09-004 - Integrações externas
- **Problema:** Verificação de ocorrências suspeitas de 'webhook' relacionadas a Integrações externas
- **Evidência:**
```text
prisma/migrations/20260802160000_call_suppression_list/migration.sql:20:-- reentrega o webhook até receber 2xx.
prisma/migrations/20260803120000_bitrix_connection/migration.sql:1:-- Conexão do Bitrix24 por organização — webhook de entrada gerado pelo próprio usuário no
prisma/migrations/20260803120000_bitrix_connection/migration.sql:2:-- portal Bitrix24 dele. Antes disso a URL do webhook não era persistida em lugar nenhum: cada
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Integrações externas necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'webhook'

## DEBT-DT-09-005 - Integrações externas
- **Problema:** Verificação de ocorrências suspeitas de 'apikey' relacionadas a Integrações externas
- **Evidência:**
```text
prisma/migrations/20260814120000_three_cx_connection/migration.sql:2:-- (URL do PABX, ramal, apiKey/apiSecret) num `Map` em memória (`memory3CXStore`), perdido a cada
prisma/migrations/20260814120000_three_cx_connection/migration.sql:8:-- apiKey/apiSecret são cifrados em repouso (AES-256-GCM) de forma transparente pela extensão
prisma/migrations/20260814120000_three_cx_connection/migration.sql:18:    "apiKey" TEXT,
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Integrações externas necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'apikey'

## DEBT-DT-10-001 - Inteligência artificial
- **Problema:** Verificação de ocorrências suspeitas de 'prompt' relacionadas a Inteligência artificial
- **Evidência:**
```text
prisma/migrations/20260720235926_sync_accumulated_schema_drift/migration.sql:101:CREATE TABLE "Prompt" (
prisma/migrations/20260720235926_sync_accumulated_schema_drift/migration.sql:114:    CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
prisma/migrations/20260720235926_sync_accumulated_schema_drift/migration.sql:157:    "promptId" TEXT,
```
- **Prioridade:** P1 - Alta
- **Impacto:** Potencial dívida técnica em Inteligência artificial necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'prompt'

## DEBT-DT-10-002 - Inteligência artificial
- **Problema:** Verificação de ocorrências suspeitas de 'llm' relacionadas a Inteligência artificial
- **Evidência:**
```text
prisma/migrations/20260801120000_tenant_scope_ai_memory_prompts_and_rls/migration.sql:12:-- create() disparado de dentro de um worker do BullMQ sem contexto de requisição (AIPendingAction,
prisma/migrations/20260802180000_cold_call_run_visibility/migration.sql:5:-- dentro do worker do BullMQ (sem request HTTP), sob requestContext.run({ tenantId }) — mesmo
prisma/migrations/20260807100000_enable_rls_remaining_tables/migration.sql:11:-- ser escritas fora do ciclo normal de request (worker/BullMQ/webhook), pelo mesmo motivo
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Inteligência artificial necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'llm'

## DEBT-DT-10-003 - Inteligência artificial
- **Problema:** Verificação de ocorrências suspeitas de 'openai' relacionadas a Inteligência artificial
- **Evidência:**
```text
prisma/migrations/20260731230000_fix_documentchunk_vector_dimensions/migration.sql:4:-- vector(1536) — deriva antiga, provavelmente de quando o projeto mirava embeddings da OpenAI
scripts/security/scan-secrets.sh:115:    'sk-[A-Za-z0-9]{20,}'                                 # chave estilo OpenAI/Anthropic/Bland
scripts/verify-integrations.ts:120:    const response = await fetch('https://api.groq.com/openai/v1/models', {
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Inteligência artificial necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'openai'

## DEBT-DT-10-004 - Inteligência artificial
- **Problema:** Verificação de ocorrências suspeitas de 'groq' relacionadas a Inteligência artificial
- **Evidência:**
```text
scripts/update_dashboard.py:153:    '"Central de Motores de IA: Groq + Llama"': '"Coração do Sistema: Central de Motores Groq"',
scripts/update_dock_quick_actions.py:12:  groq: ["Análise de concorrentes locais", "Resuma os dados do cliente", "Melhorar tom de voz do e-mail"],
scripts/update_dock_quick_actions.py:48:        if (activeTool === 'groq') endpoint = '/api/agent/groq';
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Inteligência artificial necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'groq'

## DEBT-DT-10-005 - Inteligência artificial
- **Problema:** Verificação de ocorrências suspeitas de 'temperature' relacionadas a Inteligência artificial
- **Evidência:**
```text
prisma/migrations/20260717002917_init_crm_core/migration.sql:64:    "temperature" TEXT,
prisma/migrations/20260717183411_sprint3_5_enums_and_cleanup/migration.sql:14:  - The `temperature` column on the `Lead` table would be dropped and recreated. This will lead to data loss if there is data in the column.
prisma/migrations/20260717183411_sprint3_5_enums_and_cleanup/migration.sql:31:DROP TYPE IF EXISTS "LeadTemperature" CASCADE;
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Inteligência artificial necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'temperature'

## DEBT-DT-11-003 - Documentação
- **Problema:** Verificação de ocorrências suspeitas de 'undocumented' relacionadas a Documentação
- **Evidência:**
```text
scripts/verify-openapi-drift.ts:60:  kind: 'undocumented-path' | 'undocumented-method';
scripts/verify-openapi-drift.ts:237:      findings.push({ method, docStylePath, sourcePath, kind: 'undocumented-path' });
scripts/verify-openapi-drift.ts:239:      findings.push({ method, docStylePath, sourcePath, kind: 'undocumented-method' });
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Documentação necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'undocumented'

## DEBT-DT-11-005 - Documentação
- **Problema:** Verificação de ocorrências suspeitas de 'Draft' relacionadas a Documentação
- **Evidência:**
```text
prisma/migrations/20260908020000_multi_cargo_agent_governance_foundation/migration.sql:18:CREATE TYPE "AgentVersionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DEPRECATED');
prisma/migrations/20260908020000_multi_cargo_agent_governance_foundation/migration.sql:79:    "status" "AgentVersionStatus" NOT NULL DEFAULT 'DRAFT',
prisma/migrations/20260909110000_agent_build_proposal/migration.sql:8:CREATE TYPE "AgentBuildProposalStatus" AS ENUM ('DRAFT', 'GAP_NOT_CONFIRMED', 'UNDER_REVIEW', 'APPROVED_FOR_DEVELOPMENT', 'REJECTED');
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Documentação necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'Draft'

## DEBT-DT-12-002 - Conhecimento técnico
- **Problema:** Verificação de ocorrências suspeitas de 'hack' relacionadas a Conhecimento técnico
- **Evidência:**
```text
scripts/agent-import/classify.ts:145:    'procurement hacker',
scripts/agent-import/data/prompts.catalog.json:1238:    "name": "ProcurementHacker Agent",
scripts/agent-import/data/prompts.catalog.json:1240:    "systemPrompt": "Você é o ProcurementHacker, especialista em navegar processos de compras corporativas complexos. Sua missão é orientar o closer sobre como atravessar comitês, RFPs e aprovações internas do prospect sem violar as regras do processo, apenas sendo mais eficiente dentro delas."
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Conhecimento técnico necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'hack'

## DEBT-DT-12-003 - Conhecimento técnico
- **Problema:** Verificação de ocorrências suspeitas de 'workaround' relacionadas a Conhecimento técnico
- **Evidência:**
```text
prisma/migrations/20260819120000_cadence_state_machine_completion/migration.sql:8:-- (permissão negada para criar banco) — mesmo workaround já usado na Onda 5 para a persistência
prisma/migrations/20260819140000_proposal_versioning_view_tracking/migration.sql:8:-- (permissão negada para criar banco) — mesmo workaround já usado nas Ondas 5 e 22.
prisma/migrations/20260826140000_expand_intelligence_evidence_type/migration.sql:10:-- Postgres/shadow database disponível (mesmo workaround já usado nas migrations
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Conhecimento técnico necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'workaround'

## DEBT-DT-12-004 - Conhecimento técnico
- **Problema:** Verificação de ocorrências suspeitas de 'temporary' relacionadas a Conhecimento técnico
- **Evidência:**
```text
prisma/migrations/20260909020000_cross_role_authorization_approvals/migration.sql:49:CREATE TABLE "TemporaryCapabilityGrant" (
prisma/migrations/20260909020000_cross_role_authorization_approvals/migration.sql:62:    CONSTRAINT "TemporaryCapabilityGrant_pkey" PRIMARY KEY ("id")
prisma/migrations/20260909020000_cross_role_authorization_approvals/migration.sql:81:CREATE UNIQUE INDEX "TemporaryCapabilityGrant_accessRequestId_key" ON "TemporaryCapabilityGrant"("accessRequestId");
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Conhecimento técnico necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'temporary'

## DEBT-DT-13-001 - Governança
- **Problema:** Verificação de ocorrências suspeitas de 'bypass' relacionadas a Governança
- **Evidência:**
```text
prisma/migrations/20260722020322_enable_rls/migration.sql:32:    OR current_setting('app.bypass_rls', TRUE) = 'on'
prisma/migrations/20260722020322_enable_rls/migration.sql:39:    OR current_setting('app.bypass_rls', TRUE) = 'on'
prisma/migrations/20260722020322_enable_rls/migration.sql:45:    OR current_setting('app.bypass_rls', TRUE) = 'on'
```
- **Prioridade:** P1 - Alta
- **Impacto:** Potencial dívida técnica em Governança necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'bypass'

## DEBT-DT-13-002 - Governança
- **Problema:** Verificação de ocorrências suspeitas de 'override' relacionadas a Governança
- **Evidência:**
```text
prisma/migrations/20260815030000_feature_flags_and_bug_reports/migration.sql:3:-- (override por tenant) e BugReport (relatos capturados pelo botão flutuante do frontend).
prisma/migrations/20260908020000_multi_cargo_agent_governance_foundation/migration.sql:177:-- "FeatureFlag" (que também não tem RLS; só o override "OrganizationFeatureFlag" tem
prisma/schema.prisma:960:  featureFlagOverrides          OrganizationFeatureFlag[]
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Governança necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'override'

## DEBT-DT-13-003 - Governança
- **Problema:** Verificação de ocorrências suspeitas de 'force' relacionadas a Governança
- **Evidência:**
```text
prisma/migrations/20260722020322_enable_rls/migration.sql:1:-- Enable RLS and Force it (even for table owners)
prisma/migrations/20260722020322_enable_rls/migration.sql:3:ALTER TABLE "Company" FORCE ROW LEVEL SECURITY;
prisma/migrations/20260722020322_enable_rls/migration.sql:6:ALTER TABLE "Contact" FORCE ROW LEVEL SECURITY;
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Governança necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'force'

## DEBT-DT-13-004 - Governança
- **Problema:** Verificação de ocorrências suspeitas de 'ignore' relacionadas a Governança
- **Evidência:**
```text
scripts/local-first/backup-supabase.ps1:47:Write-Host 'Este arquivo contém dados reais. Ele está coberto pelas regras de .gitignore e não deve ser enviado ao GitHub.'
scripts/migration/bootstrap-new-machine.ps1:25:  $untrackedDir = Join-Path $VaultPath "untracked-and-ignored"
scripts/migration/bootstrap-new-machine.sh:44:  UNTRACKED_DIR="$VAULT_PATH/untracked-and-ignored"
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Governança necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'ignore'

## DEBT-DT-13-005 - Governança
- **Problema:** Verificação de ocorrências suspeitas de 'skip' relacionadas a Governança
- **Evidência:**
```text
prisma/migrations/20260802180000_cold_call_run_visibility/migration.sql:13:    "skippedMaxAttempts" INTEGER NOT NULL DEFAULT 0,
prisma/migrations/20260802180000_cold_call_run_visibility/migration.sql:14:    "skippedCooldown" INTEGER NOT NULL DEFAULT 0,
prisma/migrations/20260802180000_cold_call_run_visibility/migration.sql:15:    "skippedNoPhone" INTEGER NOT NULL DEFAULT 0,
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Governança necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'skip'

## DEBT-DT-14-001 - Git e versionamento
- **Problema:** Verificação de ocorrências suspeitas de 'master' relacionadas a Git e versionamento
- **Evidência:**
```text
scripts/agent-import/data/prompts.catalog.json:1353:    "name": "GamificationMaster Agent",
scripts/agent-import/data/prompts.catalog.json:1355:    "systemPrompt": "Você é o GamificationMaster, especialista em desenhar mecânicas de gamificação comercial. Sua missão é manter o time engajado nas métricas que realmente importam, sem incentivar comportamento que otimiza o jogo em vez do resultado."
scripts/agent-import/source-data.ts:148:  'GamificationMaster Agent',
```
- **Prioridade:** P1 - Alta
- **Impacto:** Potencial dívida técnica em Git e versionamento necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'master'

## DEBT-DT-14-002 - Git e versionamento
- **Problema:** Verificação de ocorrências suspeitas de 'main' relacionadas a Git e versionamento
- **Evidência:**
```text
prisma/migrations/20260810130000_remove_knowledge_document/migration.sql:5:-- sessão anterior (20260807100000_enable_rls_remaining_tables) já havia identificado exatamente
prisma/migrations/20260815020000_bitrix_extraction_run/migration.sql:54:-- 20260722020322_enable_rls, 20260807100000_enable_rls_remaining_tables). WITH CHECK(true) porque
prisma/migrations/20260815030000_feature_flags_and_bug_reports/migration.sql:20:-- AiEngineSetting em 20260807100000_enable_rls_remaining_tables: a policy só exige que a conexão
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Git e versionamento necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'main'

## DEBT-DT-14-003 - Git e versionamento
- **Problema:** Verificação de ocorrências suspeitas de 'conflict' relacionadas a Git e versionamento
- **Evidência:**
```text
prisma/migrations/20260826140000_expand_intelligence_evidence_type/migration.sql:17:ALTER TYPE "IntelligenceEvidenceType" ADD VALUE IF NOT EXISTS 'CONFLICT';
prisma/schema.prisma:141:/// CPI — item "Enum de evidencia incompleto": ESTIMATE/UNKNOWN/CONFLICT adicionados nesta rodada
prisma/schema.prisma:157:  CONFLICT
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Git e versionamento necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'conflict'

## DEBT-DT-14-004 - Git e versionamento
- **Problema:** Verificação de ocorrências suspeitas de 'HEAD' relacionadas a Git e versionamento
- **Evidência:**
```text
prisma/schema.prisma:3023:  /// o header `Stripe-Signature` de cada entrega (ver stripe.webhook.ts) antes de aceitar qualquer
prisma/schema.prisma:3618:/// `WhatsAppMessage`, mas para o canal de e-mail. `providerMessageId` (header `Message-Id`) dá
prisma/schema.prisma:3619:/// idempotência de reentrega; `inReplyTo` (header `In-Reply-To`) dá threading. Compartilhado com o
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Git e versionamento necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'HEAD'

## DEBT-DT-14-005 - Git e versionamento
- **Problema:** Verificação de ocorrências suspeitas de 'rebase' relacionadas a Git e versionamento
- **Evidência:**
```text
scripts/agent-import/source-data.ts:5:// 2026-09-08) — não é uma cópia do código-fonte daquele app (React/Vite/Firebase, projeto
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Git e versionamento necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'rebase'

## DEBT-DT-15-001 - Revisão de código
- **Problema:** Verificação de ocorrências suspeitas de 'CR' relacionadas a Revisão de código
- **Evidência:**
```text
prisma/AGENTS.md:17:- Nenhum outro agente cria ou edita migração.
prisma/migrations/20260716232635_init/migration.sql:1:-- CreateEnum
prisma/migrations/20260716232635_init/migration.sql:2:CREATE TYPE "Role" AS ENUM ('ADMINISTRADOR', 'GESTOR_COMERCIAL', 'SDR', 'CLOSER', 'VISUALIZADOR');
```
- **Prioridade:** P1 - Alta
- **Impacto:** Potencial dívida técnica em Revisão de código necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'CR'

## DEBT-DT-15-002 - Revisão de código
- **Problema:** Verificação de ocorrências suspeitas de 'review' relacionadas a Revisão de código
- **Evidência:**
```text
prisma/migrations/20260720235926_sync_accumulated_schema_drift/migration.sql:12:ADD COLUMN     "googleReviewsCount" INTEGER,
prisma/migrations/20260818100000_ldr_account_intelligence_foundation/migration.sql:255:    "reviewedAt" TIMESTAMP(3),
prisma/migrations/20260818100000_ldr_account_intelligence_foundation/migration.sql:256:    "reviewedBy" TEXT,
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Revisão de código necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'review'

## DEBT-DT-15-003 - Revisão de código
- **Problema:** Verificação de ocorrências suspeitas de 'LGTM' relacionadas a Revisão de código
- **Evidência:**
```text
src/shared/security/urlGuard.ts:162:    // lgtm[js/request-foraging]
src/shared/security/urlGuard.ts:185:    // lgtm[js/request-foraging]
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Revisão de código necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'LGTM'

## DEBT-DT-15-004 - Revisão de código
- **Problema:** Verificação de ocorrências suspeitas de 'approved' relacionadas a Revisão de código
- **Evidência:**
```text
prisma/migrations/20260720235926_sync_accumulated_schema_drift/migration.sql:110:    "approved" BOOLEAN NOT NULL DEFAULT false,
prisma/migrations/20260720235926_sync_accumulated_schema_drift/migration.sql:189:    "approved" BOOLEAN NOT NULL DEFAULT false,
prisma/migrations/20260728183000_scope_ai_pending_actions/migration.sql:4:CREATE INDEX "AIPendingAction_organizationId_approved_idx"
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Revisão de código necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'approved'

## DEBT-DT-15-005 - Revisão de código
- **Problema:** Verificação de ocorrências suspeitas de 'WIP' relacionadas a Revisão de código
- **Evidência:**
```text
src/features/voice-hub/components/Sidebar.tsx:79:        // and would silently wipe out favorites/theme/other keys saved by other calls.
src/lib/soundEffects.ts:12:  | 'swipe';
src/lib/soundEffects.ts:148:        case 'swipe':
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Revisão de código necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'WIP'

## DEBT-DT-16-001 - Configuração
- **Problema:** Verificação de ocorrências suspeitas de 'default' relacionadas a Configuração
- **Evidência:**
```text
prisma/migrations/20260716232635_init/migration.sql:8:    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
prisma/migrations/20260716232635_init/migration.sql:20:    "role" "Role" NOT NULL DEFAULT 'VISUALIZADOR',
prisma/migrations/20260716232635_init/migration.sql:22:    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
```
- **Prioridade:** P1 - Alta
- **Impacto:** Potencial dívida técnica em Configuração necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'default'

## DEBT-DT-16-002 - Configuração
- **Problema:** Verificação de ocorrências suspeitas de 'config' relacionadas a Configuração
- **Evidência:**
```text
prisma/migrations/20260731200000_notifications_automations_ai_cost/migration.sql:28:    "actionConfig" JSONB NOT NULL,
prisma/migrations/20260803120000_bitrix_connection/migration.sql:4:-- configurá-la. Mesmo padrão de GoogleWorkspaceConnection (uma conexão por organização, RLS por
prisma/migrations/20260807100000_enable_rls_remaining_tables/migration.sql:143:-- 10. AiEngineSetting — CASO DIFERENTE dos demais: é uma config global por ferramenta
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Configuração necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'config'

## DEBT-DT-16-003 - Configuração
- **Problema:** Verificação de ocorrências suspeitas de 'env' relacionadas a Configuração
- **Evidência:**
```text
prisma/migrations/20260802210000_whatsapp_message_persistence/migration.sql:2:-- whatsapp.service.ts descartava tudo — nenhuma mensagem recebida (ou enviada) ficava registrada
prisma/migrations/20260802210000_whatsapp_message_persistence/migration.sql:3:-- em lugar nenhum, mesmo com a sessão/reconexão/envio já sendo reais.
prisma/migrations/20260802213000_ai_pending_action_execution/migration.sql:3:-- real (aiPendingAction.service.ts) registrar se o envio de fato aconteceu, quando, e o motivo
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Configuração necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'env'

## DEBT-DT-16-004 - Configuração
- **Problema:** Verificação de ocorrências suspeitas de 'fallback' relacionadas a Configuração
- **Evidência:**
```text
prisma/migrations/20260922000000_backfill_legacy_brand_playbook_values/migration.sql:9:-- Todo código de leitura já trata qualquer chave desconhecida como 'geral' via fallback
prisma/schema.prisma:2901:/// agente. Variáveis de ambiente continuam funcionando como fallback (compatibilidade com
prisma/schema.prisma:2918:  /// preenche via tela, o fallback de env var ainda pode estar em uso.
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Configuração necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'fallback'

## DEBT-DT-16-005 - Configuração
- **Problema:** Verificação de ocorrências suspeitas de 'hardcoded' relacionadas a Configuração
- **Evidência:**
```text
prisma/migrations/20260914120000_voice_hub_connection_script_fields/migration.sql:1:-- VOICE-001 (auditoria multiagente, 09/2026): o roteiro da IA de voz era hardcoded no código para
prisma/migrations/20260914120000_voice_hub_connection_script_fields/migration.sql:13:-- correção (o hardcoded da Birth Hub 360) — zero mudança de comportamento no deploy para quem já está
prisma/schema.prisma:2476:// (src/features/integrations/bitrix/bitrixFieldMap.ts) é um mapa ESTÁTICO/hardcoded, único para
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Configuração necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'hardcoded'

## DEBT-DT-17-001 - Build
- **Problema:** Verificação de ocorrências suspeitas de 'build' relacionadas a Build
- **Evidência:**
```text
prisma/AGENTS.md:42:- `npm run build`
prisma/migrations/20260909110000_agent_build_proposal/migration.sql:1:-- Agent Builder / Fábrica de Agentes (PROMPT 10) — 1 tabela nova, dado de negócio por tenant
prisma/migrations/20260909110000_agent_build_proposal/migration.sql:3:-- LearningCandidate: sem cláusula de bypass_rls no USING, "AgentBuildProposal" não está no
```
- **Prioridade:** P1 - Alta
- **Impacto:** Potencial dívida técnica em Build necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'build'

## DEBT-DT-17-002 - Build
- **Problema:** Verificação de ocorrências suspeitas de 'dist' relacionadas a Build
- **Evidência:**
```text
prisma/migrations/20260802213000_ai_pending_action_execution/migration.sql:4:-- quando falhar (SMTP fora do ar etc.) — sem isso a tela não teria como distinguir "aprovado e
prisma/migrations/20260804210000_bitrix_multi_connection/migration.sql:8:-- são marcas/empresas distintas, cada uma com seu próprio Bitrix) — remove a constraint 1:1.
prisma/migrations/20260818100000_ldr_account_intelligence_foundation/migration.sql:314:    CONSTRAINT "EconomicRelationship_distinct_accounts" CHECK ("sourceCompanyId" <> "targetCompanyId"),
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Build necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'dist'

## DEBT-DT-17-004 - Build
- **Problema:** Verificação de ocorrências suspeitas de 'vite' relacionadas a Build
- **Evidência:**
```text
prisma/migrations/20260908010000_cadence_calendar_meet_link/migration.sql:1:-- Adiciona meetUrl/iCalUID a CadenceCalendarEvent (link real do Google Meet + UID do convite ICS
prisma/schema.prisma:3682:  /// o convite ICS/e-mail de confirmação enviado ao lead e ao vendedor.
prisma/schema.prisma:3684:  /// `iCalUID` devolvido pelo Google — usado como UID estável do convite ICS enviado por e-mail,
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Build necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'vite'

## DEBT-DT-17-005 - Build
- **Problema:** Verificação de ocorrências suspeitas de 'tsc' relacionadas a Build
- **Evidência:**
```text
prisma/AGENTS.md:39:- `npx tsc --noEmit`
prisma/migrations/20260717002917_init_crm_core/migration.sql:60:    "fitScore" INTEGER,
prisma/migrations/20260717183411_sprint3_5_enums_and_cleanup/migration.sql:7:  - You are about to drop the column `fitScore` on the `Lead` table. All the data in the column will be lost.
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Build necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'tsc'

## DEBT-DT-18-003 - Compatibilidade
- **Problema:** Verificação de ocorrências suspeitas de 'vendor' relacionadas a Compatibilidade
- **Evidência:**
```text
scripts/agent-import/classify.ts:241:    'vendor negotiator',
scripts/agent-import/source-data.ts:424:  'VendorNegotiator Agent',
scripts/ci/check-bundle-budget.mjs:115:    pattern: /^vendor-echarts-/,
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Compatibilidade necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'vendor'

## DEBT-DT-18-004 - Compatibilidade
- **Problema:** Verificação de ocorrências suspeitas de 'webkit' relacionadas a Compatibilidade
- **Evidência:**
```text
scripts/generate-html-manual.cjs:94:      -webkit-background-clip: text;
src/components/ui/BorderBeam.tsx:125:            '[-webkit-mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)]',
src/components/ui/BorderBeam.tsx:126:            '[-webkit-mask-composite:xor]',
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Compatibilidade necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'webkit'

## DEBT-DT-18-005 - Compatibilidade
- **Problema:** Verificação de ocorrências suspeitas de 'moz' relacionadas a Compatibilidade
- **Evidência:**
```text
src/features/intelligence/tools/marketResearchTool.ts:115:        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
src/features/knowledge/knowledge.routes.ts:186:    // https://github.com/mozilla/pdf.js/blob/master/src/shared/util.js.
src/features/prospecting/services/cnpj.util.ts:16:  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0';
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Compatibilidade necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'moz'

## DEBT-DT-19-001 - Observabilidade
- **Problema:** Verificação de ocorrências suspeitas de 'log' relacionadas a Observabilidade
- **Evidência:**
```text
prisma/migrations/20260717141021_add_lead_enrichment/migration.sql:28:CREATE TABLE "EnrichmentLog" (
prisma/migrations/20260717141021_add_lead_enrichment/migration.sql:37:    CONSTRAINT "EnrichmentLog_pkey" PRIMARY KEY ("id")
prisma/migrations/20260717141021_add_lead_enrichment/migration.sql:41:CREATE TABLE "AuditLog" (
```
- **Prioridade:** P1 - Alta
- **Impacto:** Potencial dívida técnica em Observabilidade necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'log'

## DEBT-DT-19-002 - Observabilidade
- **Problema:** Verificação de ocorrências suspeitas de 'trace' relacionadas a Observabilidade
- **Evidência:**
```text
prisma/migrations/20260918003857_elite_commercial_agent_nba/migration.sql:70:-- CreateTable "MissionAgentTrace"
prisma/migrations/20260918003857_elite_commercial_agent_nba/migration.sql:71:CREATE TABLE "MissionAgentTrace" (
prisma/migrations/20260918003857_elite_commercial_agent_nba/migration.sql:75:    "trace" JSONB NOT NULL,
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Observabilidade necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'trace'

## DEBT-DT-19-003 - Observabilidade
- **Problema:** Verificação de ocorrências suspeitas de 'metrics' relacionadas a Observabilidade
- **Evidência:**
```text
prisma/migrations/20260810120000_report_persistence/migration.sql:12:    "metrics" JSONB NOT NULL,
prisma/migrations/20260908120000_agent_runtime_execution/migration.sql:28:    "metrics" JSONB,
prisma/schema.prisma:1029:  metrics                Metric[]
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Observabilidade necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'metrics'

## DEBT-DT-19-004 - Observabilidade
- **Problema:** Verificação de ocorrências suspeitas de 'datadog' relacionadas a Observabilidade
- **Evidência:**
```text
src/lib/prisma.ts:52:// Error handling for idle clients — usa logger estruturado (não console.error) para aparecer no Pino/Datadog.
src/lib/voice-runtime/Observability.ts:26:    // In production, this would stream to DataDog, OpenTelemetry, etc.
src/shared/middlewares/observability.ts:16:// Nomes de query params que nunca podem ir pro log estruturado (Pino/Datadog) em texto puro — ex:
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Observabilidade necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'datadog'

## DEBT-DT-20-001 - Manutenção
- **Problema:** Verificação de ocorrências suspeitas de 'deprecated' relacionadas a Manutenção
- **Evidência:**
```text
prisma/migrations/20260908020000_multi_cargo_agent_governance_foundation/migration.sql:15:CREATE TYPE "AgentDefinitionStatus" AS ENUM ('CATALOG_ONLY', 'PROMPT_READY', 'SERVICE_WRAPPER', 'WORKFLOW_READY', 'PRODUCTION_READY', 'SOURCE_REQUIRED', 'DUPLICATE_ALIAS', 'BLOCKED', 'DEPRECATED');
prisma/migrations/20260908020000_multi_cargo_agent_governance_foundation/migration.sql:18:CREATE TYPE "AgentVersionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DEPRECATED');
prisma/migrations/20260908020000_multi_cargo_agent_governance_foundation/migration.sql:83:    "deprecatedAt" TIMESTAMP(3),
```
- **Prioridade:** P1 - Alta
- **Impacto:** Potencial dívida técnica em Manutenção necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'deprecated'

## DEBT-DT-20-002 - Manutenção
- **Problema:** Verificação de ocorrências suspeitas de 'legacy' relacionadas a Manutenção
- **Evidência:**
```text
prisma/schema.prisma:1920:  brand           String // playbook comercial (src/config/playbooks.ts) — hoje só 'geral' é gravável; linhas antigas com valores legados foram migradas (20260922000000_backfill_legacy_brand_playbook_values)
prisma/schema.prisma:1955:  brand            String // playbook comercial (src/config/playbooks.ts) — hoje só 'geral' é gravável; linhas antigas com valores legados foram migradas (20260922000000_backfill_legacy_brand_playbook_values)
scripts/architecture/audit-repo.cjs:588:                Legacy Enrichment Services <span class="badge partial">PARCIAL</span> <span class="icon">+</span>
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Manutenção necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'legacy'

## DEBT-DT-20-003 - Manutenção
- **Problema:** Verificação de ocorrências suspeitas de 'old' relacionadas a Manutenção
- **Evidência:**
```text
prisma/migrations/20260802180000_cold_call_run_visibility/migration.sql:1:-- Um registro por execução da campanha de prospecção fria (coldCall.service.ts).
prisma/migrations/20260802180000_cold_call_run_visibility/migration.sql:8:CREATE TABLE "ColdCallRun" (
prisma/migrations/20260802180000_cold_call_run_visibility/migration.sql:14:    "skippedCooldown" INTEGER NOT NULL DEFAULT 0,
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Manutenção necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'old'

## DEBT-DT-20-004 - Manutenção
- **Problema:** Verificação de ocorrências suspeitas de 'v1' relacionadas a Manutenção
- **Evidência:**
```text
prisma/migrations/20260821013000_market_intelligence_economic_scenario_audit/migration.sql:1:-- Market Intelligence v1.4 — cenários econômicos imutáveis e auditáveis.
prisma/migrations/20260920010000_add_playbook_insight/migration.sql:2:-- A v1 (livingPlaybook.service.ts) computava sugestões sob demanda, sem tabela própria (ver
prisma/schema.prisma:467:  // ciphertext (`enc:v1:...`), nunca texto puro, decifrado de forma transparente pela extensão do
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Manutenção necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'v1'

## DEBT-DT-20-005 - Manutenção
- **Problema:** Verificação de ocorrências suspeitas de 'archive' relacionadas a Manutenção
- **Evidência:**
```text
prisma/migrations/20260818123000_market_intelligence_companies/migration.sql:4:CREATE TYPE "MarketIntelligenceDatasetStatus" AS ENUM ('PENDING','PROCESSING','VALIDATING','READY','FAILED','ARCHIVED');
prisma/schema.prisma:24:  ARCHIVED
src/features/prospecting/outbound/components/lead-card/LeadOutreachSection.tsx:363:            <option value="archived">Arquivado</option>
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Manutenção necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'archive'

## DEBT-DT-21-001 - Disponibilidade
- **Problema:** Verificação de ocorrências suspeitas de 'health' relacionadas a Disponibilidade
- **Evidência:**
```text
prisma/migrations/20260827020000_forecast_snapshot/migration.sql:4:-- gerou). Sem isso, o pilar "Confiabilidade de Forecast" do Health Score
prisma/migrations/20260827020000_forecast_snapshot/migration.sql:5:-- (src/features/commercial-intelligence/application/healthScore.ts) nunca tem um snapshot antigo
prisma/migrations/20260902120000_copiloto_ia_foundation/migration.sql:91:CREATE TABLE "CopilotoDealHealthSnapshot" (
```
- **Prioridade:** P1 - Alta
- **Impacto:** Potencial dívida técnica em Disponibilidade necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'health'

## DEBT-DT-21-002 - Disponibilidade
- **Problema:** Verificação de ocorrências suspeitas de 'alive' relacionadas a Disponibilidade
- **Evidência:**
```text
src/features/analytics/routes/events.routes.ts:20:    Connection: 'keep-alive',
src/features/analytics/routes/events.routes.ts:22:  res.write('\n'); // keep-alive space
src/features/analytics/routes/events.routes.ts:32:  // Keep connection alive with pings every 30s
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Disponibilidade necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'alive'

## DEBT-DT-21-003 - Disponibilidade
- **Problema:** Verificação de ocorrências suspeitas de 'ping' relacionadas a Disponibilidade
- **Evidência:**
```text
prisma/migrations/20260818123000_market_intelligence_companies/migration.sql:105:CREATE TABLE "MarketIntelligenceMunicipalityMapping" (
prisma/migrations/20260818123000_market_intelligence_companies/migration.sql:113:  "mappingMethod" TEXT NOT NULL,
prisma/migrations/20260818123000_market_intelligence_companies/migration.sql:116:  CONSTRAINT "MarketIntelligenceMunicipalityMapping_pkey" PRIMARY KEY ("id")
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Disponibilidade necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'ping'

## DEBT-DT-21-004 - Disponibilidade
- **Problema:** Verificação de ocorrências suspeitas de 'timeout' relacionadas a Disponibilidade
- **Evidência:**
```text
prisma/schema.prisma:3015:  /// do próprio código (não uma URL de usuário) — chamadas usam fetchWithTimeout com allowlist
scripts/architecture/audit-repo.cjs:1087:                <td>Eliminate simulated/mocked functionality (Onda 1 directive). Replace <code>setTimeout</code> mocks with real async DB calls.</td>
scripts/capture-screens.mjs:62:  await unauthPage.waitForTimeout(1000);
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Disponibilidade necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'timeout'

## DEBT-DT-21-005 - Disponibilidade
- **Problema:** Verificação de ocorrências suspeitas de 'retry' relacionadas a Disponibilidade
- **Evidência:**
```text
prisma/schema.prisma:2347:  /// depois de um retry bem-sucedido zerar `status` para READY (auditoria: "funcionou, mas na
prisma/schema.prisma:4563:/// informado) garante que republicar o mesmo handoff (retry de rede, duplo clique) nunca cria uma
prisma/schema.prisma:4567:/// (retry seguro / no duplicate write ponta a ponta, não só neste modelo).
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Disponibilidade necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'retry'

## DEBT-DT-22-001 - Recuperação
- **Problema:** Verificação de ocorrências suspeitas de 'backup' relacionadas a Recuperação
- **Evidência:**
```text
prisma/AGENTS.md:33:  backup). Migration nova classificada como destrutiva ganha um bloco `-- ROLLBACK:` comentado no
scripts/backup.sh:9:BACKUP_DIR="./backups"
scripts/backup.sh:11:FILENAME="$BACKUP_DIR/prospectordb_backup_$TIMESTAMP.sql"
```
- **Prioridade:** P1 - Alta
- **Impacto:** Potencial dívida técnica em Recuperação necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'backup'

## DEBT-DT-22-002 - Recuperação
- **Problema:** Verificação de ocorrências suspeitas de 'restore' relacionadas a Recuperação
- **Evidência:**
```text
prisma/AGENTS.md:32:  `prisma migrate resolve --rolled-back`, e o que fazer quando não há solução mágica: restore de
scripts/backup/run-backup-restore-drill.ts:24:    restoreDurationMs: number;
scripts/backup/run-backup-restore-drill.ts:28:    tableCounts: Array<{ table: string; original: number; restored: number; match: boolean }>;
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Recuperação necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'restore'

## DEBT-DT-22-003 - Recuperação
- **Problema:** Verificação de ocorrências suspeitas de 'dump' relacionadas a Recuperação
- **Evidência:**
```text
scripts/backup.sh:17:# Executa pg_dump local ou via container birthhub_postgres se o binário local não existir
scripts/backup.sh:18:if command -v pg_dump >/dev/null 2>&1; then
scripts/backup.sh:19:  PGPASSWORD=$POSTGRES_PASSWORD pg_dump -h localhost -p ${POSTGRES_PORT:-5434} -U ${POSTGRES_USER:-prospector} ${POSTGRES_DB:-prospectordb} --clean --if-exists --no-owner --no-privileges > "$FILENAME"
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Recuperação necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'dump'

## DEBT-DT-22-004 - Recuperação
- **Problema:** Verificação de ocorrências suspeitas de 'snapshot' relacionadas a Recuperação
- **Evidência:**
```text
prisma/migrations/20260816120000_cadence_scheduling_signature/migration.sql:236:    "snapshot" JSONB NOT NULL,
prisma/migrations/20260818100000_ldr_account_intelligence_foundation/migration.sql:7:CREATE TYPE "IntelligenceSnapshotStatus" AS ENUM ('Complete', 'Partial', 'Failed', 'Stale');
prisma/migrations/20260818100000_ldr_account_intelligence_foundation/migration.sql:18:CREATE TABLE "AccountIntelligenceSnapshot" (
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Recuperação necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'snapshot'

## DEBT-DT-22-005 - Recuperação
- **Problema:** Verificação de ocorrências suspeitas de 'disaster' relacionadas a Recuperação
- **Evidência:**
```text
prisma/migrations/20260908090000_public_booking_link_create_and_rls/migration.sql:10:-- criado do zero a partir só das migrations versionadas (CI, staging limpo, disaster recovery)
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Recuperação necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'disaster'

## DEBT-DT-23-001 - Desempenho
- **Problema:** Verificação de ocorrências suspeitas de 'slow' relacionadas a Desempenho
- **Evidência:**
```text
scripts/generate-html-manual.cjs:438:          <p><strong>Durações:</strong> instant (100ms), fast (150ms), normal (250ms), slow (350ms), slowest (500ms).</p>
src/components/ui/HolographicCard.tsx:61:        <div className="absolute inset-0 bg-[linear-gradient(transparent_49%,rgba(255,255,255,0.1)_50%,transparent_51%)] bg-[length:100%_4px] animate-pulse-slow" />
src/components/ui/TechToolLogo.tsx:360:          className="w-3.5 h-3.5 animate-spin-slow"
```
- **Prioridade:** P1 - Alta
- **Impacto:** Potencial dívida técnica em Desempenho necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'slow'

## DEBT-DT-23-002 - Desempenho
- **Problema:** Verificação de ocorrências suspeitas de 'optimize' relacionadas a Desempenho
- **Evidência:**
```text
scripts/agent-import/classify.ts:123:    'pricing optimizer',
scripts/agent-import/classify.ts:185:    'tiering optimizer',
scripts/agent-import/classify.ts:243:    'tax optimizer',
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Desempenho necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'optimize'

## DEBT-DT-23-003 - Desempenho
- **Problema:** Verificação de ocorrências suspeitas de 'cache' relacionadas a Desempenho
- **Evidência:**
```text
prisma/schema.prisma:4219:  /// duplicar a decisão em dois lugares (o service deriva de `actionType`, este campo é só cache
scripts/architecture/audit-repo.cjs:579:            <li><strong>Data Enrichment Caching:</strong> Strict 24-hour cache window (via <code>enrichedAt</code> on Company model) to minimize third-party API costs. (<span class="badge implemented">IMPLEMENTADO</span>)</li>
scripts/architecture/audit-repo.cjs:704:                <td><strong>Cache & Queues</strong></td>
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Desempenho necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'cache'

## DEBT-DT-23-004 - Desempenho
- **Problema:** Verificação de ocorrências suspeitas de 'memo' relacionadas a Desempenho
- **Evidência:**
```text
prisma/migrations/20260720235926_sync_accumulated_schema_drift/migration.sql:140:CREATE TABLE "AgentMemory" (
prisma/migrations/20260720235926_sync_accumulated_schema_drift/migration.sql:147:    CONSTRAINT "AgentMemory_pkey" PRIMARY KEY ("id")
prisma/migrations/20260720235926_sync_accumulated_schema_drift/migration.sql:213:CREATE INDEX "AgentMemory_sessionId_idx" ON "AgentMemory"("sessionId");
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Desempenho necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'memo'

## DEBT-DT-23-005 - Desempenho
- **Problema:** Verificação de ocorrências suspeitas de 'lazy' relacionadas a Desempenho
- **Evidência:**
```text
scripts/architecture/audit-repo.cjs:930:            <li><strong>Loading States:</strong> React Suspense and skeletons are used for lazy-loaded modules.</li>
scripts/ci/check-bundle-budget.mjs:18: *      `React.lazy` + carregamento condicional (ver App.tsx) para nunca entrarem no caminho
scripts/ci/check-bundle-budget.mjs:59:    reason: 'exceljs (geracao de planilha) — lazy, so no fluxo de exportacao, nao no load inicial.',
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Desempenho necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'lazy'

## DEBT-DT-24-001 - Cache
- **Problema:** Verificação de ocorrências suspeitas de 'redis' relacionadas a Cache
- **Evidência:**
```text
prisma/schema.prisma:1024:  /// acumulado do mês corrente (Redis, ver providerBudget.ts) por assertProspectingBudgetNotExceeded.
scripts/agent-import/data/prompts.catalog.json:694:    "description": "Recomenda a redistribuição de carga de trabalho entre membros do time com base em capacidade disponível.",
scripts/agent-import/data/prompts.catalog.json:695:    "systemPrompt": "Você é o ResourceBalancer, especialista em recomendar redistribuição de carga de trabalho. Sua missão é propor um balanceamento justo com base em capacidade real disponível, não uma divisão igual que ignora diferença de complexidade entre tarefas."
```
- **Prioridade:** P1 - Alta
- **Impacto:** Potencial dívida técnica em Cache necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'redis'

## DEBT-DT-24-003 - Cache
- **Problema:** Verificação de ocorrências suspeitas de 'ttl' relacionadas a Cache
- **Evidência:**
```text
scripts/agent-import/classify.ts:161:    'process bottleneck',
scripts/agent-import/classify.ts:345:    'bottleneck detector',
scripts/agent-import/data/prompts.catalog.json:673:    "name": "ProcessBottleneckAlerter Agent",
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Cache necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'ttl'

## DEBT-DT-24-004 - Cache
- **Problema:** Verificação de ocorrências suspeitas de 'expire' relacionadas a Cache
- **Evidência:**
```text
prisma/migrations/20260720235926_sync_accumulated_schema_drift/migration.sql:58:    "expiresAt" TIMESTAMP(3) NOT NULL,
prisma/migrations/20260720235926_sync_accumulated_schema_drift/migration.sql:78:    "accessTokenExpiresAt" TIMESTAMP(3),
prisma/migrations/20260720235926_sync_accumulated_schema_drift/migration.sql:79:    "refreshTokenExpiresAt" TIMESTAMP(3),
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Cache necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'expire'

## DEBT-DT-24-005 - Cache
- **Problema:** Verificação de ocorrências suspeitas de 'invalidate' relacionadas a Cache
- **Evidência:**
```text
src/features/cadence/dialer/infrastructure/threecx/ThreeCxAuthClient.ts:108:  invalidateCache(): void {
src/features/cadence/dialer/infrastructure/threecx/ThreeCxCallControlClient.ts:136:      this.authClient.invalidateCache();
src/features/module-access/components/ModuleAccessAdmin.tsx:4:import { invalidateModuleAccessCache } from '../../../hooks/useModuleAccess.js';
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Cache necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'invalidate'

## DEBT-DT-25-001 - Filas e eventos
- **Problema:** Verificação de ocorrências suspeitas de 'queue' relacionadas a Filas e eventos
- **Evidência:**
```text
prisma/migrations/20260808120000_ai_autonomy_action_lifecycle/migration.sql:23:CREATE INDEX IF NOT EXISTS "AIPendingAction_autonomy_queue_idx"
prisma/migrations/20260815020000_bitrix_extraction_run/migration.sql:10:CREATE TYPE "BitrixExtractionStatus" AS ENUM ('queued', 'running', 'completed', 'failed', 'cancelled');
prisma/migrations/20260815020000_bitrix_extraction_run/migration.sql:21:    "status" "BitrixExtractionStatus" NOT NULL DEFAULT 'queued',
```
- **Prioridade:** P1 - Alta
- **Impacto:** Potencial dívida técnica em Filas e eventos necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'queue'

## DEBT-DT-25-002 - Filas e eventos
- **Problema:** Verificação de ocorrências suspeitas de 'bull' relacionadas a Filas e eventos
- **Evidência:**
```text
prisma/migrations/20260801120000_tenant_scope_ai_memory_prompts_and_rls/migration.sql:12:-- create() disparado de dentro de um worker do BullMQ sem contexto de requisição (AIPendingAction,
prisma/migrations/20260802180000_cold_call_run_visibility/migration.sql:5:-- dentro do worker do BullMQ (sem request HTTP), sob requestContext.run({ tenantId }) — mesmo
prisma/migrations/20260807100000_enable_rls_remaining_tables/migration.sql:11:-- ser escritas fora do ciclo normal de request (worker/BullMQ/webhook), pelo mesmo motivo
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Filas e eventos necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'bull'

## DEBT-DT-25-005 - Filas e eventos
- **Problema:** Verificação de ocorrências suspeitas de 'sqs' relacionadas a Filas e eventos
- **Evidência:**
```text
src/features/prospecting/services/brazilPublicCnpj.service.ts:45:  sociosQsa: Array<{
src/features/prospecting/services/brazilPublicCnpj.service.ts:115:    const decisionMakers: DecisionMaker[] = data.sociosQsa.map((s) => ({
src/features/prospecting/services/brazilPublicCnpj.service.ts:184:    const sociosQsa = (json.qsa || []).map((q: any) => ({
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Filas e eventos necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'sqs'

## DEBT-DT-26-001 - Custos cloud
- **Problema:** Verificação de ocorrências suspeitas de 'cost' relacionadas a Custos cloud
- **Evidência:**
```text
prisma/migrations/20260720235926_sync_accumulated_schema_drift/migration.sql:154:    "cost" DOUBLE PRECISION NOT NULL,
prisma/migrations/20260808183000_crm_suite_parity/migration.sql:124:  "cost" DOUBLE PRECISION,
prisma/migrations/20260821013000_market_intelligence_economic_scenario_audit/migration.sql:30:    "monthlyFixedCost" DOUBLE PRECISION NOT NULL,
```
- **Prioridade:** P1 - Alta
- **Impacto:** Potencial dívida técnica em Custos cloud necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'cost'

## DEBT-DT-26-002 - Custos cloud
- **Problema:** Verificação de ocorrências suspeitas de 'billing' relacionadas a Custos cloud
- **Evidência:**
```text
prisma/migrations/20260913120000_stripe_webhook_secret/migration.sql:1:-- BILLING-007 (Onda 5): webhook de ENTRADA do Stripe — segredo de assinatura por conexão (vem DA
prisma/migrations/20260913150000_fatura_stripe_reconciliation/migration.sql:1:-- BILLING-003 (Onda 5): vínculo real entre uma Fatura (CrmCommercialDocument) e uma cobrança
prisma/migrations/20260924000000_voice_hub_models/migration.sql:174:    "billingInterval" TEXT NOT NULL,
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Custos cloud necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'billing'

## DEBT-DT-26-003 - Custos cloud
- **Problema:** Verificação de ocorrências suspeitas de 'expensive' relacionadas a Custos cloud
- **Evidência:**
```text
src/lib/voice-hub/routes/agent.routes.ts:30:// and it's also the most expensive of the three (decodes a base64 buffer + runs a ClamAV scan per
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Custos cloud necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'expensive'

## DEBT-DT-26-004 - Custos cloud
- **Problema:** Verificação de ocorrências suspeitas de 'tier' relacionadas a Custos cloud
- **Evidência:**
```text
prisma/migrations/20260818123000_market_intelligence_companies/migration.sql:5:CREATE TYPE "MarketIntelligenceIcpTier" AS ENUM ('MUITO_ALTO','ALTO','MEDIO','BAIXO','FORA_DO_ICP');
prisma/migrations/20260818123000_market_intelligence_companies/migration.sql:86:  "icpTier" "MarketIntelligenceIcpTier",
prisma/migrations/20260818123000_market_intelligence_companies/migration.sql:130:CREATE INDEX "MarketIntelligenceCompany_datasetId_municipioIbge_icpTier_idx" ON "MarketIntelligenceCompany"("datasetId","municipioIbge","icpTier");
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Custos cloud necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'tier'

## DEBT-DT-26-005 - Custos cloud
- **Problema:** Verificação de ocorrências suspeitas de 'plan' relacionadas a Custos cloud
- **Evidência:**
```text
prisma/migrations/20260801120000_tenant_scope_ai_memory_prompts_and_rls/migration.sql:93:-- Achado à parte, fora do escopo de DB-001/DB-002 (registrado em 08-PLANO-DE-SEGURANCA.md e
prisma/migrations/20260821150000_search_indexes_company_contact/migration.sql:1:-- Fase 1 do plano "melhorar busca": índices ausentes nos campos usados pela busca
prisma/migrations/20260823120000_playbook_matrix_items/migration.sql:73:-- brandMatrices.ts (decisão tomada com o usuário no planejamento da Fase 4). Semeado para TODA
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Custos cloud necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'plan'

## DEBT-DT-27-001 - FinOps
- **Problema:** Verificação de ocorrências suspeitas de 'budget' relacionadas a FinOps
- **Evidência:**
```text
prisma/migrations/20260802230000_conversation_signal/migration.sql:13:    "budgetMentioned" BOOLEAN NOT NULL DEFAULT false,
prisma/migrations/20260827200000_drop_dead_ai_governance_models/migration.sql:5:-- separada (ver src/lib/ai/budget.ts, guardrails.service.ts). Usuário decidiu remover em vez de
prisma/migrations/20260827210000_onda42_decisoes_schema/migration.sql:6:--   03-para-00-campo-orcamento-organization.md  (DEC-09 — Organization.monthly*BudgetUsd)
```
- **Prioridade:** P1 - Alta
- **Impacto:** Potencial dívida técnica em FinOps necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'budget'

## DEBT-DT-27-002 - FinOps
- **Problema:** Verificação de ocorrências suspeitas de 'alert' relacionadas a FinOps
- **Evidência:**
```text
prisma/migrations/20260731200000_notifications_automations_ai_cost/migration.sql:16:CREATE TYPE "NotificationKind" AS ENUM ('Info', 'Sucesso', 'Alerta', 'Erro');
prisma/schema.prisma:2044:  Alerta
prisma/schema.prisma:2963:/// Conexão do Slack de uma organização — usada para enviar notificações/alertas (ex.: negócio
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em FinOps necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'alert'

## DEBT-DT-27-003 - FinOps
- **Problema:** Verificação de ocorrências suspeitas de 'spend' relacionadas a FinOps
- **Evidência:**
```text
scripts/agent-import/classify.ts:242:    'spend controller',
scripts/agent-import/source-data.ts:394:  'CloudSpendOptimizer Agent',
scripts/agent-import/source-data.ts:420:  'SpendController Agent',
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em FinOps necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'spend'

## DEBT-DT-27-004 - FinOps
- **Problema:** Verificação de ocorrências suspeitas de 'forecast' relacionadas a FinOps
- **Evidência:**
```text
prisma/migrations/20260810120000_commercial_intelligence_goals_and_stage_history/migration.sql:7:-- Gestor/Admin (nunca inferida) para permitir "% da Meta"/Gap Forecast/Coverage sem fabricar
prisma/migrations/20260827020000_forecast_snapshot/migration.sql:2:-- .agents/handoffs/onda-39/04-para-01-schema-forecast-snapshot.md): persistência real do
prisma/migrations/20260827020000_forecast_snapshot/migration.sql:3:-- snapshot semanal do Forecast (Commit/Best Case/Forecast por período + versão das regras que o
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em FinOps necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'forecast'

## DEBT-DT-27-005 - FinOps
- **Problema:** Verificação de ocorrências suspeitas de 'usage' relacionadas a FinOps
- **Evidência:**
```text
prisma/migrations/20260801120000_tenant_scope_ai_memory_prompts_and_rls/migration.sql:95:-- IS NULL`, então os registros "não atribuídos" que usage.service.ts soma para qualquer tenant
prisma/migrations/20260813230000_fix_ailog_rls_unattributed_internal_writes/migration.sql:4:-- request HTTP (scripts, workers e verificadores) chegam a `logAiUsage()` sem tenant no
scripts/architecture/audit-repo.cjs:994:                <th>Usage</th>
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em FinOps necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'usage'

## DEBT-DT-28-001 - Billing
- **Problema:** Verificação de ocorrências suspeitas de 'stripe' relacionadas a Billing
- **Evidência:**
```text
prisma/migrations/20260912130000_slack_stripe_omie_connections/migration.sql:1:-- Conexões de Slack, Stripe e Omie por organização — mesmo padrão de VoiceHubConnection/
prisma/migrations/20260912130000_slack_stripe_omie_connections/migration.sql:36:CREATE TABLE "StripeConnection" (
prisma/migrations/20260912130000_slack_stripe_omie_connections/migration.sql:39:    "label" TEXT NOT NULL DEFAULT 'Stripe',
```
- **Prioridade:** P1 - Alta
- **Impacto:** Potencial dívida técnica em Billing necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'stripe'

## DEBT-DT-28-002 - Billing
- **Problema:** Verificação de ocorrências suspeitas de 'invoice' relacionadas a Billing
- **Evidência:**
```text
scripts/agent-import/classify.ts:211:    'invoice',
scripts/agent-import/classify.ts:448:  'invoice',
scripts/agent-import/source-data.ts:409:  'InvoiceGenerator Agent',
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Billing necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'invoice'

## DEBT-DT-28-003 - Billing
- **Problema:** Verificação de ocorrências suspeitas de 'payment' relacionadas a Billing
- **Evidência:**
```text
prisma/migrations/20260816120000_cadence_scheduling_signature/migration.sql:308:CREATE TYPE "DealClosureEventType" AS ENUM ('SignatureCompleted', 'PaymentConfirmed', 'ManualCrmConfirmation');
prisma/migrations/20260913150000_fatura_stripe_reconciliation/migration.sql:3:-- reconcileFaturaStripePayment/PrismaCrm360Repository.updateDocumentStatus). `stripeConnectionId`
prisma/migrations/20260913150000_fatura_stripe_reconciliation/migration.sql:5:-- Fatura foi paga. Unique em (organizationId, stripePaymentIntentId) impede a mesma cobrança
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Billing necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'payment'

## DEBT-DT-28-004 - Billing
- **Problema:** Verificação de ocorrências suspeitas de 'credit' relacionadas a Billing
- **Evidência:**
```text
prisma/schema.prisma:5426:  amountCents       Int // signed: positive = credit, negative = debit
scripts/agent-import/classify.ts:221:    'credit hold',
scripts/agent-import/classify.ts:222:    'credit limit',
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Billing necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'credit'

## DEBT-DT-28-005 - Billing
- **Problema:** Verificação de ocorrências suspeitas de 'subscription' relacionadas a Billing
- **Evidência:**
```text
scripts/architecture/audit-repo.cjs:570:                <td><strong>Billing & Wallets</strong><br>Subscription and credit tracking</td>
src/features/integrations/hubspot/hubspot.service.ts:139:          { eventId: event.eventId, type: event.subscriptionType },
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Billing necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'subscription'

## DEBT-DT-29-001 - Onboarding
- **Problema:** Verificação de ocorrências suspeitas de 'tenant' relacionadas a Onboarding
- **Evidência:**
```text
prisma/AGENTS.md:35:- testes de tenant/RBAC/dados relevantes passam.
prisma/migrations/20260717141021_add_lead_enrichment/migration.sql:47:    "tenantId" TEXT,
prisma/migrations/20260717141021_add_lead_enrichment/migration.sql:59:CREATE INDEX "AuditLog_tenantId_entity_action_idx" ON "AuditLog"("tenantId", "entity", "action");
```
- **Prioridade:** P1 - Alta
- **Impacto:** Potencial dívida técnica em Onboarding necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'tenant'

## DEBT-DT-29-002 - Onboarding
- **Problema:** Verificação de ocorrências suspeitas de 'signup' relacionadas a Onboarding
- **Evidência:**
```text
prisma/migrations/20260807100000_enable_rls_remaining_tables/migration.sql:19:-- IMPORTANTE antes de aplicar em produção: testar o fluxo de login/signup/reset de senha
scripts/create-temp-audit-user.ts:11:    const res = await auth.api.signUpEmail({
scripts/visual-capture-agent.ts:69:    await page.goto(`${BASE_URL}/login?signup=1`);
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Onboarding necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'signup'

## DEBT-DT-29-003 - Onboarding
- **Problema:** Verificação de ocorrências suspeitas de 'register' relacionadas a Onboarding
- **Evidência:**
```text
scripts/architecture/audit-repo.cjs:901:  ├─ /register (Sign Up)
src/bootstrap/observability.ts:37:      res.set('Content-Type', client.register.contentType);
src/bootstrap/observability.ts:38:      res.end(await client.register.metrics());
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Onboarding necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'register'

## DEBT-DT-29-004 - Onboarding
- **Problema:** Verificação de ocorrências suspeitas de 'welcome' relacionadas a Onboarding
- **Evidência:**
```text
scripts/agent-import/classify.ts:271:    'welcome sequencer',
scripts/agent-import/data/prompts.catalog.json:258:    "name": "WelcomeSequencer Agent",
scripts/agent-import/data/prompts.catalog.json:260:    "systemPrompt": "Você é o WelcomeSequencer, especialista em estruturar sequências de boas-vindas. Sua missão é ordenar os primeiros passos do cliente novo de forma que cada contato prepare o próximo, sem sobrecarregar o cliente com tudo de uma vez na primeira semana."
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Onboarding necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'welcome'

## DEBT-DT-29-005 - Onboarding
- **Problema:** Verificação de ocorrências suspeitas de 'invite' relacionadas a Onboarding
- **Evidência:**
```text
src/components/Intelligence.tsx:50:  | 'linkedin_invite'
src/components/Intelligence.tsx:113:    id: 'linkedin_invite',
src/features/cadence/infra/PrismaCalendarSchedulerPort.ts:4:import { buildMeetingInviteEmail } from '../../../lib/email/meetingInvite.js';
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Onboarding necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'invite'

## DEBT-DT-30-001 - Identidade e permissões
- **Problema:** Verificação de ocorrências suspeitas de 'role' relacionadas a Identidade e permissões
- **Evidência:**
```text
prisma/migrations/20260716232635_init/migration.sql:2:CREATE TYPE "Role" AS ENUM ('ADMINISTRADOR', 'GESTOR_COMERCIAL', 'SDR', 'CLOSER', 'VISUALIZADOR');
prisma/migrations/20260716232635_init/migration.sql:20:    "role" "Role" NOT NULL DEFAULT 'VISUALIZADOR',
prisma/migrations/20260717002917_init_crm_core/migration.sql:36:    "role" TEXT,
```
- **Prioridade:** P1 - Alta
- **Impacto:** Potencial dívida técnica em Identidade e permissões necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'role'

## DEBT-DT-30-002 - Identidade e permissões
- **Problema:** Verificação de ocorrências suspeitas de 'permission' relacionadas a Identidade e permissões
- **Evidência:**
```text
prisma/migrations/20260908040000_capability_permission_engine/migration.sql:1:-- Capability & Permission Engine (PROMPT 3).
prisma/schema.prisma:3998:/// Nível de risco de uma capability — PROMPT 3 (Capability & Permission Engine). Reutilizado por
prisma/schema.prisma:4178:// Capability & Permission Engine (PROMPT 3) — camada canônica que responde "qual usuário pode
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Identidade e permissões necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'permission'

## DEBT-DT-30-003 - Identidade e permissões
- **Problema:** Verificação de ocorrências suspeitas de 'grant' relacionadas a Identidade e permissões
- **Evidência:**
```text
prisma/migrations/20260902120000_copiloto_ia_foundation/migration.sql:8:CREATE TYPE "CopilotoConsentStatus" AS ENUM ('PENDING', 'GRANTED', 'DECLINED', 'NOT_REQUIRED');
prisma/migrations/20260902120000_copiloto_ia_foundation/migration.sql:110:    "grantedAt" TIMESTAMP(3),
prisma/migrations/20260907120000_module_access_grant/migration.sql:2:CREATE TABLE "ModuleAccessGrant" (
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Identidade e permissões necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'grant'

## DEBT-DT-30-004 - Identidade e permissões
- **Problema:** Verificação de ocorrências suspeitas de 'deny' relacionadas a Identidade e permissões
- **Evidência:**
```text
prisma/migrations/20260909020000_cross_role_authorization_approvals/migration.sql:114:-- autenticada (POST /api/access-requests, .../approve, .../deny, .../revoke), sempre com tenant já
src/features/job-roles/routes/accessRequest.routes.ts:121:const denySchema = z.object({ notes: z.string().trim().max(2000).optional() });
src/features/job-roles/routes/accessRequest.routes.ts:124:  '/:id/deny',
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Identidade e permissões necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'deny'

## DEBT-DT-30-005 - Identidade e permissões
- **Problema:** Verificação de ocorrências suspeitas de 'rbac' relacionadas a Identidade e permissões
- **Evidência:**
```text
prisma/AGENTS.md:35:- testes de tenant/RBAC/dados relevantes passam.
prisma/schema.prisma:1170:// evita ambiguidade de RBAC, sem por/dono de view de outro, sem necessidade comprovada ainda).
prisma/schema.prisma:3185:  /// mesmo usuário já responsável pelo RBAC de /pending/:id (ver pending-actions.service.ts).
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Identidade e permissões necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'rbac'

## DEBT-DT-31-001 - Analytics
- **Problema:** Verificação de ocorrências suspeitas de 'event' relacionadas a Analytics
- **Evidência:**
```text
prisma/migrations/20260717002917_init_crm_core/migration.sql:94:CREATE TABLE "TimelineEvent" (
prisma/migrations/20260717002917_init_crm_core/migration.sql:101:    CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
prisma/migrations/20260717002917_init_crm_core/migration.sql:129:ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```
- **Prioridade:** P1 - Alta
- **Impacto:** Potencial dívida técnica em Analytics necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'event'

## DEBT-DT-31-002 - Analytics
- **Problema:** Verificação de ocorrências suspeitas de 'track' relacionadas a Analytics
- **Evidência:**
```text
prisma/migrations/20260815120000_opt_out_record/migration.sql:5:-- (cadência multicanal, reply tracking, agendamento, proposta/assinatura) ficam para quem
prisma/migrations/20260816120000_cadence_scheduling_signature/migration.sql:6:-- Item 3: reply tracking de e-mail (coluna ConversationSignal.channel + tabela EmailMessage).
prisma/migrations/20260816120000_cadence_scheduling_signature/migration.sql:143:-- ─── Item 3: Reply tracking de e-mail ───────────────────────────────────────────────────────
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Analytics necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'track'

## DEBT-DT-31-005 - Analytics
- **Problema:** Verificação de ocorrências suspeitas de 'ga' relacionadas a Analytics
- **Evidência:**
```text
prisma/AGENTS.md:30:- rollback/compatibilidade foi considerada — siga o processo real em
prisma/AGENTS.md:33:  backup). Migration nova classificada como destrutiva ganha um bloco `-- ROLLBACK:` comentado no
prisma/AGENTS.md:37:## Gate mínimo
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Analytics necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'ga'

## DEBT-DT-32-002 - Internacionalização
- **Problema:** Verificação de ocorrências suspeitas de 'locale' relacionadas a Internacionalização
- **Evidência:**
```text
scripts/agent-import/build-normalized-catalog.ts:284:    agents: agents.sort((a, b) => a.code.localeCompare(b.code)),
scripts/architecture/generate-known-violations-baseline.mjs:57:    return keyA.localeCompare(keyB);
scripts/generate-handoffs-checklist.cjs:33:const generated = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Internacionalização necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'locale'

## DEBT-DT-32-003 - Internacionalização
- **Problema:** Verificação de ocorrências suspeitas de 'translate' relacionadas a Internacionalização
- **Evidência:**
```text
scripts/architecture/audit-repo.cjs:151:      transform: translateY(-2px);
scripts/update_dashboard.py:75:      <div className={`absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 shadow-xl whitespace-nowrap ${isAtlas ? 'bg-atlas-orange' : 'bg-birthhub360-blue'}`}>
scripts/update_dashboard.py:77:        <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 ${isAtlas ? 'bg-atlas-orange' : 'bg-birthhub360-blue'}`} />
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Internacionalização necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'translate'

## DEBT-DT-32-004 - Internacionalização
- **Problema:** Verificação de ocorrências suspeitas de 'currency' relacionadas a Internacionalização
- **Evidência:**
```text
prisma/migrations/20260808183000_crm_suite_parity/migration.sql:76:  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'BRL',
prisma/migrations/20260808183000_crm_suite_parity/migration.sql:90:  "currency" TEXT NOT NULL DEFAULT 'BRL',
prisma/migrations/20260808183000_crm_suite_parity/migration.sql:125:  "currency" TEXT NOT NULL DEFAULT 'BRL',
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Internacionalização necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'currency'

## DEBT-DT-32-005 - Internacionalização
- **Problema:** Verificação de ocorrências suspeitas de 'timezone' relacionadas a Internacionalização
- **Evidência:**
```text
scripts/generate-handoffs-checklist.cjs:33:const generated = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
src/config/env.ts:194:    SDR_CALL_TIMEZONE: z.string().default('America/Sao_Paulo'),
src/features/activities/AGENTS.md:25:- campos, filtros, owners, timezone e tenant estão corretos e testados.
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Internacionalização necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'timezone'

## DEBT-DT-33-001 - SEO
- **Problema:** Verificação de ocorrências suspeitas de 'meta' relacionadas a SEO
- **Evidência:**
```text
prisma/migrations/20260720235926_sync_accumulated_schema_drift/migration.sql:121:    "metadata" JSONB,
prisma/migrations/20260722025537_enable_rls_auto/migration.sql:17:    "metadata" JSONB,
prisma/migrations/20260731170000_knowledge_base_tenant_scope/migration.sql:1:-- Base de Conhecimento: escopo por tenant + metadados de origem.
```
- **Prioridade:** P1 - Alta
- **Impacto:** Potencial dívida técnica em SEO necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'meta'

## DEBT-DT-33-002 - SEO
- **Problema:** Verificação de ocorrências suspeitas de 'title' relacionadas a SEO
- **Evidência:**
```text
prisma/migrations/20260720235926_sync_accumulated_schema_drift/migration.sql:120:    "title" TEXT NOT NULL,
prisma/migrations/20260722025537_enable_rls_auto/migration.sql:4:    "title" TEXT NOT NULL,
prisma/migrations/20260731200000_notifications_automations_ai_cost/migration.sql:48:    "title" TEXT NOT NULL,
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em SEO necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'title'

## DEBT-DT-33-003 - SEO
- **Problema:** Verificação de ocorrências suspeitas de 'description' relacionadas a SEO
- **Evidência:**
```text
prisma/migrations/20260717002917_init_crm_core/migration.sql:97:    "description" TEXT NOT NULL,
prisma/migrations/20260808183000_crm_suite_parity/migration.sql:118:  "description" TEXT,
prisma/migrations/20260815030000_feature_flags_and_bug_reports/migration.sql:9:    "description" TEXT NOT NULL,
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em SEO necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'description'

## DEBT-DT-33-004 - SEO
- **Problema:** Verificação de ocorrências suspeitas de 'og:' relacionadas a SEO
- **Evidência:**
```text
prisma/migrations/20261013120000_external_crm_entity_links_stage_mapping/migration.sql:6:-- - ExternalCrmSyncLog: entityType + payloadHash + índice (connectionId, externalEntityId) — decisão 00.
scripts/security/dependency-inventory.ts:94:export function parseDeprecatedFromLog(log: string): DeprecatedRow[] {
scripts/security/dependency-inventory.ts:127:  hadLog: boolean,
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em SEO necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'og:'

## DEBT-DT-34-002 - Mobile e PWA
- **Problema:** Verificação de ocorrências suspeitas de 'manifest' relacionadas a Mobile e PWA
- **Evidência:**
```text
prisma/migrations/20260818123000_market_intelligence_companies/migration.sql:26:  "outputManifest" JSONB,
prisma/schema.prisma:330:  outputManifest  Json?
scripts/emergency-reset-all-passwords.ts:23:  // em um manifesto antigo) transforme uma chamada acidental ao script em outro reset global.
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Mobile e PWA necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'manifest'

## DEBT-DT-34-003 - Mobile e PWA
- **Problema:** Verificação de ocorrências suspeitas de 'offline' relacionadas a Mobile e PWA
- **Evidência:**
```text
scripts/generate-handoffs-checklist.cjs:1:// Inventário offline: status declarado nunca equivale a aprovação independente.
scripts/generate-html-manual.cjs:389:          <p>Ambas self-hosted em public/fonts/ para funcionar offline no Android via Capacitor.</p>
scripts/migration/verify-migration-readiness.mjs:264:      warn('services', `${svc.name} offline em 127.0.0.1:${svc.port} (inicie via docker compose quando aplicável)`);
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Mobile e PWA necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'offline'

## DEBT-DT-34-004 - Mobile e PWA
- **Problema:** Verificação de ocorrências suspeitas de 'touch' relacionadas a Mobile e PWA
- **Evidência:**
```text
prisma/migrations/20260816120000_cadence_scheduling_signature/migration.sql:5:-- Item 2: cadência multicanal (CadenceSequence/CadenceRun/CadenceTouchAttempt).
prisma/migrations/20260816120000_cadence_scheduling_signature/migration.sql:26:CREATE TYPE "CadenceTouchResult" AS ENUM ('Sent', 'Failed', 'Skipped');
prisma/migrations/20260816120000_cadence_scheduling_signature/migration.sql:34:    "touches" JSONB NOT NULL,
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Mobile e PWA necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'touch'

## DEBT-DT-34-005 - Mobile e PWA
- **Problema:** Verificação de ocorrências suspeitas de 'responsive' relacionadas a Mobile e PWA
- **Evidência:**
```text
scripts/architecture/audit-repo.cjs:1000:                <td>Utility-first styling, design tokens, responsive breakpoints, dark/light mode execution.</td>
src/features/analytics/components/GlowChart.tsx:8:  ResponsiveContainer,
src/features/analytics/components/GlowChart.tsx:164:              <ResponsiveContainer width="100%" height="100%">
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Mobile e PWA necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'responsive'

## DEBT-DT-35-001 - Notificações
- **Problema:** Verificação de ocorrências suspeitas de 'email' relacionadas a Notificações
- **Evidência:**
```text
prisma/migrations/20260716232635_init/migration.sql:17:    "email" TEXT NOT NULL,
prisma/migrations/20260716232635_init/migration.sql:32:CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
prisma/migrations/20260717002917_init_crm_core/migration.sql:17:    "emails" TEXT[],
```
- **Prioridade:** P1 - Alta
- **Impacto:** Potencial dívida técnica em Notificações necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'email'

## DEBT-DT-35-002 - Notificações
- **Problema:** Verificação de ocorrências suspeitas de 'sms' relacionadas a Notificações
- **Evidência:**
```text
src/components/ui/AIEmailGenerator.tsx:522:          Mensagem (WhatsApp / SMS)
src/features/crm/application/LeadUseCases.ts:302:      'Telefone de SMS Marketing',
src/features/intelligence/routes/__tests__/ai-suite.routes.validation.test.ts:281:      channel: 'sms',
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Notificações necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'sms'

## DEBT-DT-35-003 - Notificações
- **Problema:** Verificação de ocorrências suspeitas de 'push' relacionadas a Notificações
- **Evidência:**
```text
prisma/AGENTS.md:18:- Não usar `prisma db push` como solução de produção.
prisma/migrations/20260808120000_ai_autonomy_action_lifecycle/migration.sql:4:-- `db push`/hotfix antes do histórico do Prisma ser reconciliado. As operações abaixo são
prisma/migrations/20260827145000_create_saved_search_if_missing/migration.sql:4:-- pré-existente, não introduzido nesta onda (provavelmente criada via `prisma db push` antes da
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Notificações necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'push'

## DEBT-DT-35-004 - Notificações
- **Problema:** Verificação de ocorrências suspeitas de 'toast' relacionadas a Notificações
- **Evidência:**
```text
scripts/architecture/audit-repo.cjs:931:            <li><strong>Toast Notifications:</strong> Global toast system (<code>src/lib/toast.ts</code>) handles success/error feedback. Native <code>alert()</code> is strictly prohibited.</li>
scripts/architecture/audit-repo.cjs:1021:                Toasts / Notifications <span class="badge implemented">IMPLEMENTADO</span> <span class="icon">+</span>
scripts/architecture/audit-repo.cjs:1024:                <strong>Location:</strong> <code>src/lib/toast.ts</code><br>
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Notificações necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'toast'

## DEBT-DT-35-005 - Notificações
- **Problema:** Verificação de ocorrências suspeitas de 'alert' relacionadas a Notificações
- **Evidência:**
```text
prisma/migrations/20260731200000_notifications_automations_ai_cost/migration.sql:16:CREATE TYPE "NotificationKind" AS ENUM ('Info', 'Sucesso', 'Alerta', 'Erro');
prisma/schema.prisma:2044:  Alerta
prisma/schema.prisma:2963:/// Conexão do Slack de uma organização — usada para enviar notificações/alertas (ex.: negócio
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Notificações necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'alert'

## DEBT-DT-36-001 - Busca
- **Problema:** Verificação de ocorrências suspeitas de 'search' relacionadas a Busca
- **Evidência:**
```text
prisma/migrations/20260731170000_knowledge_base_tenant_scope/migration.sql:41:-- IVFFlat com cosine: o `vector_cosine_ops` casa com o operador `<=>` usado no SearchService.
prisma/migrations/20260801120000_tenant_scope_ai_memory_prompts_and_rls/migration.sql:9:-- Motivo: `search.service.ts` já documenta que a extensão do Prisma que seta
prisma/migrations/20260818123000_market_intelligence_companies/migration.sql:41:  "razaoSocialSearch" TEXT NOT NULL,
```
- **Prioridade:** P1 - Alta
- **Impacto:** Potencial dívida técnica em Busca necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'search'

## DEBT-DT-36-002 - Busca
- **Problema:** Verificação de ocorrências suspeitas de 'query' relacionadas a Busca
- **Evidência:**
```text
prisma/migrations/20260801120000_tenant_scope_ai_memory_prompts_and_rls/migration.sql:10:-- `app.current_tenant_id` só intercepta operações de model, não `$queryRaw`/`$executeRaw`. Esta
prisma/migrations/20260807100000_enable_rls_remaining_tables/migration.sql:13:-- não `$queryRaw`, e algumas escritas legitimamente acontecem sem `app.current_tenant_id` setado.
prisma/migrations/20260809100000_crm360_soft_delete_columns/migration.sql:6:-- (`isAuditable` em src/lib/prisma.ts:139-144), o que faz QUALQUER query nessas 4 tabelas falhar
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Busca necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'query'

## DEBT-DT-36-003 - Busca
- **Problema:** Verificação de ocorrências suspeitas de 'filter' relacionadas a Busca
- **Evidência:**
```text
prisma/migrations/20260722020322_enable_rls/migration.sql:66:-- Child Entities (No direct organizationId, filtering via parent)
prisma/migrations/20260815020000_bitrix_extraction_run/migration.sql:20:    "filters" JSONB NOT NULL,
prisma/migrations/20260909131444_saved_view/migration.sql:16:    "filters" JSONB NOT NULL DEFAULT '{}',
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Busca necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'filter'

## DEBT-DT-36-004 - Busca
- **Problema:** Verificação de ocorrências suspeitas de 'sort' relacionadas a Busca
- **Evidência:**
```text
prisma/migrations/20260808183000_crm_suite_parity/migration.sql:89:  "sortOrder" INTEGER NOT NULL DEFAULT 0,
prisma/migrations/20260808183000_crm_suite_parity/migration.sql:102:  "sortOrder" INTEGER NOT NULL DEFAULT 0,
prisma/migrations/20260808183000_crm_suite_parity/migration.sql:145:  "sortOrder" INTEGER NOT NULL DEFAULT 0,
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Busca necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'sort'

## DEBT-DT-36-005 - Busca
- **Problema:** Verificação de ocorrências suspeitas de 'paginate' relacionadas a Busca
- **Evidência:**
```text
scripts/architecture/audit-repo.cjs:1012:                <td>Complex, sortable, paginated data grids for CRM and lead lists.</td>
src/components/ui/CommandPalette.tsx:22:import type { Company, Contact, PaginatedResponse } from '../../types/index.js';
src/components/ui/CommandPalette.tsx:225:          api.get<PaginatedResponse<Company>>(
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Busca necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'paginate'

## DEBT-DT-37-001 - Arquivos
- **Problema:** Verificação de ocorrências suspeitas de 'upload' relacionadas a Arquivos
- **Evidência:**
```text
prisma/migrations/20260913000100_notes_cross_entity_and_attachments/migration.sql:62:    "uploadedBy" TEXT,
prisma/schema.prisma:794:// Storage, ver src/lib/storage/index.ts e o precedente real em CopilotoIaController — upload de
prisma/schema.prisma:814:  // getUploadUrl/getDownloadUrl). Único porque cada upload gera um UUID novo (ver
```
- **Prioridade:** P1 - Alta
- **Impacto:** Potencial dívida técnica em Arquivos necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'upload'

## DEBT-DT-37-002 - Arquivos
- **Problema:** Verificação de ocorrências suspeitas de 'download' relacionadas a Arquivos
- **Evidência:**
```text
prisma/schema.prisma:814:  // getUploadUrl/getDownloadUrl). Único porque cada upload gera um UUID novo (ver
prisma/schema.prisma:2339:  // (nunca a URL assinada, que expira em 1h); o download pro worker de transcrição usa
prisma/schema.prisma:2340:  // `getDownloadUrl(audioObjectKey)` de novo, gerando uma URL assinada nova a cada tentativa.
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Arquivos necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'download'

## DEBT-DT-37-003 - Arquivos
- **Problema:** Verificação de ocorrências suspeitas de 's3' relacionadas a Arquivos
- **Evidência:**
```text
prisma/migrations/20260913000100_notes_cross_entity_and_attachments/migration.sql:51:-- storage S3-compatível (src/lib/storage/index.ts); esta tabela só guarda o metadado e o
prisma/schema.prisma:793:// O binário em si vive no storage S3-compatível já usado por outras features (MinIO/R2/Supabase
prisma/schema.prisma:813:  // Chave do objeto no bucket S3-compatível (nunca a URL assinada, que expira em 1h — ver
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Arquivos necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 's3'

## DEBT-DT-37-004 - Arquivos
- **Problema:** Verificação de ocorrências suspeitas de 'storage' relacionadas a Arquivos
- **Evidência:**
```text
prisma/migrations/20260813230000_fix_ailog_rls_unattributed_internal_writes/migration.sql:5:-- AsyncLocalStorage. Nesses casos o gateway grava `organizationId = NULL`.
prisma/migrations/20260821013000_market_intelligence_economic_scenario_audit/migration.sql:7:-- `createdBy` preserva o identificador histórico do ator, mas não cria FK para o storage de auth:
prisma/migrations/20260913000100_notes_cross_entity_and_attachments/migration.sql:51:-- storage S3-compatível (src/lib/storage/index.ts); esta tabela só guarda o metadado e o
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Arquivos necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'storage'

## DEBT-DT-37-005 - Arquivos
- **Problema:** Verificação de ocorrências suspeitas de 'attachment' relacionadas a Arquivos
- **Evidência:**
```text
prisma/migrations/20260913000100_notes_cross_entity_and_attachments/migration.sql:53:CREATE TABLE "Attachment" (
prisma/migrations/20260913000100_notes_cross_entity_and_attachments/migration.sql:69:    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
prisma/migrations/20260913000100_notes_cross_entity_and_attachments/migration.sql:72:CREATE UNIQUE INDEX "Attachment_objectKey_key" ON "Attachment"("objectKey");
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Arquivos necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'attachment'

## DEBT-DT-38-001 - Migrações
- **Problema:** Verificação de ocorrências suspeitas de 'migration' relacionadas a Migrações
- **Evidência:**
```text
prisma/AGENTS.md:12:- `migrations/**`
prisma/AGENTS.md:20:- Não inserir segredo ou dado real sensível em seed/migration.
prisma/AGENTS.md:31:  `docs/security/runbooks/MIGRATION_ROLLBACK.md` (classificação aditiva/destrutiva, down manual +
```
- **Prioridade:** P1 - Alta
- **Impacto:** Potencial dívida técnica em Migrações necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'migration'

## DEBT-DT-38-002 - Migrações
- **Problema:** Verificação de ocorrências suspeitas de 'alter table' relacionadas a Migrações
- **Evidência:**
```text
prisma/migrations/20260716232635_init/migration.sql:35:ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
prisma/migrations/20260717002917_init_crm_core/migration.sql:117:ALTER TABLE "Contact" ADD CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
prisma/migrations/20260717002917_init_crm_core/migration.sql:120:ALTER TABLE "Lead" ADD CONSTRAINT "Lead_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Migrações necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'alter table'

## DEBT-DT-38-003 - Migrações
- **Problema:** Verificação de ocorrências suspeitas de 'seed' relacionadas a Migrações
- **Evidência:**
```text
prisma/AGENTS.md:20:- Não inserir segredo ou dado real sensível em seed/migration.
prisma/migrations/20260823120000_playbook_matrix_items/migration.sql:71:-- Seed: só o conteúdo real transcrito de reunião (9 objeções + 8 qualificações), descartando de
prisma/schema.prisma:3950:/// (ver função `seedAgentCatalogFromCommercialRegistry` em agentCatalog.service.ts para a tabela
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Migrações necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'seed'

## DEBT-DT-38-004 - Migrações
- **Problema:** Verificação de ocorrências suspeitas de 'schema' relacionadas a Migrações
- **Evidência:**
```text
prisma/AGENTS.md:1:# AGENTS.md — Prisma, Schema e Migrações
prisma/AGENTS.md:11:- `schema.prisma`
prisma/AGENTS.md:24:- Agentes 04, 05, 06 e 07 solicitam mudanças de schema ao 01 via handoff.
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Migrações necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'schema'

## DEBT-DT-38-005 - Migrações
- **Problema:** Verificação de ocorrências suspeitas de 'version' relacionadas a Migrações
- **Evidência:**
```text
prisma/migrations/20260720235926_sync_accumulated_schema_drift/migration.sql:104:    "version" TEXT NOT NULL,
prisma/migrations/20260807100000_enable_rls_remaining_tables/migration.sql:17:-- Isso não remove dados; apenas garante que uma reexecução produza exatamente a policy versionada.
prisma/migrations/20260816120000_cadence_scheduling_signature/migration.sql:8:-- Item 5: proposta versionada + assinatura + fechamento determinístico
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Migrações necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'version'

## DEBT-DT-39-001 - Produto
- **Problema:** Verificação de ocorrências suspeitas de 'feature' relacionadas a Produto
- **Evidência:**
```text
prisma/migrations/20260807100000_enable_rls_remaining_tables/migration.sql:145:-- src/features/intelligence/services/ai-settings.service.ts e ai.service.ts dentro de requests
prisma/migrations/20260810120000_commercial_intelligence_goals_and_stage_history/migration.sql:33:-- que já movem uma oportunidade de etapa (ver src/features/commercial-intelligence/infra/
prisma/migrations/20260815030000_feature_flags_and_bug_reports/migration.sql:1:-- Governança de 12 requisitos de arquitetura — item 7 (Feature Flags) e item 8 (Módulo de
```
- **Prioridade:** P1 - Alta
- **Impacto:** Potencial dívida técnica em Produto necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'feature'

## DEBT-DT-39-002 - Produto
- **Problema:** Verificação de ocorrências suspeitas de 'flow' relacionadas a Produto
- **Evidência:**
```text
prisma/migrations/20260810000000_bitrix_full_wiring_sync_status_audit/migration.sql:1:-- Remediação da auditoria BITRIX24-LEAD-FLOW-AUDIT.md: campo customizado (UF_CRM_*) de contrato,
prisma/migrations/20260908020000_multi_cargo_agent_governance_foundation/migration.sql:15:CREATE TYPE "AgentDefinitionStatus" AS ENUM ('CATALOG_ONLY', 'PROMPT_READY', 'SERVICE_WRAPPER', 'WORKFLOW_READY', 'PRODUCTION_READY', 'SOURCE_REQUIRED', 'DUPLICATE_ALIAS', 'BLOCKED', 'DEPRECATED');
prisma/migrations/20260924000000_voice_hub_models/migration.sql:2:CREATE TABLE "Workflow" (
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Produto necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'flow'

## DEBT-DT-39-003 - Produto
- **Problema:** Verificação de ocorrências suspeitas de 'user' relacionadas a Produto
- **Evidência:**
```text
prisma/migrations/20260716232635_init/migration.sql:15:CREATE TABLE "User" (
prisma/migrations/20260716232635_init/migration.sql:25:    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
prisma/migrations/20260716232635_init/migration.sql:32:CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Produto necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'user'

## DEBT-DT-39-004 - Produto
- **Problema:** Verificação de ocorrências suspeitas de 'journey' relacionadas a Produto
- **Evidência:**
```text
prisma/schema.prisma:1140://   - `owner` → Handoffs/trocas de responsável (queries/journeyReport.ts).
scripts/agent-import/classify.ts:265:    'journey architect',
scripts/agent-import/data/prompts.catalog.json:348:    "name": "JourneyArchitect Agent",
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Produto necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'journey'

## DEBT-DT-39-005 - Produto
- **Problema:** Verificação de ocorrências suspeitas de 'feedback' relacionadas a Produto
- **Evidência:**
```text
prisma/migrations/20260918003857_elite_commercial_agent_nba/migration.sql:37:    "feedbackReason" TEXT,
prisma/schema.prisma:1927:  // feedback, já calculada em tempo real durante a ligação) — Json porque é conteúdo de exibição,
scripts/agent-import/data/prompts.catalog.json:750:    "systemPrompt": "Você é o VoicePitchGrader, especialista em avaliar elementos vocais de uma ligação gravada. Sua missão é dar feedback específico de ritmo, tom e pausas que o vendedor pode ajustar na próxima ligação, não uma nota genérica sem direção prática."
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Produto necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'feedback'

## DEBT-DT-40-001 - Continuidade
- **Problema:** Verificação de ocorrências suspeitas de 'manual' relacionadas a Continuidade
- **Evidência:**
```text
prisma/AGENTS.md:31:  `docs/security/runbooks/MIGRATION_ROLLBACK.md` (classificação aditiva/destrutiva, down manual +
prisma/migrations/20260815220000_add_prospect_rejection/migration.sql:3:-- isso, um candidato descartado manualmente continuava reaparecendo em buscas futuras, porque a
prisma/migrations/20260816120000_cadence_scheduling_signature/migration.sql:18:--    Prisma, por isso não aparece em schema.prisma como @@unique, só este SQL manual.
```
- **Prioridade:** P1 - Alta
- **Impacto:** Potencial dívida técnica em Continuidade necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'manual'

## DEBT-DT-40-002 - Continuidade
- **Problema:** Verificação de ocorrências suspeitas de 'script' relacionadas a Continuidade
- **Evidência:**
```text
prisma/migrations/20260717002917_init_crm_core/migration.sql:97:    "description" TEXT NOT NULL,
prisma/migrations/20260808183000_crm_suite_parity/migration.sql:118:  "description" TEXT,
prisma/migrations/20260813230000_fix_ailog_rls_unattributed_internal_writes/migration.sql:4:-- request HTTP (scripts, workers e verificadores) chegam a `logAiUsage()` sem tenant no
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Continuidade necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'script'

## DEBT-DT-40-003 - Continuidade
- **Problema:** Verificação de ocorrências suspeitas de 'cron' relacionadas a Continuidade
- **Evidência:**
```text
prisma/migrations/20260802230000_conversation_signal/migration.sql:3:-- (intenção, urgência, objeções, próximo passo), gerado por um worker assíncrono.
prisma/migrations/20260810000000_bitrix_full_wiring_sync_status_audit/migration.sql:2:-- status de sincronização outbound visível por lead, segredo do webhook de entrada, erro da
prisma/migrations/20260816120000_cadence_scheduling_signature/migration.sql:113:-- anteriores: workers assíncronos (BullMQ) podem gravar fora do ciclo normal de request HTTP — a
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Continuidade necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'cron'

## DEBT-DT-40-004 - Continuidade
- **Problema:** Verificação de ocorrências suspeitas de 'job' relacionadas a Continuidade
- **Evidência:**
```text
prisma/migrations/20260908020000_multi_cargo_agent_governance_foundation/migration.sql:11:-- Apenas os 5 modelos novos da fundação Multi-Cargo (JobRole, UserJobRole, AgentDefinition,
prisma/migrations/20260908020000_multi_cargo_agent_governance_foundation/migration.sql:24:CREATE TABLE "JobRole" (
prisma/migrations/20260908020000_multi_cargo_agent_governance_foundation/migration.sql:36:    CONSTRAINT "JobRole_pkey" PRIMARY KEY ("id")
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Continuidade necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'job'

## DEBT-DT-40-005 - Continuidade
- **Problema:** Verificação de ocorrências suspeitas de 'schedule' relacionadas a Continuidade
- **Evidência:**
```text
prisma/migrations/20260816120000_cadence_scheduling_signature/migration.sql:199:    "scheduledStart" TIMESTAMP(3) NOT NULL,
prisma/migrations/20260816120000_cadence_scheduling_signature/migration.sql:200:    "scheduledEnd" TIMESTAMP(3) NOT NULL,
prisma/migrations/20260816120000_cadence_scheduling_signature/migration.sql:202:    "status" TEXT NOT NULL DEFAULT 'scheduled',
```
- **Prioridade:** P2 - Média
- **Impacto:** Potencial dívida técnica em Continuidade necessitando avaliação
- **Critério de Aprovação:** Eliminar ou justificar o uso de 'schedule'
