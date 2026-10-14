# Onda lançamento 2026-10-14 — matriz e missão
Coordenador: 00. Base: 9373fb224a8aba30a39f7d10d1a2be639c35af78. Branch integração: integracao/onda-lancamento-20261014.
Objetivo: varredura dos 26 papéis, somente correções necessárias ao lançamento e relatório HTML completo.
Estados: PLANEJADA -> MATRIZ_PUBLICADA -> EM_EXECUCAO. Nenhum release autorizado.
Capacidade: 4 slots reais (00 + 3 especialistas). Papéis especializados executados em sequência dentro de cada slot, sem simultaneidade 01/01A, 06/06A ou 08/08A. Revisor 24 separado após autores.
Slot fundação: 01, 01A, 15, 21, 06, 06A, 12, 16. Worktree .worktrees/lancamento-fundacao; branch agente/01-varredura-lancamento.
Slot produto: 02, 03, 04, 05, 07, 13, 17, 23. Worktree .worktrees/lancamento-produto; branch agente/02-varredura-lancamento.
Slot operação: 08, 08A, 09, 10, 11, 14, 18, 22. Worktree .worktrees/lancamento-operacao; branch agente/08-varredura-lancamento.
Propriedade: cada papel respeita AGENTS.md e prompt; alterações fora do domínio exigem handoff. Nenhuma alteração em prompt/governança. server.ts/package.json/lockfile exigem autorização do 00 após evidência concreta.
Fora de escopo: novas features, redesign, refatorações cosméticas, deploy, push, merge de produto não auditado, mensagens externas.
Suposições: varredura priorizada de lançamento, cobertura direcionada e não prova exaustiva de ausência de bugs. Histórico não comprova estado atual. Sem node_modules no checkout; gates indisponíveis devem ser explicitados.
Plano: ler prompts/regras/histórico -> localizar falhas concretas por domínio -> verificar chamadas/contexto e testes -> corrigir mínimo quando seguro e verificável -> comunicar dependências -> consolidar HTML -> auditoria 24 por hash -> entregar artefato.
Critérios: 26 papéis com área examinada, evidências arquivo/linha, achados deduplicados, impacto/reprodução/correção/teste/dono/prioridade. Correções sem gates não serão integradas ou anunciadas validadas. Relatório sem segredos/PII, HTML válido, navegável, impressão, prioridades de lançamento e limites. Parecer 24 APROVADO para relatório exato; parecer documental não autoriza release.
Orçamento: 3 execuções especializadas com 8 papéis sequenciais cada + 00 e 24, reutilização para remediação/revisão. Não é alegado que existem 26 processos simultâneos.
Entrega: relatório HTML e evidências sanitizadas persistentes; testes reais distinguidos de não executados; pendências acionáveis por proprietário.

