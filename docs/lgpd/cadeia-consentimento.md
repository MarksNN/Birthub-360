# Cadeia de consentimento e expurgo (REMED-06) — base legal, retenção e inventário

Dono: Agente 21 — Privacidade e LGPD. Código: `src/lib/security/consentAuditChain.service.ts`,
`consentChainFactory.ts`, `subjectTokenizer.ts`, `canonicalJson.ts`,
`prismaConsentAuditChain.repository.ts`, `src/bootstrap/consentPurgeWiring.ts`.

## Finalidade e base legal
| Tratamento | Finalidade | Base legal (Lei 13.709/2018) |
|---|---|---|
| Evento CONSENT | Provar que o consentimento foi obtido, para qual finalidade e versão de termos | art. 7º, I; art. 8º, caput e §2º (ônus da prova do controlador) |
| Evento REVOCATION | Registrar a revogação e seu motivo (enum) | art. 8º, §5º; art. 18, IX |
| Evento RETRACTION | Provar que o expurgo foi executado (contagens, sem conteúdo) | art. 18, VI e §6º; art. 16, I (cumprimento de obrigação legal) |
| `ConsentEventDetail` (texto livre opcional) | Contexto operacional da solicitação | art. 7º, II; expurgado no esquecimento |
| `ConsentPurgeTask` | Outbox de expurgo reprocessável | art. 18, VI; art. 46 (segurança) |
| `ConsentSubjectKey` | Chave por titular para pseudonimização | art. 13, §4º / art. 12 (pseudonimização); destruída no esquecimento |

## O que vai e o que NÃO vai para a cadeia
- `subjectRef` gravado = `hs256:` + HMAC-SHA256(chave aleatória do titular, subjectRef NFC). Não é
  hash simples nem reversível. A chave do titular é endereçada por HMAC(pepper do tenant, subjectRef);
  o pepper vem de `LGPD_SUBJECT_PEPPER_SECRET` (env) ou do KMS (`KmsTenantPepperProvider`), nunca do git.
- Motivo da revogação: somente `REVOCATION_REASON_CODES`
  (`TITULAR_REQUEST`, `ERASURE_REQUEST`, `PURPOSE_FULFILLED`, `LEGAL_OBLIGATION`, `OPERATOR_CORRECTION`).
  Texto livre vai para `ConsentEventDetail`, fora da cadeia.
- `verify` rejeita qualquer evento não-gênese cujo `subjectRef` não seja um token `hs256:` (PII_IN_CHAIN).

## Esquecimento (crypto-shredding)
`ERASURE_REQUEST` agenda, na mesma transação da revogação, uma tarefa que: executa os expurgos,
grava RETRACTION, destrói a `ConsentSubjectKey` do titular e apaga seus `ConsentEventDetail`.
Os eventos antigos continuam íntegros (hash não muda), mas deixam de ser religáveis ao titular.

## Retenção
| Dado | Retenção |
|---|---|
| Eventos da cadeia (sem PII) | Enquanto durar a relação + prazo prescricional; padrão 5 anos após o último evento do titular (revisar com o jurídico) |
| `ConsentSubjectKey` | Até o esquecimento (destruída) |
| `ConsentEventDetail` | Até o esquecimento ou `retentionUntil` do consentimento |
| `ConsentPurgeTask` | `subjectRef` anulado ao concluir; registro mantido `LGPD_PURGE_TASK_RETENTION_DAYS` (padrão 1825) e depois excluído |

## Mapeamento `subjectRef`
`subjectRef` é o identificador interno do titular no domínio comercial: `leadId` (Flywheel) e
`dealId` (autópsia win/loss usa `dealId` como `leadId` ao promover few-shot). Nunca e-mail/telefone.

## Inventário do expurgo (P2-5)
| Artefato | Cobertura |
|---|---|
| Flywheel — abordagens e few-shot (memória + `FlywheelApproachRecord`/`FlywheelFewShotExample`) | Exclusão física por tenant+titular |
| Autópsia win/loss (`reportsStore`) | Exclusão por `dealId == subjectRef` |
| Cache semântico de IA | Invalidação do tenant inteiro (não há índice por titular) |
| Outras instâncias | Redis pub/sub `lgpd:consent-purge:v1` repete os expurgos locais (idempotentes) |
| Embeddings (`vector.service`/knowledge) | Fora: indexam documentos de conhecimento, não dados do titular. Reavaliar se passarem a indexar conversas |
| Logs (pino) | Fora: logs só levam ids e contagens; retenção pela infraestrutura de logs (Agente 10) |
| Dados de CRM | Cobertos por `dataSubjectErasure.service.ts` (rota `DELETE /lgpd/titular/:contactId`) |

## Integridade
- `hash = sha256(previousHash + canonicalJson(payload))`, `formatVersion = 3`.
- Gênese por tenant + `ConsentAuditChainHead` (gênese esperado, última sequence/hash) atualizado
  na mesma transação: detecta adulteração, reordenação, lacunas, truncamento e recriação.
- Checkpoint externo (S3 Object Lock ou log assinado no KMS): follow-up do Agente 15/10.
