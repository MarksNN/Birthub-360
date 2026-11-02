De: Agente 00 — Coordenador Global
Para: Agente 18 — Contratos, OpenAPI e Documentação Viva (Apoio: Agente 01 Plataforma & Agente 08 QA)
Onda: Fase 2 — Homologação e Qualidade
Status: resolvido
Prioridade: bloqueador
Bloqueador-ref: Issue #142
Sprint destino: Fase 2 Enxame IA / Gate V3.1

## Problema
Em `src/features/intelligence/commercial-v3/routes/commercialV3.routes.ts` e `docs/openapi.yaml`, foram identificados desvios contratuais entre a implementação Express/Zod e a documentação OpenAPI:
1. `POST /api/agent/commercial-v3/context` valida `agentId` obrigatório via Zod, mas `agentId` não estava em `required` no OpenAPI.
2. `GET /api/agent/commercial-v3/skills?agentId=...` não devolvia o campo `total` quando filtrado, apesar do cliente (`commercialV3Api.listSkills`) e do OpenAPI tiparem `total: number`.
3. `GET /api/agent/commercial-v3/skills?agentId=invalido` ignorava o filtro e retornava todas as 463 habilidades, em vez de retornar validação HTTP 400 com erro contratual.
4. `POST /api/agent/commercial-v3/dispatch` restringia `mission` a 1–4000 caracteres no Zod, mas o OpenAPI não refletia os limites de tamanho nem detalhava as respostas de erro (400, 401, 403, 429).
5. O cliente `src/features/hub/commercialV3.api.ts` não expunha o método de montagem de contexto (`buildContext`).
6. Ausência de suíte de Contract Testing automatizada com Supertest cobrindo os 8 endpoints sob perspectivas de sucesso, erro de validação, limites e RBAC.

## Arquivo(s) envolvido(s)
- `src/features/intelligence/commercial-v3/routes/commercialV3.routes.ts`
- `src/features/hub/commercialV3.api.ts`
- `src/shared/middlewares/validateRequest.ts`
- `docs/openapi.yaml`
- `src/features/intelligence/commercial-v3/__tests__/commercialV3.contracts.test.ts`

## Alteração realizada
1. **Router Comercial V3.1 (`commercialV3.routes.ts`):**
   - Implementado `listSkillsQuerySchema` com Zod validando `agentId: z.enum(COMMERCIAL_V3_AGENT_IDS).optional()`.
   - `GET /skills`: rejeita `agentId` inválido com HTTP 400 e `VALIDATION_ERROR`; devolve sempre `total: skills.length` acompanhado de `data`.
   - `POST /context`: mapeia erros de `SkillId não pertence ao agente` ou `Agente desconhecido no catálogo` diretamente para HTTP 400 (`VALIDATION_ERROR`) com retorno estruturado.
2. **Middleware de Validação (`validateRequest.ts`):**
   - Adicionada compatibilidade defensiva para ambientes onde `req.query` possui getter read-only em Express/Supertest, limpando chaves legadas e mesclando com `Object.assign`.
3. **SDK Frontend (`commercialV3.api.ts`):**
   - Declarada a interface `BuildCommercialV3ContextInput`.
   - Adicionado método `commercialV3Api.buildContext()`.
4. **Contrato OpenAPI (`docs/openapi.yaml`):**
   - Atualizados os 8 endpoints da Célula Comercial V3.1.
   - Definidos enums canônicos dos 19 agentes, limites de string (`minLength: 1`, `maxLength: 4000`) em missões e campos `required`.
   - Documentadas respostas de status HTTP `200`, `400` (`BadRequest`), `401` (`Unauthorized`), `403` (`Forbidden`), `404` (`NotFound`) e `429` (`TooManyRequests`).
5. **Suíte Automatizada de Contract Testing (`commercialV3.contracts.test.ts`):**
   - Criados 24 testes unitários com Supertest cobrindo os 8 endpoints.
   - Assert de métodos, paths, parâmetros, query strings, limites, RBAC e integridade de multi-tenancy.

## Evidências
- `verify:openapi-drift`: 0 derivas encontradas.
- `vitest` em `commercialV3.contracts.test.ts`: 24 passed (100%).
- `vitest` em `commercialV3.test.ts`: 20 passed (100%).
- `tsc --noEmit`: 0 erros.
- `biome check`: 0 erros e 0 warnings.
