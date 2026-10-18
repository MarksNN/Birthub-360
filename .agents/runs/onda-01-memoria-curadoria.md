# ONDA 01 — MEMÓRIA TÉCNICA: DATA FLYWHEEL & APRENDIZADO CONTÍNUO
**Projeto:** Birthub 360  
**Onda:** 01 — Fundação da Inteligência Autônoma  
**Data:** 2026-10-17  
**Proprietários:** Agente 00 (Coordenador), Agente 07 (IA e Automações), Agente 04 (CRM e BI)

---

## 1. Visão Geral e Arquitetura

O **Data Flywheel & Aprendizado Contínuo** é o subsistema responsável por transformar interações reais da operação comercial (ligações no VoiceHub, mensagens no Social Selling, reuniões e objeções no CRM) em conhecimento estruturado, retroalimentando o **Playbook**, os cenários de **Roleplay**, o **RAG Híbrido** e os modelos de geração de abordagem.

```
       [ Operação Comercial ]
        ├── VoiceHub (Voz/Telefonia)
        ├── Social Selling (WhatsApp / LinkedIn)
        └── CRM 360° (Oportunidades & Deals)
                 │
                 ▼
       [ Event Mesh: VOICE_CALL_COMPLETED / SOCIAL_INTERACTION_RECEIVED ]
                 │
                 ▼
     [ Pipeline de Extração e Normalização ]
                 │
                 ▼
       [ Flywheel de Curadoria ] ──> Status: DETECTED / NORMALIZED
                 │
                 ├───────────────────────────────┐
                 ▼                               ▼
       [ Validação de Negócio ]        [ Rastreamento Causal ]
        • Deduplicação de Objeções      • Atribuição Temporal (<= 90 dias)
        • Similaridade Semântica        • Correlação com Won/Lost
        • Limiar de Confiança >= 0.85   • Taxa de Conversão >= 25%
                 │                               │
                 ▼                               ▼
       [ Review Humano / Gestor ]      [ Promoção Few-Shot Library ]
        Status: REVIEW_REQUIRED         Status: PROMOTED_FEW_SHOT
                 │                               │
                 ▼                               ▼
       [ Promoção Aprovada ]           [ Injeção nos Agentes ]
        • Matriz de Objeções            • RevOps Co-pilot
        • Cenários de Roleplay          • Gerador de Abordagens
        • RAG Híbrido do Tenant         • Coaching de Vendedores
```

---

## 2. Ciclo de Vida da Curadoria de Objeções

O serviço `CuratedObjectionService` (`src/features/playbook/services/curatedObjection.service.ts`) implementa uma máquina de estados estrita para cada objeção capturada:

1. **`DETECTED`**: Objeção identificada pelo LLM ou transcrição durante uma chamada ou troca de mensagens.
2. **`NORMALIZED`**: Remoção de PII, limpeza de ruído e categorização primária.
3. **`REVIEW_REQUIRED`**: Quando o índice de confiança é menor que 0.90 ou se trata de categoria de alto impacto (Ex: Segurança/LGPD, Contratos), exigindo chancela de um gestor comercial.
4. **`VERIFIED`**: Objeção com alta confiança (>= 0.90) ou aprovada pelo gestor.
5. **`PROMOTED`**: Promovida formalmente para a `ObjectionMatrixItem` do tenant no banco PostgreSQL, ficando imediatamente disponível para os treinos de **Roleplay** (`PlaybookRoleplayAdapter`) e argumentos recomendados no CRM.
6. **`RETRACTED`**: Objeção cancelada ou expurgada (por exemplo, após revogação de consentimento do titular de dados ou desatualização de produto), sendo removida em tempo real de treinos futuros.

---

## 3. Flywheel de Abordagens Comerciais Vencedoras (Few-Shot Copys)

O serviço `CommercialLearningFlywheelService` (`src/features/intelligence/services/commercialLearningFlywheel.service.ts`) executa o aprendizado causal:

- **Registro de Abordagem**: Cada abordagem gerada por IA ou enviada por vendedor é registrada com hash de conteúdo, canal (`WHATSAPP`, `LINKEDIN`, `EMAIL`), segmento, e IDs associados.
- **Atribuição de Desfecho**: Quando o evento `DEAL_WON` é publicado no Event Mesh:
  - O serviço busca abordagens vinculadas ao lead nos últimos 90 dias.
  - Avalia o lift de conversão e a frequência de sucesso do padrão de abordagem.
  - Abordagens com taxa de conversão acima de 25% e volume estatisticamente significativo são promovidas à biblioteca `FewShotCopyLibrary`.
- **Injeção Dinâmica**: Novos prompts de Social Selling utilizam as melhores copys do próprio tenant como exemplos few-shot, elevando continuamente a taxa de resposta e assertividade.

---

## 4. Integração com Capacidades de Negócio

| Capacidade | Ponto de Integração | Benefício Prático |
| :--- | :--- | :--- |
| **C1 — RevOps** | Atribuição de pipeline a abordagens específicas | Visibilidade de ROI por padrão de copy e objeções mais frequentes por estágio. |
| **C2 — Gamificação** | Superação de objeções registradas | Pontuação para vendedores que contornam objeções recém-promovidas no CRM. |
| **C3 — Roleplay** | `PlaybookRoleplayAdapter.ts` | Cenários de simulação sempre atualizados com os desafios reais da semana. |
| **C4 — Social Selling** | Biblioteca de Few-Shot Copys | Geração de mensagens ultra-personalizadas baseadas no que mais converte no tenant. |
| **C5 — VoiceHub** | Ingestão automática pós-chamada | Objeções detectadas na fala do cliente entram instantaneamente no funil de curadoria. |
| **C6 — Mobile** | Sincronização offline-ready de playbooks | Vendedor de campo acessa os contornos mais recentes mesmo sem conexão. |

---

## 5. Garantias de Tenancy e LGPD

1. **Separação por Tenant**: Objeções e copys vencedoras possuem `organizationId` obrigatório; nunca há compartilhamento entre empresas distintas.
2. **Anonimização Pré-Ingestão**: Nomes de clientes, telefones e CPFs são substituídos por pseudônimos reversíveis na sessão ou máscaras irreversíveis antes da normalização da objeção.
3. **Mecanismo de Retração Imediata**: Se um contato solicitar exclusão sob o Art. 18 da LGPD, o `ConsentAuditChainService` emite evento de revogação, e o `CuratedObjectionService` retira do ar qualquer objeção ou copy originada daquele contexto.
