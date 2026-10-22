# Matriz Dinâmica de Cobertura de Row-Level Security (RLS) — PostgreSQL
**Data da Auditoria:** 22 de outubro de 2026  
**Auditor:** Agente 01A — Confiabilidade de Dados, RLS e Retenção  
**Status:** 100% DAS TABELAS PROTEGIDAS (ZERO TABELAS DESPROTEGIDAS)  

---

## 1. Cobertura de RLS por Entidade

| Tabela | Coluna de Tenancy | RLS Ativo? | Política de Isolamento |
|---|---|---|---|
| `Organization` | `id` | SIM | `id = current_setting('app.current_tenant_id')` |
| `User` | `organizationId` | SIM | `organizationId = current_setting('app.current_tenant_id')` |
| `Lead` | `organizationId` | SIM | `organizationId = current_setting('app.current_tenant_id')` |
| `Contact` | `organizationId` | SIM | `organizationId = current_setting('app.current_tenant_id')` |
| `Deal` | `organizationId` | SIM | `organizationId = current_setting('app.current_tenant_id')` |
| `Activity` | `organizationId` | SIM | `organizationId = current_setting('app.current_tenant_id')` |
| `WhatsAppMessage` | `organizationId` | SIM | `organizationId = current_setting('app.current_tenant_id')` |
| `VoiceCallLog` | `organizationId` | SIM | `organizationId = current_setting('app.current_tenant_id')` |
| `AccountGraphNode` | `organizationId` | SIM | `organizationId = current_setting('app.current_tenant_id')` |
| `AccountGraphEdge` | `organizationId` | SIM | `organizationId = current_setting('app.current_tenant_id')` |
| `WinLossAutopsyReport` | `organizationId` | SIM | `organizationId = current_setting('app.current_tenant_id')` |

Todas as tabelas possuem `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` e `FORCE ROW LEVEL SECURITY`.
