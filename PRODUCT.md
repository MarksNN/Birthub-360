# PRODUCT.md — Birth Hub 360°

<!-- impeccable:product-schema 1 -->

## Platform

Web (Desktop & Mobile) com empacotamento Android/Capacitor.

## Users

Operadores comerciais (SDRs, BDRs, Closers) e liderança executiva (Gestores, Diretores e Founders). Necessitam de densidade executiva, foco operacional sem latência, recomendações de IA contextualizadas e visão unificada 360° do pipeline de receita.

## Product Purpose

O Birth Hub 360° é o **Sistema Operacional de Revenue Intelligence** projetado para unificar inteligência preditiva, orquestração de vendas e execução em tempo real. Não é um CRM convencional: conecta dados, decisões automatizadas e cadências ativas.

## Os 4 Imperativos Funcionais

1. **Dados em Movimento, Não Arquivados:** Sincronização bidirecional resiliente com Bitrix24, enriquecimento automático e eliminação de inputs manuais.
2. **IA Ativa e Copiloto Contextual:** Operando no mesmo espaço da decisão comercial (HUD ao vivo, NBA e síntese executiva).
3. **Velocidade e Foco Operacional:** Resposta sub-segundo, Command Palette global (⌘K) e layouts de alta densidade (Bento Grids).
4. **Resiliência e Observabilidade:** Implementação obrigatória dos 4 estados de tela (Loading, Empty, Error, Stale).

## Os 8 Pilares do Ecossistema 360°

1. **Hub Central:** Visão consolidada 360°, feed de alertas inteligentes e cockpit diário.
2. **Intelligence & Scoring:** Modelos preditivos de propensão, ICP Matching e diagnósticos.
3. **Sales Orchestration:** Playbooks vivos, roteiros dinâmicos e matriz de objeções.
4. **Real-time Performance:** Métricas ao vivo, ranking de metas e saúde do pipeline.
5. **Revenue Forecast:** Projeções ponderadas de receita, análise de dispersão e win/loss.
6. **Copiloto IA:** Agente conversacional especializado em vendas B2B e simulador com roleplay.
7. **Automações & Gatilhos:** Distribuição de leads, notificações de estagnação e sincronizações em background.
8. **Cadência & Engajamento:** Sequenciamento multicanal (E-mail, WhatsApp, LinkedIn e Voz via 3CX/Baileys).

## Governança & Restrições Estritas

- **Regra do Usuário:** É expressamente proibido alterar a Landing Page e a Tela de Login.
- **Zero Mock em Produção:** Proibido inventar dados. Na ausência de dados, exibir Zero State explícito.
- **Multi-tenancy Rigoroso:** Isolamento por tenant em todas as queries com RLS.
- **LGPD:** Sanitização de PII e garantia de exclusão/anonimização do titular.
