De: 00 — Coordenador
Para: 08 — QA e Release
Onda: 52
Status: aberto
Prioridade: alto
Bloqueador-ref: PR741-APP-GATE-02
Sprint destino: PR #741

## Problema

O inventário OpenAPI no fluxo do PR #741 identificou rotas montadas sem documentação, e o gate de arquitetura também excede os limites de hotspots. O Agente 24 reprovou a primeira tentativa porque a documentação foi alterada sem revisão/ratificação do proprietário.

## Arquivo(s) envolvido(s)

- `docs/openapi.yaml`
- `docs/architecture/HOTSPOT_EXCEPTIONS.md`

## Evidência

- Run `38597034537`, job `115966520319`: `test:architecture` falha em quatro violações de dependência; o subgate de hotspots ainda não foi alcançado no remoto.
- `npm run verify:openapi-drift` passou no worktree anterior somente depois de documentar as rotas existentes.
- Parecer `.agents/reviews/pr-741-application-gate-v2-24.md`: F-01 exige ratificação/execução pelo Agente 08.

## Alteração necessária

Revisar e assumir a documentação OpenAPI para as rotas realmente existentes, mantendo contratos fiéis aos handlers e sem exemplos de credenciais/PII. Revisar também as exceções temporárias de hotspots, garantindo limites, justificativas, donos e data de reavaliação válidos. Não alterar runtime ou remover os gates.

## Teste esperado

- `npm run verify:openapi-drift`.
- `npm run test:architecture` depois da integração dos fixes de código.
- `git diff --check`; verificar que documentação não introduz credenciais ou dados pessoais.

## Contexto adicional

O Agente 00 preparou propostas nos arquivos listados no worktree de integração, mas elas não estão aprovadas. Trabalhe em branch/worktree próprio derivado do HEAD `6ecfcc4f895383ac2b712099972881d21f7c512d`, revise/ajuste a proposta e registre hashes da versão aceita. Não faça push. Responda com commit local e evidências; se alguma rota ou exceção não estiver comprovada, registre a pendência e não a documente como fato.
