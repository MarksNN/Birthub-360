# Parecer 24 — PR #87 "Add Privacy Policy and Terms of Use" @ 638677ce

**Decisão: REPROVADO**

> **Escopo deste parecer:** só precisão técnica. Ele confere se o texto bate com a arquitetura e o código reais. **Não é revisão jurídica.** Mesmo um APROVADO futuro não autoriza publicar: o texto jurídico final precisa da aprovação do DPO/encarregado e do Marcelo (decisão humana) antes de qualquer publicação (site, app ou contrato).

## Identificação

| Campo | Valor |
|---|---|
| Missão | Auditar a Política de Privacidade e os Termos de Uso pela precisão frente à arquitetura real (RLS, multi-tenant, retenção, bases legais, direitos do titular, cadeia append-only × eliminação) |
| PR | https://github.com/MarksNN/Birthub-360/pull/87 (OPEN, não draft) |
| Autor | google-labs-jules[bot] (Jules), co-autor MarksNN, a pedido do MarksNN (task Jules 11988699179931477208) |
| Auditor | Agente 24 — Revisão Independente |
| Branch | `docs/lgpd-policies-11988699179931477208` |
| Head auditado | `638677ce40936cfc89a7f45138c81c70e31012ef` (conferido no início e no fim da auditoria; não mudou) |
| Base | `main` @ `6767729580fda0f333cfb59b66271f5e0bf05c7e` (pai direto do head; ahead 1, behind 0) |
| Merge | `mergeable=MERGEABLE`, `mergeStateStatus=UNSTABLE` (checks vermelhos herdados, ver CI) |
| Arquivos (únicos tocados) | `docs/lgpd/policies/politica-privacidade.md` (+93) blob `5f556a87f11dd8bc90edc854e954b541c177c78b`, sha256 `0d62af9b282a9057d8cb8f629072329496cbd82d64be22defcbd87e9796610dc`<br>`docs/lgpd/policies/termos-de-uso.md` (+70) blob `f07b07a36a59980f026c07294d0d6f9ce155698a`, sha256 `01866ec38d885e7e21d28a8e3e040370451cd7f992d47bc71bfacf4158d972a6` |

Qualquer mudança nesses blobs invalida o parecer (AGENTS.md §40).

## Critérios

1. Nada prometido que o sistema não faça (AGENTS.md §30: não transformar expectativa em evidência). Toda promessa inexata é REPROVADO.
2. Coerência com os documentos LGPD da main: `docs/lgpd/INVENTARIO_TRATAMENTO_ROPA.md`, `docs/lgpd-base-legal.md`, `docs/ADR/ADR-006-LGPD-Cadeia-Consentimento-Append-Only.md` e a página publicada `src/pages/PrivacyPolicy.tsx`.
3. O conteúdo mínimo que a LGPD exige numa política (arts. 9, 18, 19, 20, 33, 41 e 48) está presente, ou a falta aparece como pendência.
4. Nenhum fato inventado (CNPJ, endereço, e-mail, certificação, SLA).
5. Escopo só de docs e posicionamento coerente com `docs/lgpd/`.

## Comandos (só leitura, via API; sem clone, sem npm ci)

```
gh pr view 87 --json headRefOid,baseRefName,mergeable,mergeStateStatus,files,commits,statusCheckRollup
gh api repos/MarksNN/Birthub-360/compare/67677295...638677ce          # ahead=1 behind=0, 2 arquivos
gh api repos/MarksNN/Birthub-360/git/trees/<sha>?recursive=1         # árvore da main e do head, blobs
gh api repos/MarksNN/Birthub-360/contents/<path>?ref=<sha>            # leitura de todos os arquivos citados
gh search code "<termo>" -R MarksNN/Birthub-360                        # índice da branch padrão
gh run list --commit 638677ce... ; gh api actions/jobs/<id>            # CI
```

## CI no head (sem watch, consultado por volta de 14:05 BRT de 25/10/2026)

| Workflow | Resultado | Leitura |
|---|---|---|
| Security - Dependency Review | success | — |
| Security - CodeQL (js/ts e python) | success | — |
| Central / secret scan, dependency review | success | — |
| Security - Trivy (gate de PR) e Central / trivy scan | **failure** (step 3, "Rodar Trivy") | PRÉ-EXISTENTE: é o mesmo CVE da main 67677295 (run 40210327388 para no trivy), que o #67 corrige |
| Central / application gate | **skipped** (depende do trivy) | NÃO EXECUTADO. Prettier e lint não rodaram sobre os .md |
| Central / build ("Consolidar veredito") | failure | consequência do trivy |
| SonarQube, Visual Regression | in_progress | não aplicável a .md |

Não há gate de markdown/docs-lint dedicado. A formatação dos dois .md está **NÃO EXECUTADA**: o application gate foi pulado e não rodei Prettier local porque o box está sem recursos. Isso não pesa na decisão, porque os achados P1 já reprovam.

## Achados

### P1 — promessas inexatas ou fatos sem lastro (bloqueiam)

**P1-1. "PII mascarada antes de qualquer repasse a IA" e "dados não usados para treinamento" é falso ou não verificável. Também falta divulgar suboperadores e transferência internacional.**
- `politica-privacidade.md:55` diz que "CPF, números de cartão de crédito e telefones são automaticamente mascaradas (tokenização) antes de qualquer repasse para provedores externos (ex: IA/LLMs)". `termos-de-uso.md:45` diz que "O Birth Hub 360 garante que, antes do repasse [...] são aplicadas técnicas automáticas de tokenização [...] não havendo utilização de seus dados para treinamento de modelos públicos".
- Realidade na main:
  - `src/lib/security/piiTokenizer.service.ts:4-7` só tem regex de CPF, CNPJ, telefone e e-mail. **Não existe regex de cartão de crédito**, e nomes e texto livre não são cobertos.
  - `src/shared/services/aiPiiConsent.service.ts:27-35` diz o contrário da política: existe um gate justamente porque "nome, e-mail, telefone do Contact, transcrição de conversa" **são enviados** a Groq, OpenAI e LiteLLM quando a organização está em `AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS`.
  - `docs/lgpd-base-legal.md:31` descreve que a minimização troca só PII *conhecida* (ex.: nome do contato).
  - Áudio de voz vai bruto para STT e telefonia (`.env.example`: `BLAND_API_KEY`, `LIVEKIT_*`, `OPENAI_API_KEY`; handoff `.agents/handoffs/onda-14/07-para-21-consentimento-retencao-audio.md` cita Flowise/OpenAI/LiveKit). Não dá para tokenizar áudio antes do STT.
  - Nada no repositório comprova a cláusula de "não treinamento": isso depende do contrato e dos termos de cada provedor.
- "K-Anonymity" (`politica:55`) é termo errado: tokenização não é k-anonimato.
- **Omissão (arts. 9º, V e 33):** não há seção de compartilhamento nem de suboperadores. A `.env.example` da main mostra provedores externos de IA e LLM (Groq, OpenAI, Gemini, OpenRouter, LiteLLM, Flowise), voz e telefonia (Bland AI, LiveKit, 3CX), CRM e mensageria (Bitrix24, Chatwoot, WhatsApp, n8n) e enriquecimento e busca (Apollo, Hunter, Serper, Tavily, Google Maps). Vários deles ficam fora do Brasil, mas a política não traz nem lista nem aviso de transferência internacional. A própria página publicada `src/pages/PrivacyPolicy.tsx:47-53` tem uma seção "Compartilhamento e Subprocessadores", que o PR perdeu.

**P1-2. Os prazos de retenção e o "descarte automatizado garantido" não estão implementados e contradizem outras fontes.**
- `politica:63`: leads ficam pelo "ciclo comercial + 12 meses" e depois são anonimizados. O código faz outra coisa: `src/features/crm/jobs/autoAnonymizeDisqualified.worker.ts:20-24,51-55` anonimiza leads `Negocios_Perdidos` com **90 dias** sem atualização, e `docs/lgpd-base-legal.md:11` também fala em 90 dias. `scripts/db/purge-expired-data.sql:6-14` traz uma terceira regra: **2 anos** para Contact e 1 ano para WhatsAppMessage. Não achei nenhum job que implemente "ciclo + 12 meses". O ROPA (`INVENTARIO_TRATAMENTO_ROPA.md:13`), que o PR copiou, diverge do código.
- `politica:64`: "logs de conexão retidos por 6 meses, seguido de exclusão". Não achei expurgo de `AuditLog` fora dos testes (`gh search code "auditLog.deleteMany"` só retorna `tests/integration/*`). NÃO IMPLEMENTADO.
- `politica:65`: "áudio bruto mantido por 90 dias e posteriormente deletado; transcrições são anonimizadas". Não há lifecycle de storage nem purge de áudio do Copiloto ou da VoiceHub (buscas por `PutBucketLifecycle`, `copilotoAudio.deleteMany` e `AUDIO_RETENTION_DAYS` voltaram vazias). O único purge de voz é o `CallLog`, com **365 dias** por padrão (`src/lib/voice-hub/services/callLogService.ts:10,48-50` e `retentionScheduler.ts`). Transcrições só são redigidas quando alguém pede eliminação (`dataSubjectErasure.service.ts`), não de forma automática. A "resolução" do handoff onda-14 (Agente 21) diz "expurgo em 90 dias via storage lifecycle rules", mas esse status declarado não tem lastro (AGENTS.md §40, último parágrafo).
- `politica:66`: assinaturas ficam 5 anos "e então descartados". Não há job para isso. Além disso, o fundamento "Código Civil" para 5 anos precisa de revisão jurídica.
- `politica:68`: "o descarte é garantido por nossos serviços automatizados e idempotentes de Data Subject Erasure". Na prática, `eraseDataSubject()` roda por demanda (rota ADMIN/GESTOR, `src/features/lgpd/lgpd.routes.ts:16`) e por um único worker, o de 90 dias acima. Não executa os prazos da seção 4.

**P1-3. O conflito entre a cadeia append-only e o direito de eliminação ficou escondido, e o encerramento promete um expurgo que não existe.**
- `politica:19` cita "trilhas inalteráveis de consentimentos". `politica:68`, `:78` e `:83` oferecem "esquecimento" e eliminação sem nenhuma exceção.
- O ADR-006 (`docs/ADR/ADR-006-...md:53-57`) e o `docs/lgpd-base-legal.md:40-44` registram a decisão. `ConsentAuditRecord` e `ConsentAuditChainHead` **são conservados** depois da eliminação, com base no art. 8º, §2º e no art. 16, I. A eliminação do titular é por **crypto-shredding** da `ConsentSubjectKey`: fica um pseudônimo irreversível mais finalidade, versão e datas. A política precisa dizer isso, ou marcar como pendente.
- Há duas pendências abertas que a política omite:
  - o pepper por tenant ainda não é destrutível (`EnvTenantPepperProvider`; ADR-006:64-72). Hoje o desvínculo do tenant inteiro **não é cumprido**;
  - o job de offboarding "**não está implementado**" (ADR-006:76), e a `Organization` continua existindo por causa da FK RESTRICT (ADR-006:81).
- `termos-de-uso.md:58` promete que, no encerramento, "todos os dados sensíveis da sua organização serão processados para exclusão criptograficamente segura ou devidamente anonimizados". Hoje é promessa sem implementação.

**P1-4. Os dados de controlador, encarregado e contato não estão verificados e divergem da página publicada.**
- `politica:6` e `:83`, e `termos:67-68`, usam `privacy@birthhub360.com` e `suporte@birthhub360.com`. Não há evidência de que essas caixas existam. O domínio também diverge no repositório:
  - `Caddyfile.oci:2` e `docs/deploy/producao.md:211` usam `birthhub360.com.br`;
  - a página publicada `src/pages/PrivacyPolicy.tsx:69` usa `marcelo.nascimento@birthub360.com`, com outro domínio e outra pessoa;
  - `SECURITY.md:25` usa `security@birthhub360.com`.
- `politica:6` nomeia como encarregado o "Agente 21 — Privacidade e LGPD". O encarregado (art. 41) precisa ser uma pessoa natural ou jurídica indicada pelo controlador, e um agente de IA não pode ser. O mesmo vício já existe no ROPA (`INVENTARIO_TRATAMENTO_ROPA.md:3`), PRÉ-EXISTENTE.
- `politica:5` diz "Controlador: Birth Hub 360", mas não traz razão social, CNPJ nem endereço (art. 9º, III). **Não há CNPJ inventado**, o que é positivo. Precisa entrar um placeholder explícito `[A DEFINIR — DPO/Marcelo]`.

**P1-5. O consentimento de gravação de voz descrito não existe e contradiz os Termos.**
- `politica:40` diz "Consentimento explícito e inequívoco coletado no início da chamada". Na main, o consentimento existe **por organização**, não por chamada nem por interlocutor: `src/lib/voice-hub/middlewares/aiConsent.ts:10-27` e `tenantAiConsentRepository.ts`. O script de aviso ("poderá ser gravada", handoff onda-14) não aparece no código (`gh search code` vazio).
- `termos:29` atribui ao cliente a "exclusiva responsabilidade" de obter esse consentimento. As duas afirmações são incompatíveis como estão. Uma decisão do DPO precisa definir quem coleta e como isso é registrado.

### P2 — imprecisões relevantes e omissões obrigatórias

- **P2-1. Criptografia (`politica:18,54`).**
  - "Tráfego 100% via TLS 1.3" não está configurado no repositório: `Caddyfile.oci:5` serve `http://`, `nginx/birthhub360.conf:6` só tem `listen 80`, e `docs/operations/PRODUCTION_ARCHITECTURE.md:27` diz que o TLS "deve ser feito por um Reverse Proxy externo". Nenhum `ssl_protocols` ou `minVersion` foi encontrado.
  - "AES-256 no banco (em repouso)" é exagero. O que existe é cifra **por coluna** AES-256-GCM em `Contact.email/phone/whatsapp` (`prisma/migrations/20260828013314_contact_pii_encryption_blind_index/migration.sql:1-3`) e em credenciais (`src/lib/crypto/secretFields.ts:14`). O nome do contato, as transcrições e o `AuditLog` não entram nisso, e não há evidência de cifra de volume ou TDE.
  - `scripts/db/backup-encrypted.sh:16` é uma simulação, não o backup GPG que o ROPA (`:24`) afirma.
- **P2-2. Controlador ou operador.** No B2B, a base de leads é do cliente (tenant), e o Birth Hub 360 tende a ser **operador** desses dados (art. 5º, VII), enquanto é controlador dos dados dos usuários da plataforma. A política se declara controladora de tudo (`politica:5,25-45`) e manda os leads pedirem direitos direto ao Birth Hub. A qualificação precisa ser decidida pelo DPO e coerente com o DPA ou contrato.
- **P2-3. Omissões de conteúdo obrigatório:**
  - compartilhamento (art. 18, VII) e informação sobre a possibilidade de não consentir (VIII);
  - oposição (§2º) e petição à ANPD (§1º);
  - prazo de resposta (art. 19, II: 15 dias). O título em `politica:72` cita o art. 19, mas `:85` só promete "atendimento ágil";
  - **decisões automatizadas e perfilamento (art. 20).** Há scoring e qualificação por IA (`src/features/intelligence/agents/sdrQualification.agent.ts`, rota `/agent/success-prediction`, churn) e o direito de revisão não aparece;
  - **origem dos dados** que não vieram do titular (enriquecimento via Apollo, Hunter, Serper e Tavily);
  - cookies (sessão Better Auth, `src/lib/voice-hub/lib/cookies.ts`);
  - menores, ainda que só para dizer que o serviço não se destina a eles;
  - notificação de incidente (art. 48; `docs/security/runbooks/INCIDENT_RESPONSE.md:70`).
- **P2-4. Isolamento descrito em termos absolutos.** `politica:53` diz "jamais se cruzem" e `termos:20` diz "rigorosamente isolados". A RLS é real: `scripts/db/create-app-role.sql:20` (prospector_app NOSUPERUSER NOBYPASSRLS), `FORCE ROW LEVEL SECURITY` (`docs/security/RLS_COVERAGE_MATRIX.md`) e policies sem `app.bypass_rls` nas tabelas LGPD. Mas existe allowlist de bypass para descoberta cross-tenant (`autoAnonymizeDisqualified.worker.ts:28-45`, `BYPASS_RLS_ALLOWED_MODELS`), e o ADR-006:62 registra que falta evidência de que o runtime de produção usa `prospector_app`. A redação precisa descrever a medida sem garantir resultado absoluto.
- **P2-5. Duas fontes de verdade (AGENTS.md §34).** A página `src/pages/PrivacyPolicy.tsx` já está publicada no app (última atualização 25/09/2026) e diverge do PR em DPO, e-mail, bases legais (cita consentimento art. 7º, I para opt-in), suboperadores e retenção. É preciso decidir qual documento é o canônico e alinhar o outro, ou registrar que o .md é rascunho.
- **P2-6. Bases legais que pedem revisão jurídica.**
  - `politica:35`: "contrato preliminar" (art. 7º, V) para lead frio de prospecção é duvidoso, porque exige pedido do titular.
  - `politica:40`: consentimento **e** legítimo interesse para o mesmo dado de voz confunde. O handoff onda-14 usa art. 7º, I / V.
  - `politica:44-45`: o CPF de assinantes tem base "execução de contrato" e "obrigação legal/fiscal", mas o ROPA:16 só cita o art. 7º, V.
- **P2-7. `termos:33` cita *Bug Bounty*,** mas não existe programa de bug bounty: `SECURITY.md` só tem um canal de e-mail. Isso cria uma expectativa falsa de autorização para teste.

### P3 — menores, mas precisam de correção

- **P3-1. Link quebrado em `politica:93`:** `[Segurança e Compliance](SECURITY.md)` resolve para `docs/lgpd/policies/SECURITY.md`, que não existe. O arquivo está na raiz (`../../../SECURITY.md`).
- **P3-2. Vigência afirmada sem aprovação.** `politica:3` e `termos:3` dizem "Data de Vigência: 25 de Outubro de 2026", mas o texto não foi aprovado. O status deveria ser "RASCUNHO — pendente de aprovação do DPO/Marcelo".
- **P3-3. ROPA marcado como conforme sem lastro (PRÉ-EXISTENTE, fora do diff).** `docs/lgpd/INVENTARIO_TRATAMENTO_ROPA.md` está marcado "HOMOLOGADO E CONFORME" (`:5`), mas carrega as mesmas afirmações sem lastro: TLS 1.3, AES-256 no banco, backup GPG, tokenização de cartão, 90 dias de áudio e "ciclo + 12 meses". O PR herdou esses erros. A correção é do Agente 21.
- **P3-4. Termos com pontos que precisam de jurídico:**
  - `:38` "propriedade exclusiva de seus idealizadores" não indica pessoa jurídica titular;
  - `:52` remete a um "Contrato de Licenciamento (SaaS)" que não está no repositório;
  - `:70` deixa o foro para a proposta comercial;
  - `:51` traz exclusão ampla de lucros cessantes;
  - `:56` permite suspensão "a seu exclusivo critério" e também "comprovadamente";
  - `:62` promete notificação por e-mail ou in-app, um mecanismo que não verifiquei.
  - Não há SLA numérico nem certificações (ISO 27001, SOC 2) inventadas, o que é positivo.

### P4 — observações

- **P4-1. Posicionamento correto.** `docs/lgpd/policies/` é um subdiretório novo, coerente com `docs/lgpd/` (ROPA, DECISAO-REBALANCE-APPROVAL-NOTE). O PR toca só os 2 arquivos e não altera código.
- **P4-2. Pontos positivos:** a estrutura cobre as quatro categorias do ROPA, não inventa CNPJ, endereço, SLA ou certificação, o direito de revogação está bem descrito (`politica:80`) e a portabilidade tem lastro (`GET /api/lgpd/titular/:contactId/export`, `lgpd.routes.ts:54`).

## O que falta para reaudição

1. Corrigir P1-1 a P1-5 e P2-1 a P2-7 (ou marcar cada item como `[PENDENTE — decisão DPO]`) num novo head.
2. Sair do Agente 21 (consolidador do ROPA, AGENTS.md §27) a tabela de retenção única e verdadeira, que vale para o ROPA, a base legal, o código e a política, e a lista de suboperadores.
3. O DPO/Marcelo definir controlador, CNPJ, encarregado (pessoa real), canal de contato e qualificação controlador/operador.
4. O CI do head precisa ter o application gate executado (depende do #67 para o trivy).

## Decisão

**REPROVADO** @ `638677ce`. O texto promete tokenização universal antes da IA, não-treinamento, prazos de retenção automáticos, expurgo no encerramento, TLS 1.3 e AES-256 no banco e consentimento por chamada, e nada disso existe na main. Também omite suboperadores, transferência internacional, decisões automatizadas e a exceção da cadeia de consentimento ao direito de eliminação. **Mesmo depois de corrigido, um APROVADO do 24 cobre só a precisão técnica. A publicação exige a aprovação jurídica do DPO/Marcelo.**
