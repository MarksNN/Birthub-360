# Inventário Seguro de Integrações e Variáveis de Ambiente — Birth Hub 360

**Data de Referência:** 2026-10-12  
**Responsável:** Agente 00 / Agente 06 (Integrações) / Agente 07 (IA) / Agente 15 (Segurança Aplicada)  
**Política de Segurança:** Este documento lista **exclusivamente os nomes das variáveis de ambiente**, nunca seus valores. Nenhum segredo deve ser commitado no Git.

---

## 1. Visão Geral dos Arquivos de Ambiente

| Arquivo | Versionado no Git? | Finalidade | Quantidade de Chaves |
| :--- | :--- | :--- | :--- |
| `.env.example` | **Sim** | Template canônico documentado para desenvolvimento e produção | **156 chaves** (após sincronização pré-migração) |
| `.env.test.example` | **Sim** | Template canônico para suítes de integração e E2E (`dotenv-cli -e .env.test`) | **13 chaves** |
| `.env` | **Não (`.gitignore`)** | Configuração ativa da máquina local (preservada no cofre externo de migração) | **146 chaves** na máquina de origem |
| `.env.test` | **Não (`.gitignore`)** | Configuração local de testes automatizados (preservada no cofre externo) | **13 chaves** |

### Onde Configurar Cada Variável
1. **Desenvolvimento Local:** Arquivo `.env` na raiz do repositório (`c:\Github\Birthub-360\.env`).
2. **Testes Automatizados (`test:integration` / `test:e2e`):** Arquivo `.env.test` na raiz do repositório.
3. **Containers Docker Locais:** Carregados automaticamente a partir do `.env` pelo `docker compose` (`docker-compose.yml`, `docker-compose.postgres-local.yml`, `docker-compose.opensource.yml`).
4. **CI/CD (GitHub Actions) e Produção:** GitHub Actions Secrets / Variables e gerenciador de segredos do ambiente de execução (Infisical / Vault / AWS Secrets Manager conforme `docs/security/SECRETS_MANAGER_MIGRATION.md`).

---

## 2. Catálogo Detalhado por Integração (Os 7 Requisitos de Portabilidade)

### 2.1 Banco de Dados, Cache, Filas e Busca

#### A. PostgreSQL 16 + `pgvector` (Banco Canônico)
1. **Finalidade:** Persistência relacional multi-tenant com RLS (`app.current_organization_id`), índices trigram (`pg_trgm`) e vetores de embeddings (`vector`).
2. **Variáveis Exigidas:** `DATABASE_URL`, `DIRECT_URL`, `SHADOW_DATABASE_URL`, `DB_POOL_MAX`, `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`.
3. **Onde Configurar:** `.env`, `.env.test` e `docker-compose.postgres-local.yml`.
4. **Dependência de IP/Domínio/Credencial:** Em modo Local-First, `scripts/local-first/doctor.mjs` exige que `DATABASE_URL` aponte para `localhost` ou `127.0.0.1` (porta padrão `5434` no Docker Compose local). Em produção remota, exige `sslmode=require&uselibpqcompat=true` e usuário `NOSUPERUSER` (`prospector_app`).
5. **Procedimento de Reautenticação:** Atualizar a connection string em `.env` e reiniciar o processo Node (`npm run dev`). Para rotacionar senha, alterar no PostgreSQL e em `.env`.
6. **Teste Não Destrutivo:** `npm run local:doctor`, `npm run setup:db:check` e `npm run verify:migration-drift`.
7. **Riscos da Migração:** Esquecer de restaurar o dump SQL local na nova máquina (iniciando com banco vazio) ou conectar como superusuário `postgres` (o que desativa o RLS em testes).

#### B. Redis 7 + BullMQ (Cache, Rate Limit e Filas)
1. **Finalidade:** Filas assíncronas de enriquecimento/extração/IA, circuit breakers distribuídos do AI Gateway e rate limiting.
2. **Variáveis Exigidas:** `REDIS_URL`, `ENABLE_QUEUES`, `ENABLE_EMBEDDED_WORKERS`, `WORKER_HEALTH_PORT`.
3. **Onde Configurar:** `.env`, `.env.test` e `docker-compose.yml`.
4. **Dependência de IP/Domínio/Credencial:** Porta local `6379` (`redis://:prospector_redis_pass@localhost:6379`).
5. **Procedimento de Reautenticação:** Atualizar senha na URL `REDIS_URL` e no serviço `redis` do `docker-compose.yml`.
6. **Teste Não Destrutivo:** `npm run local:doctor` e `docker exec birthhub_redis redis-cli -a prospector_redis_pass ping`.
7. **Riscos da Migração:** Jobs em trânsito no Redis antigo caso a migração ocorra com workers ativos (mitigado: nenhuma fila estava ativa no momento do backup).

#### C. Meilisearch / Typesense (Busca Textual) e Qdrant (Vetores Auxiliares)
1. **Finalidade:** Busca full-text instantânea (`Meilisearch` porta `7700` / `Typesense` porta `8108`) e banco vetorial complementar (`Qdrant` porta `6333`).
2. **Variáveis Exigidas:** `ENABLE_SEARCH`, `MEILI_HOST`, `MEILI_MASTER_KEY`, `TYPESENSE_HOST`, `TYPESENSE_PORT`, `TYPESENSE_API_KEY`, `QDRANT_HOST`, `QDRANT_PORT`, `QDRANT_URL`, `QDRANT_API_KEY`.
3. **Onde Configurar:** `.env` e `.env.test`.
4. **Dependência de IP/Domínio/Credencial:** Serviços locais via Docker (`localhost:7700`, `localhost:6333`).
5. **Procedimento de Reautenticação:** Definir `MEILI_MASTER_KEY` idêntica entre `.env` e container `birthhub_meilisearch`.
6. **Teste Não Destrutivo:** `curl http://localhost:7700/health` e `curl http://localhost:6333/healthz`.
7. **Riscos da Migração:** Nota técnica: `src/config/env.ts` lê `QDRANT_HOST`/`QDRANT_PORT`, enquanto `src/lib/ai/embeddings/qdrant.ts` lê `QDRANT_URL`. Ambas estão documentadas no `.env.example`.

#### D. DuckDB Local (Base CNPJ Receita Federal)
1. **Finalidade:** Consulta ultrarrápida local de CNPJs em arquivo DuckDB (`READ_ONLY`) com fallback automático para `BrasilAPI` / `MinhaReceita`.
2. **Variáveis Exigidas:** `DUCKDB_CNPJ_PATH` (default `./data/cnpj_dados_abertos.duckdb`).
3. **Onde Configurar:** `.env`.
4. **Dependência de IP/Domínio/Credencial:** Arquivo local em disco; sem dependência de rede.
5. **Procedimento de Reautenticação:** Não aplicável.
6. **Teste Não Destrutivo:** `npx vitest run src/features/prospecting/services/__tests__/duckdbCnpj.service.test.ts`.
7. **Riscos da Migração:** Se o arquivo `.duckdb` não for copiado para a nova máquina, o sistema opera normalmente em fallback via `BrasilAPI` / `MinhaReceita`.

---

### 2.2 Autenticação, Criptografia e Segurança

#### A. Better Auth & Segurança de Sessão
1. **Finalidade:** Autenticação de usuários, gestão de sessões e cookies HTTP-only.
2. **Variáveis Exigidas:** `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `ALLOWED_ORIGINS`, `COOKIE_DOMAIN`, `SECURE_COOKIES`, `ALLOW_DEV_AUTH_BYPASS`, `AUTH_RATE_LIMIT_MAX`, `PRODUCTION_DOMAIN`, `DOMAIN`.
3. **Onde Configurar:** `.env` e `.env.test`.
4. **Dependência de IP/Domínio/Credencial:** `BETTER_AUTH_URL` deve corresponder à porta local em uso (`http://localhost:3024` ou `http://localhost:3000`). Em produção, `src/config/env.ts` bloqueia o boot se `BETTER_AUTH_URL` ou `ALLOWED_ORIGINS` apontarem para `localhost`.
5. **Procedimento de Reautenticação:** Se `BETTER_AUTH_SECRET` mudar, todas as sessões ativas expiram e exigem novo login (`docs/security/runbooks/ROTATE_BETTER_AUTH_SECRET.md`).
6. **Teste Não Destrutivo:** `GET http://localhost:3024/api/auth/get-session`.
7. **Riscos da Migração:** Se o IP da LAN mudar na nova máquina (ex.: `.claude/launch.json` tinha `192.168.0.179`), atualizar `ALLOWED_ORIGINS` caso acesse de outro dispositivo na rede.

#### B. Criptografia de Credenciais em Repouso e Blind Index de PII (LGPD)
1. **Finalidade:** `CREDENTIALS_ENCRYPTION_KEY` cifra em repouso (AES-256-GCM) tokens de integrações (`BitrixConnection`, `GoogleWorkspaceConnection`); `PII_BLIND_INDEX_KEY` gera hashes HMAC-SHA256 para busca exata sobre `Contact.email`/`phone`/`whatsapp` cifrados; `PLATFORM_OPERATOR_TOKEN` protege `/admin/queues` e `/metrics`.
2. **Variáveis Exigidas:** `CREDENTIALS_ENCRYPTION_KEY`, `PII_BLIND_INDEX_KEY`, `PLATFORM_OPERATOR_TOKEN`.
3. **Onde Configurar:** `.env` e `.env.test`.
4. **Dependência de IP/Domínio/Credencial:** Chaves criptográficas locais de 32 bytes base64 (`CREDENTIALS_ENCRYPTION_KEY` e `PII_BLIND_INDEX_KEY` devem ser diferentes entre si).
5. **Procedimento de Reautenticação:** **CRÍTICO:** Preservar os mesmos valores de `CREDENTIALS_ENCRYPTION_KEY` e `PII_BLIND_INDEX_KEY` ao restaurar um banco existente; caso contrário, os dados cifrados no banco não poderão ser decifrados sem rodar os runbooks `ROTATE_CREDENTIALS_ENCRYPTION_KEY.md` e `ROTATE_PII_BLIND_INDEX_KEY.md` (`npm run security:backfill-contact-pii`).
6. **Teste Não Destrutivo:** `npx vitest run tests/integration/sec001-bullboard-access.test.ts` (ou testes unitários de `secretFields` e `piiIndex`).
7. **Riscos da Migração:** Perda de `CREDENTIALS_ENCRYPTION_KEY` invalida conexões Bitrix/Google já salvas no banco de dados.

#### C. Google OAuth (Login Social + Google Workspace Gmail/Calendar) e Microsoft OAuth
1. **Finalidade:** Login social e integração com Gmail/Google Calendar da organização.
2. **Variáveis Exigidas:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `BETTER_AUTH_URL`, `PUBLIC_BASE_URL`.
3. **Onde Configurar:** `.env` + Console do Google Cloud / Azure Entra ID.
4. **Dependência de IP/Domínio/Callback:** Exige dois Redirect URIs cadastrados no Google Cloud Console:
   - `{BETTER_AUTH_URL}/api/auth/callback/google`
   - `{PUBLIC_BASE_URL}/api/google/callback`
5. **Procedimento de Reautenticação:** Reconectar conta Google em Configurações > Integrações caso o refresh token seja revogado.
6. **Teste Não Destrutivo:** Verificar abertura da URL de autorização OAuth sem erro `redirect_uri_mismatch`.
7. **Riscos da Migração:** Mudar a porta local (ex.: de `3024` para `3000`) sem atualizar `BETTER_AUTH_URL` causará erro `redirect_uri_mismatch`.

---

### 2.3 Inteligência Artificial, Gateways, Embeddings e Voz

#### A. AI Gateway Multi-Provedor (Groq, Google Gemini, OpenAI, OpenRouter, LiteLLM, Ollama, vLLM, Flowise, OpenWebUI)
1. **Finalidade:** Geração de texto, análise comercial, copilot, prospecção assistida, enriquecimento e enxame autônomo com fallback em cascata e circuit breaker.
2. **Variáveis Exigidas:** `GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `LITELLM_URL`, `LITELLM_KEY`, `LITELLM_MASTER_KEY`, `OLLAMA_BASE_URL`, `OLLAMA_HOST`, `OLLAMA_API_KEY`, `OLLAMA_MODEL`, `GROQ_MODEL`, `VLLM_API_URL`, `VLLM_API_KEY`, `FLOWISE_URL`, `OPENWEBUI_URL`, `AI_GATEWAY_TIMEOUT_MS`, `AI_FALLBACK_TIMEOUT_MS`, `AI_MONTHLY_BUDGET_USD`, `AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS`.
3. **Onde Configurar:** `.env` e `litellm-config.yaml`.
4. **Dependência de IP/Domínio/Credencial:** Saída HTTPS (`api.groq.com`, `generativelanguage.googleapis.com`, `api.openai.com`, `openrouter.ai`) e HTTP local (`localhost:11434` Ollama, `localhost:4000` LiteLLM).
5. **Procedimento de Reautenticação:** Rotação de API Key no painel do respectivo provedor (`docs/security/runbooks/ROTATE_GEMINI_API_KEY.md`).
6. **Teste Não Destrutivo:** `npm run verify:integrations` e `npm run verify:ai`.
7. **Riscos da Migração:**
   - **Nota de compatibilidade:** `src/lib/ai/ollama-client.ts` e `src/lib/ai/turboSearch.ts` leem `OLLAMA_HOST`, enquanto `src/config/env.ts` e `doctor.mjs` leem `OLLAMA_BASE_URL`. Defina ambas como `http://localhost:11434` no `.env`.
   - Na nova máquina, se usar Ollama local, será necessário baixar novamente os modelos (`ollama pull llama3`).

#### B. Embeddings (`Transformers.js` Local / HuggingFace TEI) e Reranking
1. **Finalidade:** Geração de vetores para RAG e base de conhecimento.
2. **Variáveis Exigidas:** `EMBEDDINGS_PROVIDER`, `LOCAL_EMBEDDING_MODEL`, `LOCAL_EMBEDDING_CACHE`, `TEI_BASE_URL`, `LITELLM_EMBEDDING_MODEL`, `AI_EMBEDDING_TIMEOUT_MS`, `KNOWLEDGE_RERANK_ENABLED`, `KNOWLEDGE_RERANK_CANDIDATES`, `KNOWLEDGE_RERANK_MODEL`.
3. **Onde Configurar:** `.env`.
4. **Dependência de IP/Domínio/Credencial:** Na primeira execução com `EMBEDDINGS_PROVIDER=local`, baixa `Xenova/multilingual-e5-base` (~400 MB) para `.cache/models`.
5. **Procedimento de Reautenticação:** Não aplicável para modelo local.
6. **Teste Não Destrutivo:** `npm run setup:db:check`.
7. **Riscos da Migração:** O primeiro boot de RAG na máquina nova fará o download automático de ~400 MB em `.cache/models`.

#### C. Telefonia, Voz e Agentes de Voz (Bland AI, Birth Voices Hub, ElevenLabs, Voicebox, Twilio, 3CX)
1. **Finalidade:** Discagem ativa/receptiva, síntese de voz (TTS), roleplay de vendas e recebimento de transcrições/resultados via webhook.
2. **Variáveis Exigidas:**
   - *Birth Voices / Bland AI:* `BIRTH_VOICES_URL`, `BIRTH_VOICES_API_KEY`, `BIRTH_VOICES_AGENT_ID`, `BIRTH_VOICES_WEBHOOK_SECRET`, `BLAND_API_KEY`, `BIRTHHUB360_WEBHOOK_SECRET`, `PUBLIC_BASE_URL`, `SDR_COLD_CALL_ENABLED`, `SDR_COLD_CALL_ORGANIZATIONS`, `SDR_CALL_WINDOW_START`, `SDR_CALL_WINDOW_END`, `SDR_CALL_TIMEZONE`, `SDR_MAX_CALLS_PER_RUN`, `SDR_MAX_ATTEMPTS_PER_LEAD`, `SDR_RETRY_COOLDOWN_HOURS`.
   - *TTS:* `ELEVENLABS_API_KEY`, `VOICEBOX_API_URL`, `VOICEBOX_PROFILE_ID`.
   - *PABX / SIP:* `THREECX_WEBHOOK_SECRET`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`.
3. **Onde Configurar:** `.env`.
4. **Dependência de IP/Domínio/Callback:** Webhooks (`/api/webhooks/voice-result`, `/api/integrations/birth-voice/webhook`, `/api/integrations/threecx/webhook`) exigem URL pública (`PUBLIC_BASE_URL` via túnel ngrok/Cloudflare em dev) e são **fail-closed (HTTP 503)** se os respectivos `*_WEBHOOK_SECRET` não estiverem configurados.
5. **Procedimento de Reautenticação:** Seguir `docs/security/runbooks/ROTATE_BLAND_AI_KEY.md` e `ROTATE_INBOUND_WEBHOOK_SECRETS.md`.
6. **Teste Não Destrutivo:** Suítes unitárias de `birth-voice` e `voice-hub`.
7. **Riscos da Migração:** Um túnel ngrok novo na máquina nova gerará outra URL pública; atualizar `PUBLIC_BASE_URL` caso teste callbacks reais de voz.

---

### 2.4 CRM, Prospecção B2B e Inteligência de Mercado

#### A. Bitrix24 (Integração Principal de CRM e Extrações)
1. **Finalidade:** Sincronização bidirecional de Leads/Deals/Contatos e execução de extrações paginadas completas (`BitrixExtractionRun`).
2. **Variáveis Exigidas:** `BITRIX24_WEBHOOK_URL`, `BIRTHUB360_BITRIX24_WEBHOOK_URL` (fallbacks: `BITRIX_WEBHOOK_URL`, `BIRTHUB360_BITRIX_WEBHOOK_URL`), `BITRIX_CIRCUIT_BREAKER_ENABLED`, `BITRIX_CIRCUIT_BREAKER_THRESHOLD`, `BITRIX_CIRCUIT_BREAKER_COOLDOWN_MS`, `BITRIX_EXTRACTION_STORAGE_DIR`, `BITRIX_EXTRACTION_RETENTION_DAYS`, `BITRIX_EXTRACTION_PURGE_ENABLED`.
3. **Onde Configurar:** `.env` ou por organização na tela de Integrações (persistido cifrado em `BitrixConnection`).
4. **Dependência de IP/Domínio/Callback:** Saída HTTPS para o portal `*.bitrix24.com.br`; webhook inbound em `/api/integrations/bitrix/webhook`.
5. **Procedimento de Reautenticação:** Seguir `docs/security/runbooks/ROTATE_BITRIX24_WEBHOOKS.md`.
6. **Teste Não Destrutivo:** `npm run verify:integrations` (executa chamada somente-leitura `profile.json` no Bitrix24).
7. **Riscos da Migração:** Arquivos brutos de extração em `./data/bitrix-extractions/` são ignorados pelo Git por conterem PII (B-13/B-14); o histórico estruturado permanece no PostgreSQL.

#### B. Demais Conectores de CRM (HubSpot, Pipedrive, Salesforce, RD Station)
1. **Finalidade:** Conectores adicionais do módulo de Integrações (`ExternalCrmConnection`).
2. **Variáveis Exigidas:** `HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET`, `HUBSPOT_REDIRECT_URI`.
3. **Estado Real:** HubSpot possui fluxo OAuth/Deals parcial em `src/features/integrations/hubspot/hubspot.service.ts`; Pipedrive (`pipedrive.service.ts`) é stub documentado; Salesforce e RD Station são entradas de catálogo/UI.

#### C. Provedores de Prospecção e Pesquisa (Apollo.io, Hunter.io, Google Places, BrasilAPI/MinhaReceita, Serper, Tavily, SearXNG)
1. **Finalidade:** Descoberta de empresas, validação de e-mails, busca de decisores, consulta de CNPJ/CEP e pesquisa de notícias de mercado.
2. **Variáveis Exigidas:** `PROSPECTING_PROVIDER_MODE` (`free` ou `hybrid`), `APOLLO_API_KEY`, `HUNTER_API_KEY`, `GOOGLE_MAPS_API_KEY`, `CNPJ_PROVIDER` (`brasilapi`), `SERPER_API_KEY`, `TAVILY_API_KEY`, `SEARXNG_URL`, `ENRICHMENT_CACHE_TTL_SECONDS`.
3. **Onde Configurar:** `.env`.
4. **Dependência de IP/Domínio/Credencial:** `GOOGLE_MAPS_API_KEY` pode possuir restrição de IP no Google Cloud Console (se houver restrição de IP público na chave, adicionar o IP da nova rede). `BrasilAPI` e `MinhaReceita` são públicos e gratuitos.
5. **Procedimento de Reautenticação:** Atualizar chaves no `.env` e definir `PROSPECTING_PROVIDER_MODE=hybrid` quando quiser habilitar provedores pagos.
6. **Teste Não Destrutivo:** `npm run verify:integrations` (valida `BrasilAPI`, `Hunter.io /v2/account`, `Apollo` e `Google Places` conforme modo configurado).
7. **Riscos da Migração:** Manter `PROSPECTING_PROVIDER_MODE=free` durante testes na máquina nova para não consumir créditos de API acidentalmente.

---

### 2.5 Mensageria, Storage e Observabilidade

| Integração | Variáveis Exigidas (Apenas Nomes) | Verificação Não Destrutiva | Observações de Migração |
| :--- | :--- | :--- | :--- |
| **WhatsApp (`@whiskeysockets/baileys`)** | *(Sem chave de env; sessão em `whatsapp_auth/`)* | `GET /api/integrations/whatsapp/status` | Pasta `whatsapp_auth/` é ignorada pelo Git; reautenticar via QR Code na nova máquina se necessário. |
| **E-mail SMTP (`nodemailer`) & Webhooks** | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `EMAIL_INBOUND_WEBHOOK_SECRET`, `SIGNATURE_INBOUND_WEBHOOK_SECRET`, `CHATWOOT_WEBHOOK_SECRET` | Testes de integração de webhooks | Sem `SMTP_HOST`, usa fallback seguro `mailto:`. Webhooks são fail-closed (503) sem segredo. |
| **Object Storage (MinIO / S3)** | `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY` (fallbacks: `MINIO_*`) | `npm run local:doctor` | No Docker local, `minio-init` recria automaticamente o bucket `prospector-assets`. |
| **Observabilidade (Langfuse, Sentry, PostHog, OTel, Loki, Prometheus)** | `LANGFUSE_BASEURL`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `SENTRY_DSN`, `SENTRY_SECRET_KEY`, `VITE_SENTRY_DSN`, `POSTHOG_KEY`, `POSTHOG_HOST`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`, `OTEL_SERVICE_NAME`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_TRACES_SAMPLER`, `OTEL_SDK_DISABLED`, `LOKI_HOST`, `EXPOSE_METRICS` | `npm run local:doctor` | Em dev sem coletor OTel rodando, manter `OTEL_SDK_DISABLED=true` para evitar ruído de conexão recusada na porta `4318`. |
| **Deploy Cloud (AWS / GHCR)** | `AWS_ROLE_TO_ASSUME`, `AWS_S3_FRONTEND_BUCKET`, `AWS_CLOUDFRONT_DIST_ID` (GitHub Actions OIDC) | `npm run release:check` | Workflow AWS encontra-se arquivado (`deploy-aws.yml.disabled`); plataforma opera em modo Local-First. |
