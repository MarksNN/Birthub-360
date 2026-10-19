# ESTRATÉGIA DE ROLLBACK E CONTINGÊNCIA — ONDA 03
**Onda:** 03 — Autonomia Comercial: Agentes Autônomos Supervisionados e Execução Multicanal Confiável  
**Agente Responsável:** Agente 00 — Coordenador / Agente 10 — Infraestrutura, Observabilidade e SRE  
**Revisão:** 2026-10-18  
**Status:** PLANEJADO & HOMOLOGADO  
**Branch de Integração:** `integracao/onda-03`  
**Commit Base:** `main` (commit `84fba8a1`, Ondas 00, 01 e 02 integradas)

---

## 1. Princípio de Isolamento e Não Destrutividade
Todas as adições da Onda 03 foram desenvolvidas de forma modular e aditiva. Nenhuma migração destrutiva de banco de dados foi introduzida no `prisma/schema.prisma` (preservando o freeze de schema estabelecido pela governança). Portanto, o rollback é 100% limpo, determinístico e sem risco de perda de integridade relacional.

---

## 2. Cenários de Rollback

### Cenário 1: Falha Funcional em Ambiente de Teste / Pré-Merge
Se qualquer anomalia ou regressão for detectada antes do merge formal na branch `main`:
1. Permanecer na branch `integracao/onda-03`.
2. Reverter os commits pontuais defeituosos ou aplicar correções cirúrgicas.
3. Não há impacto no branch estável `main`.

### Cenário 2: Rollback Pós-Merge Imediato na Branch `main`
Se após o merge autorizado em `main` for detectado comportamento indesejado em produção:
1. Reverter o merge commit na branch `main` via git revert:
   ```bash
   git checkout main
   git revert -m 1 <MERGE_COMMIT_HASH> -m "revert(onda-03): rollback preventivo da onda 03 por contingência"
   git push origin main
   ```
2. Executar os gates canônicos na `main` (`npm run typecheck`, `npm run lint`, `npm run build`).
3. Re-disparar o pipeline de deploy para que o cluster restabeleça a versão estável da Onda 02.

### Cenário 3: Desativação Cirúrgica via Feature Flag (Sem Rollback de Código)
Cada evolução da Onda 03 possui guardrails operacionais e feature flags de contingência:
- **SDR Autônomo:** Se a operadora SIP ou o gateway de voz apresentar degradação, desativar flag `ENABLE_AUTONOMOUS_SDR_DIALING=false`. A aplicação desliga as chamadas ativas sem afetar o VoiceHub receptivo.
- **Cadência Multicanal:** Se houver indisponibilidade da API do WhatsApp ou provedor de e-mail, ativar fallback para fila em espera com flag `ENABLE_MULTICHANNEL_DISPATCH=false`.
- **Governador de Autonomia:** O disjuntor automático (`Circuit Breaker`) já rebaixa a autonomia dos agentes de IA para modo exclusivamente consultivo caso a taxa de erro ultrapasse 5%.

---

## 3. Matriz de Impacto e Recuperação

| Componente | Mecanismo de Rollback | Tempo Estimado | Risco de Dados |
|---|---|:---:|:---:|
| **SDR Autônomo** | Desativação da Flag ou Revert de Branch | < 1 min | Nulo (logs preservados) |
| **Cadência Adaptativa** | Pausa de fila via Redis/Queue | < 30 seg | Nulo (toques em fila) |
| **Propostas Comerciais** | Suspensão de despacho para e-signature | < 30 seg | Nulo (rascunhos mantidos) |
| **Governador de Autonomia** | Ativação manual de Tier 0 (read-only) | Imediato | Nulo |
