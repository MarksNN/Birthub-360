# MODELO DE SEGURANÇA, ISOLAMENTO MULTI-TENANT E LGPD — ONDA 00
**Projeto:** Birth Hub 360° / Birthub 360  
**Onda:** `00 — Fundação e Preparação`  
**Data:** 2026-10-18  
**Autoridade:** `AGENTS.md`  
**Coordenador:** Agente 00 — Chief Commercial Intelligence Engineering Orchestrator  
**Auditor Independente:** Agente 24 — Revisão Independente  

---

## 1. Isolamento Multi-Tenant e Row Level Security (RLS)

O isolamento entre organizações na plataforma é garantido em nível de infraestrutura de banco de dados, não dependendo de cláusulas `WHERE` esquecidas na camada de aplicação.

### 1.1 Configuração do PostgreSQL
- **Papel de Runtime:** A aplicação conecta ao PostgreSQL utilizando o papel `prospector_app`, configurado com o atributo **`NOSUPERUSER`**.
- **Contexto Transacional de Sessão:** A cada requisição HTTP, o middleware de tenancy executa na transação:
  ```sql
  SET LOCAL app.current_organization_id = 'org_uuid_aqui';
  ```
- **Políticas de RLS Rígidas:** 48 tabelas do banco de dados possuem RLS habilitado (`ALTER TABLE <tabela> ENABLE ROW LEVEL SECURITY`).
- **Política de Leitura e Escrita:**
  ```sql
  CREATE POLICY tenant_isolation_policy ON <tabela>
    FOR ALL
    USING (organization_id = current_setting('app.current_organization_id', true))
    WITH CHECK (organization_id = current_setting('app.current_organization_id', true));
  ```
- **Varredura Automatizada de Vulnerabilidades:** O teste `tests/unit/db/rls-coverage.test.ts` verifica se alguma tabela possui brechas do tipo `WITH CHECK (true)` ou se novas tabelas criadas no Prisma esqueceram de habilitar RLS. Qualquer tabela desprotegida falha o build imediatamente.

### 1.2 Comprovação Empírica entre Tenants Sintéticos
Testes de integração dedicados comprovam o bloqueio estrito contra vazamento de dados:
- `tests/integration/ailog-rls.test.ts`: Prova que uma tentativa de leitura ou inserção com o tenant `ORG_B` sob a sessão de `ORG_A` é rejeitada imediatamente pelo motor do Postgres com violação de RLS.
- `tests/integration/conversation-signal-tenant-isolation.test.ts`: Prova que sinais de conversa, transcrições e insights de chamadas de um cliente nunca são visíveis por outra organização.

---

## 2. Governança de Acesso e RBAC

- **Matriz de Papéis:** `ADMIN`, `MANAGER`, `SDR`, `CLOSER`, `VIEWER`.
- **Validação Dupla:**
  1. **Servidor (Backend):** Middleware `requireRole(['ADMIN', ...])` protege todas as rotas sensíveis (parametrização de IA, faturamento, conexões Bitrix, exclusão de dados).
  2. **Cliente (Frontend):** Componentes de interface utilizam `<RequireRole allowedRoles={...}>` para ocultar controles indevidos, acompanhados de tratamento de erro 403 padronizado no interceptor HTTP.

---

## 3. Conformidade LGPD e Proteção de Dados Pessoais

A plataforma processa dados cadastrais, mensagens comerciais e gravações de reuniões. A governança de privacidade é operacionalizada por código verificável:

### 3.1 Minimização e Tokenização de PII (`piiTokenizer.service.ts`)
- Antes que qualquer texto ou diálogo seja submetido a provedores externos de IA (Groq, OpenAI, Anthropic), os dados pessoais identificáveis (CPF, telefone pessoal, e-mail do contato) são substituídos por tokens opacos (`{{PERSON_TOKEN_1}}`, `{{PHONE_TOKEN_1}}`).
- Os valores originais permanecem exclusivamente no cofre local da organização no banco PostgreSQL, sendo restabelecidos apenas no render final para o operador humano autenticado.

### 3.2 Cadeia Criptográfica de Auditoria de Consentimento (`consentAuditChain.service.ts`)
- Em reuniões de campo gravadas (Mobile C6) e ligações SDR ativas (VoiceHub C5), a anuência do titular é obrigatória.
- Cada registro de consentimento gera um hash encadeado SHA-256 (estilo blockchain/append-only ledger) contendo:
  - `organizationId`, `leadId`, carimbo de data/hora UTC;
  - Texto exato do aceite ou áudio do consentimento verbal;
  - Hash do registro imediatamente anterior.
- Isso comprova perante a ANPD a integridade temporal do consentimento sem risco de adulteração retroativa.

### 3.3 Gestão de Opt-Out e Supressão Multicanal
- Serviço centralizado `optOutService` em `src/features/cadence/application/optoutservice.ts`.
- Quando um lead solicita descadastro por e-mail, WhatsApp ou chamada de voz, o número e e-mail entram na lista de supressão da organização.
- Qualquer tentativa posterior do discador ou robô de e-mail de contatar esse titular é barrada com retorno **HTTP 409 (Conflict / Opted-Out)**.

### 3.4 Direito do Titular: Expurgo e Anonimização
- Scripts executáveis: `scripts/lgpd-erase-data-subject.ts`.
- Worker diário: `autoAnonymizeDisqualified.worker.ts` remove dados de leads desqualificados após o período de retenção legal, substituindo dados por hashes irreversíveis.

---

## 4. Criptografia em Repouso e Higiene de Segredos

1. **Credenciais Externas (`credentialCrypto.ts`):** Webhooks do Bitrix24, API keys do Apollo e tokens de telefonia são criptografados no PostgreSQL com **AES-256-GCM**, com vetor de inicialização (IV) e tag de autenticação únicos por registro.
2. **Varredura de Segredos (Gitleaks):** Regras estritas em `.gitleaks.toml` impedem commit acidental de arquivos `.env`, chaves privadas ou senhas hardcoded.
