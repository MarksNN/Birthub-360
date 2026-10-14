De: 00 — Coordenador
Para: 04 — CRM e BI
Onda: 52
Status: resolvido
Prioridade: bloqueador
Bloqueador-ref: PR741-APP-GATE-03
Sprint destino: PR #741

## Problema

O application gate do PR #741 falha em três imports entre features: Signals & Risks importa tipos de Commercial Intelligence. A tentativa de correção do Coordenador ainda não está ratificada pelo proprietário da superfície de Signals & Risks.

## Arquivo(s) envolvido(s)

- `src/features/signals-risks/signalsRisks.api.ts`
- `src/features/signals-risks/components/SignalsAndRisksHub.tsx`
- `src/features/signals-risks/components/DealRisksTab.tsx`

## Evidência

- Run `38597034537`, job `115966520319`: `no-cross-feature-imports` nos três caminhos acima apontando a `commercialIntelligence.api.ts`.
- Branch de integração local `fix/pr-741-application-gate-v4` parte do HEAD remoto `6ecfcc4f895383ac2b712099972881d21f7c512d`.
- O Agente 24 reprovou a revisão do patch anterior por falta de ratificação dos proprietários dos arquivos.

## Alteração necessária

Revisar e assumir a remoção dos imports proibidos, preservando o comportamento das telas. A proposta copiou apenas os tipos de DTO efetivamente consumidos para `signalsRisks.api.ts` e atualizou os dois consumidores para importar do módulo local. Confirme compatibilidade de tipos e se a feature deve importar contrato compartilhado em outra localização; faça a mudança mínima correta sob seu ownership.

## Teste esperado

- Testes unitários de SignalsAndRisksHub e DealRisksTab.
- `npm run typecheck` e `npm run lint`.
- `npm run lint:architecture`: as três regras `no-cross-feature-imports` devem desaparecer, sem novas violações.
- `npm run test:architecture` após a integração com as correções dos outros proprietários.

## Contexto adicional

## Resolução

O Agente 04 aprovou as projeções locais mínimas de DTO. O commit local `e01d0d0d28eb8a6719d8ee92e25b444673422d7f` foi integrado como `8b92346f` em `fix/pr-741-application-gate-v4`; sem push.

- `tests/unit/components/signals-risks/SignalsAndRisksHub.test.tsx`: passou (3 testes); não há teste unitário separado para `DealRisksTab`.
- `npm run typecheck`: passou.
- `npm run lint`: passou (375 avisos).
- `npm run lint:architecture` na branch do proprietário deixou de reportar as três violações desta feature; permaneceu somente a violação de Intelligence/Groq encaminhada ao Agente 07.
- Arquivos preservados byte a byte entre o worktree do proprietário e a integração; hashes SHA-256:
  - `src/features/signals-risks/signalsRisks.api.ts`: `8FD68A2AB7BBE364F1F0F60F46B4FC8C24AFD2470F4494A58B9DBF1688180201`
  - `src/features/signals-risks/components/SignalsAndRisksHub.tsx`: `388623F4B1E267D3C076EDC3EFA3C65330DF41CE998FCD042FA5C6781A63B7C1`
  - `src/features/signals-risks/components/DealRisksTab.tsx`: `FC4892C28024F4C24CB6117CE1C75E2C696666EF777BCD144386DB3FE22E0940`
