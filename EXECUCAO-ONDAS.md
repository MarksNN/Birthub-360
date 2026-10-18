# EXECUÇÃO DE ONDAS — MAPA CANÔNICO DE GOVERNANÇA E EXECUÇÃO

**Data:** 2026-10-17  
**Projeto:** Birth Hub 360°  
**Autoridade:** `AGENTS.md` (Governança Global de Agentes)  
**Coordenador:** Agente 00 — Coordenador Global de Engenharia e Orquestração

---

## 1. Finalidade deste Documento
Este arquivo serve como ponto de entrada canônico para o planejamento, rastreamento e execução de ondas no repositório Birthub 360, atendendo à referência normativa do `AGENTS.md` e do `00-coordenador.md` sem violação da proibição de alteração autônoma de prompts.

---

## 2. Documentação Viva das Ondas Ativas e do Backlog

### Onda Ativa de Saneamento (`onda-dividas-20261014`)
- **Plano Mestre de Saneamento por Ondas (Onda 00 a Onda 09):**  
  [birthub360-plano-saneamento-dividas.md](file:///c:/Github/Birthub-360/.agents/audits/technical-debt/2026-10-14/source/birthub360-plano-saneamento-dividas.md)
- **Matriz de Atribuição por Agente Especialista:**  
  [birthub360-matriz-agentes-dividas.md](file:///c:/Github/Birthub-360/.agents/audits/technical-debt/2026-10-14/source/birthub360-matriz-agentes-dividas.md)
- **Relatório Forense Completo das 40 Dívidas Técnicas:**  
  [birthub360-auditoria-dividas-tecnicas.md](file:///c:/Github/Birthub-360/.agents/audits/technical-debt/2026-10-14/source/birthub360-auditoria-dividas-tecnicas.md)
- **Registro Vivo de Status de Remediação:**  
  [remediation-status.json](file:///c:/Github/Birthub-360/.agents/audits/technical-debt/2026-10-14/progress/remediation-status.json)

---

## 3. Ondas Estratégicas Homologadas (Histórico Consolidado)

1. **Onda de Elevação das 6 Capacidades Estratégicas (`agente/00-elevacao-6-capacidades`):**
   - Capacidades: RevOps, Gamificação, Roleplay, Social Selling, VoiceHub, Mobile.
   - Status: 123 testes (79 unitários + 44 integração) aprovados com Parecer Independente do Agente 24.
   - Relatório: [.agents/runs/00-relatorio-consolidacao-prontidao-producao-20261017.md](file:///c:/Github/Birthub-360/.agents/runs/00-relatorio-consolidacao-prontidao-producao-20261017.md).
2. **Onda UI-1 (Modernização da Interface & Design System):**
   - Status: Integrado na `main` com Parecer Aprovado do Agente 24.
3. **Onda Turbo (Motor de Prospecção e Catálogo):**
   - Status: Integrado na `main` (PR #682).
4. **Onda Resgate e Dialer P0:**
   - Status: Integrado na `main` (PR #688 e PR #715).

---

## 4. Regras Operacionais para Novos Coordenadores
- Nenhum agente altera código de produto sem ter sua propriedade declarada na matriz da onda.
- Testes unitários (`npm run test:unit`) e typecheck (`npx tsc --noEmit`) devem permanecer estritamente verdes antes de submeter diffs para revisão do Agente 24.
- Todo handoff concluído deve ter sua seção `## Resolução` preenchida com data, SHA de commit e testes executados, alterando o cabeçalho para `Status: resolvido`.
