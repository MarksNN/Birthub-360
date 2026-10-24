De: 00 — Coordenador
Para: 08 — QA e Release
Onda: onda-dividas-20261014
Status: resolvido (APROVADO pelo Agente 24 em .agents/reviews/24-liquidacao-geral-dividas-e-forense-20261023.md)
Prioridade: alto
Bloqueador-ref: DEBT-20261014-UX-001
Sprint destino: Saneamento Onda 01

## Problema
Dependência de Build/PWA: Configuração do vite-plugin-pwa armazena em cache rotas autenticadas de CRM sem particionamento.

## Arquivo(s) envolvido(s)
vite.config.ts:61-66

## Evidência
Base de auditoria: `9373fb224a8aba30a39f7d10d1a2be639c35af78`.
Configuração runtimeCaching intercepta chamadas GET para rotas de CRM com política de cache por URL estática, servindo payload do usuário anterior para novo usuário na mesma máquina.

## Alteração necessária
Alterar estratégia de runtimeCaching no vite.config.ts para NetworkOnly nas rotas `/api/crm/*` ou NetworkFirst com validação de token/sessão nos headers, impedindo reutilização entre identidades.

## Teste esperado
Simulação de duas requisições GET com cabeçalhos de autorização distintos no Service Worker garantem que não há reaproveitamento de resposta cacheada.
- Typecheck (`npx tsc --noEmit`) e Lint (`npm run lint`) limpos na área afetada.

## Contexto adicional
Propriedade de vite.config.ts e CI pertence ao Agente 08. Requer alinhamento com Agente 09 e 02.
Este handoff de dependência/pré-requisito foi preparado durante a Auditoria Forense Incremental de Dívidas Técnicas (Agente 00).
A execução da correção física está ESTRITAMENTE BLOQUEADA até aprovação humana explícita.
Revisão independente obrigatória do Agente 24 antes de qualquer merge.
