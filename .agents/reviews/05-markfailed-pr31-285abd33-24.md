# Parecer Agente 24 — PR #31 (Failed do execute fora do rollback) @ 285abd33

- **Missão:** follow-up do P2-1 do parecer do #22. O markFailed era desfeito pelo rollback de withRlsContext.
- **Autor:** Agente 05 · **Base do PR:** agente/05-execute-tenancy (#22, **OPEN, não mergeado**), empilhado com 1 commit sobre o #22.
- **SHA revisado:** 285abd339f36cde009c4852703a2634def16dae7. Contra a main 91bffdf6 está 2 commits à frente e 5 atrás (merge-base 27463513).

## Veredito: BLOQUEADO (falta de evidência de CI). O código está correto na análise estática.

## Critérios e achados
1. **Failed persiste fora da transação que sofre rollback: OK.**
   - A transação agora devolve `{ failed: error }` para falha real, ou seja, exceção do callBitrix ou save de cadência que não seja P2002.
   - O `Failed` é gravado num `withRlsContext` **separado**, depois do commit da transação, e o erro é relançado em seguida.
   - As pré-condições (404, 400, já executada, 409 P2002) continuam com throw dentro da transação e não marcam Failed, o que está correto.
2. **Tenancy: OK.**
   - A leitura usa `findFirst({ id, organizationId, companyId })`, com 404 idêntico para outro tenant ou outra conta.
   - O write do Failed usa `updateMany` com o mesmo trio, e lead e sequência filtram pelo organizationId da sessão.
   - A rota passa `req.user.organizationId`, e o service recusa organizationId vazio com 403.
3. **Testes:** actionExecutor.tenancy.test.ts tem 8 casos.
   - O mock de withRlsContext **simula rollback**, restaurando o snapshot no throw.
   - Há um caso explícito de "falha real persiste Failed mesmo com rollback" e outro de 409 que mantém Pending.
   - Limitação: é teste unitário com mock. Não existe teste de integração com Postgres real provando o commit do Failed.
4. **CI: sem evidência.** O único run no SHA é o SonarQube (success). Como a base não é main, o application gate (lint, typecheck, architecture, unit, integration) **não rodou**. Nada foi rodado localmente, por falta de memória na box.

## Achados residuais
- **P3:** o `prismaCadenceRunRepository.save` usa o prisma global, fora da transação. Um run salvo não é desfeito se o update de Executed falhar. O autor declarou isso como fora de escopo.
- **P3:** se o callBitrix der certo e o update de Executed falhar, a task fica criada no Bitrix e a recomendação continua Pending. Isso pode duplicar a task num retry (dedupe por externalRef está declarado como fora de escopo).
- **P3:** se o próprio write do Failed falhar, o erro original é mascarado. Envolver em try/catch e relançar o erro original.
- **P3:** o fallback `RESPONSIBLE_ID = 1` foi mantido.
- A mudança de indentação em accountIntelligence.service.ts é só formatação.

## Para desbloquear
1. Mergear o #22, ou fazer rebase do #31 na main, que depois do #30 ainda não inclui o #22.
2. Rodar o application gate completo no novo head, 100% verde. Um novo SHA exige novo parecer.

## Comandos
`gh pr view 31 --json baseRefName,headRefOid` · `gh pr view 22 --json state` · `gh api .../compare/91bffdf6...285abd33` · `gh api .../compare/agente/05-execute-tenancy...285abd33` · `gh run list --commit 285abd33`
