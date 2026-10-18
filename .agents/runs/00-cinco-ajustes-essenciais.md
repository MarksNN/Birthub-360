# OS CINCO AJUSTES ESSENCIAIS DA PLATAFORMA — ONDA 00
**Projeto:** Birth Hub 360° / Birthub 360  
**Onda:** `00 — Fundação e Preparação`  
**Data:** 2026-10-18  
**Autoridade:** `AGENTS.md`  
**Coordenador:** Agente 00 — Chief Commercial Intelligence Engineering Orchestrator  
**Auditor Independente:** Agente 24 — Revisão Independente  

---

## 1. Finalidade

Os Cinco Ajustes Essenciais estabelecem os requisitos transversais e guardrails invioláveis que devem reger todas as 20 evoluções estratégicas distribuídas nas Ondas 01 a 05. Nenhuma funcionalidade nova será homologada sem atender a estes critérios.

---

## 2. Especificação Técnica dos Cinco Ajustes

### AJUSTE 1 — Memória com Curadoria
- **Princípio:** O Playbook Comercial e a base de conhecimento de vendas não podem ser contaminados por conversas aleatórias ou alucinações de modelos. Transcrições brutas de reuniões ou diálogos de WhatsApp **NUNCA** alteram o Playbook Oficial automaticamente.
- **Requisitos Não-Negociáveis:**
  1. **Fonte Verificável:** Todo novo exemplo ou contra-argumento deve referenciar um identificador de origem auditável (`callId`, `meetingId`, `dealId`).
  2. **Consentimento e Finalidade (LGPD):** O dado de origem deve possuir anuência comprovada na cadeia de consentimento (`consentAuditChain.service.ts`).
  3. **Minimização de PII:** Sanitização completa de nomes pessoais, CPFs e dados de contato sensíveis antes da ingestão na memória compartilhada.
  4. **Deduplicação Semântica:** Verificação de cosseno contra a base de conhecimento para evitar redundância (threshold $> 0.88$).
  5. **Confidence Score Mínimo:** Análise de relevância com score $\ge 0.80$.
  6. **Aprovação Humana Obrigatória (*Human Gatekeeper*):** Sugestões de aprendizado entram em uma fila de "Propostas de Melhoria do Playbook", exigindo a aprovação explícita do gestor de vendas antes da indexação no motor RAG corporativo.
  7. **Retração e Expurgo:** Capacidade imediata de desindexação em caso de revisão legal ou descontinuação de produto.

### AJUSTE 2 — Aprendizado por Resultados Verificáveis
- **Princípio:** Distinguir correlação estatística superficial de causalidade comercial real.
- **Requisitos Não-Negociáveis:**
  1. **Causalidade Comprovada:** Um modelo de mensagem ou argumento de vendas só pode ser promovido ao status de "Melhor Prática" se comprovadamente precedeu a conversão de um marco comercial concreto (ex.: avanço de estágio no funil, aceite de proposta, assinatura de contrato).
  2. **Controle de Falsos Positivos:** O sistema penaliza abordagens que geram reuniões que resultam em no-show sistemático ou desqualificação imediata por ICP inadequado.
  3. **Janela Temporal de Atribuição:** A atribuição de sucesso é delimitada pela janela de tempo média do ciclo de vendas da organização (ex.: 30 dias para B2B transacional, 90 dias para corporativo).

### AJUSTE 3 — RAG Multi-Tenant Seguro
- **Princípio:** Vazamento de contexto entre organizações é uma falha de segurança P0 inaceitável.
- **Requisitos Não-Negociáveis:**
  1. **Injeção de Tenant no Nível de Consulta:** O identificador `organizationId` é injetado diretamente na cláusula `WHERE` da busca SQL no PostgreSQL/pgvector antes de qualquer cálculo de distância.
  2. **Proibição de Pós-Filtragem em Memória:** É terminantemente vedado buscar top-K vetores globais e filtrar em JavaScript.
  3. **RBAC no Nível de Chunk:** Documentos marcados como confidenciais para cargos de liderança (ex.: margens de desconto) não são recuperados por consultas de SDRs.
  4. **Proveniência Rastreável:** Todo chunk retornado ao agente de IA carrega os metadados `{ documentId, title, version, pageNumber, confidence }`.

### AJUSTE 4 — Eventos Confiáveis e Desacoplados
- **Princípio:** Eventos de negócios (ex.: lead qualificado, deal ganho, opt-out registrado) devem trafegar de forma assíncrona, segura e sem duplicação.
- **Requisitos Não-Negociáveis:**
  1. **Payloads Versionados:** Todo evento trafega com cabeçalho de contrato e versão semântica (`schemaVersion: "1.0.0"`).
  2. **Transactional Outbox:** Eventos críticos de receita devem ser gravados na mesma transação atômica do banco de dados antes da publicação no barramento de mensageria.
  3. **Consumidores Idempotentes:** Todo worker deve registrar a chave `eventId` no Redis com TTL de segurança para ignorar reenvios acidentais.
  4. **Retries com Backoff Exponencial e DLQ:** Falhas transitórias realizam 3 retries com jitter; persistindo a falha, a mensagem é preservada na Dead Letter Queue para auditoria.
  5. **Prevenção de Ciclos:** Trava de profundidade máxima de chamada (máximo 3 encadeamentos de eventos) para evitar tempestades de broadcast.

### AJUSTE 5 — IA Explicável e Supervisionada
- **Princípio:** A inteligência artificial atua como copiloto e força auxiliar dos vendedores, nunca como uma "caixa preta" arbitrária que toma ações de risco sem supervisão.
- **Requisitos Não-Negociáveis:**
  1. **Rastreabilidade da Decisão:** Qualquer recomendação de ação (Next Best Action) ou score de risco de oportunidade deve exibir ao usuário os fatos determinantes (ex.: "Risco Alto: 12 dias sem contato, concorrente Y mencionado na última ligação").
  2. **Score de Certeza Visível:** Toda sugestão deve declarar seu nível de confiança (ex.: "85% de confiança").
  3. **Limites de Autonomia Operacional:** O Agente de IA tem autonomia para rascunhar mensagens, sugerir horários e organizar tarefas, mas é **PROIBIDO** de:
     - Fechar negociações sem confirmação humana.
     - Assinar contratos ou comprometer receita da empresa.
     - Enviar comunicações externas em massa sem aprovação de lote.
  4. **Cálculo Determinístico pelo Backend:** Pontuações de gamificação, scores de saúde de oportunidade e limites de crédito são calculados por funções puras e determinísticas no backend TypeScript/Postgres, nunca inferidos probabilisticamente pelo prompt do LLM.
