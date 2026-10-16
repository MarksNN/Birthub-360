De: 00 — Coordenador
Para: 02 — Produto e UX
Onda: onda-dividas-20261014
Status: aberto
Prioridade: alto
Bloqueador-ref: DEBT-20261014-UX-001
Sprint destino: Saneamento Onda 01

## Problema
Dependência de Frontend/Sessão: Limpeza de armazenamento local e cache ao trocar de identidade ou efetuar logout.

## Arquivo(s) envolvido(s)
src/contexts/AuthContext.tsx:118-128

## Evidência
Base de auditoria: `9373fb224a8aba30a39f7d10d1a2be639c35af78`.
O método logout encerra a sessão na API e redireciona para login, porém não purga CacheStorage, IndexedDB e dados sensíveis de CRM armazenados pelo Service Worker e cliente.

## Alteração necessária
Implementar gancho no AuthContext para invocar caches.delete e purgar storages de CRM ao realizar logout ou ao detectar transição de tenant/usuário.

## Teste esperado
Ao invocar logout(), verificar que os caches de rotas protegidas são invalidados e nenhuma chave stale permanece acessível no navegador.
- Typecheck (`npx tsc --noEmit`) e Lint (`npm run lint`) limpos na área afetada.

## Contexto adicional
Atua em conjunto com a revisão de Service Worker do Agente 08 e Agente 09 (DEBT-20261014-UX-001).
Este handoff de dependência/pré-requisito foi preparado durante a Auditoria Forense Incremental de Dívidas Técnicas (Agente 00).
A execução da correção física está ESTRITAMENTE BLOQUEADA até aprovação humana explícita.
Revisão independente obrigatória do Agente 24 antes de qualquer merge.
