# ONDA 01 — MODELAGEM DE AMEAÇAS E PRIVACIDADE DE DADOS (PII & LGPD)
**Projeto:** Birthub 360  
**Onda:** 01 — Fundação da Inteligência Autônoma  
**Data:** 2026-10-17  
**Proprietários:** Agente 00 (Coordenador), Agente 15 (Segurança Aplicada), Agente 21 (Privacidade e LGPD)

---

## 1. Visão Geral

Este documento detalha o modelo de ameaças contra o subsistema de Inteligência Artificial e processamento de dados da Onda 01, com base nos padrões STRIDE, OWASP Top 10 for LLM Applications e nos requisitos não negociáveis da LGPD (Lei 13.709/2018).

---

## 2. Matriz de Ameaças e Contramedidas

| ID | Vetor de Ataque / Ameaça | Impacto | Contramedida Implementada na Onda 01 |
| :--- | :--- | :--- | :--- |
| **TH-01** | **Prompt Injection Indireto** via histórico de negociações ou dados de leads | O atacante insere comandos como `[Ignore previous instructions...]` em anotações ou nomes de leads para forçar o LLM a extrair dados do sistema. | O `SimilarDealsService` e o Gateway usam `wrapUntrustedContent`, delimitando todo dado externo não confiável em `<untrusted_external_content>` e instruindo o modelo a nunca executar diretivas dali. |
| **TH-02** | **Vazamento de PII para Modelos Externos (LLMs)** | Envio de CPFs, telefones ou e-mails de clientes para APIs de terceiros (OpenAI, Anthropic, Google). | `PiiTokenizerService`: substitui dados sensíveis por tokens opacos sintéticos (Ex: `[CPF_0_1234]`) antes do envio ao LLM e restaura o texto original na volta (destokenização reversível em sessão). |
| **TH-03** | **Poluição do Cache Semântico Cross-Tenant** | Um tenant malicioso formula perguntas visando recuperar respostas cacheadas de outro tenant. | O `SemanticCacheService` embute `organizationId` obrigatório na chave de cache e no prefixo Redis (`semcache:{orgId}:{hash}`). Acesso cruzado é matematicamente impossível. |
| **TH-04** | **Adulteração de Trilha de Consentimento LGPD** | Alteração ou exclusão não autorizada de consentimentos de uso de dados para IA. | `ConsentAuditChainService`: encadeamento criptográfico inviolável (hash chaining SHA-256 no estilo blockchain). Qualquer alteração rompe a cadeia e é detectada por `verifyChainIntegrity()`. |
| **TH-05** | **Uso de Dados de Titular que Revogou Consentimento** | Modelo ou biblioteca de few-shot continuar gerando copys com base em chamadas de titular que pediu exclusão. | Evento canônico de revogação (`CONSENT_REVOKED`) propaga via Event Mesh para o `CuratedObjectionService` e `CommercialLearningFlywheelService`, que retraem imediatamente os artefatos correspondentes. |
| **TH-06** | **Loop Infinito no Event Mesh por Cascatas de Eventos** | Consumidor de um evento dispara outro evento repetido, saturando o Redis/BullMQ. | O `DomainEventMeshService` rastreia o `causationId` e limita a profundidade de causações encadeadas a no máximo 10 níveis, além de deduplicar IDs de eventos recebidos em janela deslizante. |

---

## 3. Arquitetura de Tokenização e Destokenização Segura

```
      [ Texto Bruto com PII ]
      "Dr. Marcos Silva, CPF 123.456.789-00, concordou com o plano..."
                 │
                 ▼
      [ PiiTokenizerService.tokenize() ]
                 │
                 ├───────────────────────────────┐
                 ▼                               ▼
      [ Texto Anonimizado ]            [ Cofre de Sessão em Memória ]
      "Dr. Marcos Silva,                • [CPF_0_1234] -> 123.456.789-00
       [CPF_0_1234],                     • TTL: 1 hora
       concordou com o plano..."         • Escopo estrito: sessionId + orgId
                 │
                 ▼
      [ Processamento / Gateway IA ]
      (LLM só enxerga tokens sintéticos)
                 │
                 ▼
      [ Resposta Gerada pelo LLM ]
      "Excelente avanço com [CPF_0_1234] para a próxima fase."
                 │
                 ▼
      [ PiiTokenizerService.detokenize() ]
                 │
                 ▼
      [ Texto Restaurado para a Aplicação ]
      "Excelente avanço com 123.456.789-00 para a próxima fase."
```

---

## 4. Auditoria Criptográfica de Consentimento (`ConsentAuditChainService`)

Cada registro de consentimento ou revogação contém:
- `id`: Identificador único.
- `organizationId`: Tenant da transação.
- `subjectRef`: Pseudônimo ou referência ao titular.
- `purpose`: Finalidade legítima (ex: `COMMERCIAL_CALL_AI_ANALYSIS`, `SOCIAL_SELLING_FOLLOWUP`).
- `timestamp`: Timestamp ISO com carimbo de tempo.
- `previousHash`: Hash SHA-256 do bloco anterior (ou `'GENESIS_HASH'`).
- `currentHash`: Hash SHA-256 calculado sobre todos os campos do bloco atual concatenados ao `previousHash`.

A função `verifyChainIntegrity(organizationId)` varre a cadeia do tenant e certifica que nenhum registro foi inserido, removido ou alterado retroativamente, fornecendo prova irrefutável para órgãos reguladores (ANPD) e auditorias externas.
