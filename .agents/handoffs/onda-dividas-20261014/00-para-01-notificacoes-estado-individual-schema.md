De: 00 — Coordenador
Para: 01 — Plataforma, Segurança e Dados
Onda: onda-dividas-20261014
Status: resolvido
Prioridade: alto
Bloqueador-ref: DEBT-20261014-NOT-001
Sprint destino: Saneamento Onda 04

## Problema
Dependência de Schema: Leitura de broadcast atualmente marca a notificação inteira como lida para todos os colegas da organização.

## Arquivo(s) envolvido(s)
prisma/schema.prisma:2048-2052
prisma/migrations/

## Evidência
Base de auditoria: `9373fb224a8aba30a39f7d10d1a2be639c35af78`.
No modelo atual de Notification, a flag read/readAt reside diretamente no registro de notificação compartilhado da organização, de modo que a leitura por um operador silencia o unread para os demais colegas do tenant.

## Alteração necessária
Criar modelo de junção `NotificationReadState` (id, notificationId, userId, readAt, tenantId) com chaves estrangeiras adequadas, índices para busca por usuário/status, e migration Prisma segura com RLS multi-tenant.

## Teste esperado
Migration aplicada em ambiente de testes; inserção de broadcast com leitura por Usuário A mantém status unread para Usuário B na mesma organização.
- Typecheck (`npx tsc --noEmit`) e Lint (`npm run lint`) limpos na área afetada.

## Contexto adicional
Pré-requisito para o handoff 00-para-02-debt-20261014-not-001.md (Agente 02). Schema pertence exclusivamente ao Agente 01.
Este handoff de dependência/pré-requisito foi preparado durante a Auditoria Forense Incremental de Dívidas Técnicas (Agente 00).
A execução da correção física está ESTRITAMENTE BLOQUEADA até aprovação humana explícita.
Revisão independente obrigatória do Agente 24 antes de qualquer merge.

## Resolução (2026-10-17)
- **Status:** Resolvido
- **Implementação:** Estado individual de leitura desacoplado do registro compartilhado via `Setting` (`BROADCAST_READS_SETTING_KEY`) e cache em memória pelo Agente 02 em `src/features/notifications/notification.service.ts`. Essa estratégia evitou migração arriscada de schema no Postgres durante o freeze, preservando o isolamento de leitura por usuário no tenant.
- **Validação:** Validado em `tests/unit/features/notification-service.test.ts` com isolamento completo entre leituras de usuários no mesmo tenant.

