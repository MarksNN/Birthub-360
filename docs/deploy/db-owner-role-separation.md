# Separação de papéis do banco: `prospector_migrator` (dono) × `prospector_app` (DML)

**Origem:** dívida de segurança apontada pelo Agente 15. **Implementação:** Agente 01. **Rollout em produção:** 08A. O boot check de produção fica com o 15 (`agente/15-db-role-boot-check`) e não está neste PR; ele passa contra o papel resultante sem `DB_ROLE_CHECK_ALLOW_CHECKPOINT_OWNERSHIP` (testado localmente). Revisão 2 deste PR: parecer 15 sobre @50651156 (A1–A3, B1, C1–C3, D).

## Problema
Na versão anterior, `scripts/db/create-app-role.sql` tornava `prospector_app` **dono** do schema `public` e de todas as tabelas e sequences. O dono de uma tabela pode rodar `ALTER TABLE … DISABLE ROW LEVEL SECURITY` / `NO FORCE ROW LEVEL SECURITY`, `DROP POLICY`, `DISABLE TRIGGER`, `DROP TABLE` e `TRUNCATE`. Na prática, uma SQL injection no app conseguia desligar a RLS.

## Modelo novo
| Papel | Atributos | Posse | Privilégios |
|---|---|---|---|
| `prospector_migrator` | NOSUPERUSER, **BYPASSRLS** (backfills de migration em tabelas FORCE RLS), NOCREATEDB, NOCREATEROLE; LOGIN só se `MIGRATOR_DB_PASSWORD` for definida (senão NOLOGIN) | schema `public`, todas as tabelas (inclusive `checkpoint*` do LangGraph), views, sequences, funções e tipos (exceto objetos de extensão) | dono; `search_path = public, pg_catalog` |
| `prospector_app` | NOSUPERUSER, NOBYPASSRLS, NOCREATEDB, NOCREATEROLE, **não é membro** do migrator | **nada, sem exceção** | `SELECT/INSERT/UPDATE/DELETE` nas tabelas; `USAGE, SELECT` nas sequences (sem `UPDATE`/`setval`); `USAGE` no schema; `CONNECT` no banco; `EXECUTE` só nas funções da allowlist do script (hoje vazia). **Sem** CREATE no banco ou no schema, **sem** TEMP, sem TRUNCATE, REFERENCES ou TRIGGER; `search_path = pg_catalog, public` |

### Endurecimento (parecer 15, revisão 2)
- **Sem CREATE para o app (A1/A2).** Com CREATE no banco o app criaria `CREATE SCHEMA prospector_app`, que o `search_path` padrão (`"$user", public`) resolveria antes de `public`, sombreando `"Lead"` e outras tabelas sem RLS. Com CREATE em `public` ele criaria tabelas próprias com triggers, e um trigger desses rodando `DELETE` em tabela append-only cairia no ramo `pg_trigger_depth() > 1` dos triggers do #35. Agora o app não cria schema, tabela, view, função, tipo nem trigger.
- **LangGraph por migration (A3).** `20261021010000_langgraph_checkpoint_tables` cria `checkpoints`, `checkpoint_writes`, `checkpoint_blobs` e `checkpoint_migrations` com o DDL exato de `getMigrations()` do `@langchain/langgraph-checkpoint-postgres` 1.0.5 e grava as versões 0..4. As tabelas estão em `tables.external` do `prisma.config.ts` (não entram no drift nem no `schema.prisma`). O app não chama mais `PostgresSaver.setup()`; `ensureCheckpointerReady()` só confere `max(v) >= 4` e falha com mensagem clara se a migration não rodou. **Ao atualizar o pacote:** se `getMigrations()` crescer, crie uma migration com o DDL novo e suba `EXPECTED_CHECKPOINTER_SCHEMA_VERSION`. A exceção `LIKE 'checkpoint%'` saiu do script e do teste.
- **search_path fixo (A4).** App: `pg_catalog, public`. Migrator: `public, pg_catalog`, porque o Prisma cria `_prisma_migrations` sem qualificar e o alvo de CREATE é o primeiro schema do path (com `pg_catalog` primeiro a migration falha com `permission denied for schema pg_catalog`, testado). Como o migrator é o único que cria objetos em `public`, ninguém consegue sombrear nada para ele ali.
- **PUBLIC (C1–C3).** `REVOKE ALL ON SCHEMA public FROM PUBLIC` (bancos vindos de PG < 15 ainda davam CREATE); `REVOKE CREATE, TEMPORARY ON DATABASE … FROM PUBLIC, prospector_app` (tabela temporária sombreia relação não qualificada, porque `pg_temp` é buscado primeiro). O `CONNECT` de PUBLIC foi mantido, porque papéis do provedor podem depender dele; app e migrator recebem `CONNECT` explícito.
- **Funções (B1/C2).** Saíram `GRANT EXECUTE ON ALL FUNCTIONS` e o default de `EXECUTE` para o app. O script revoga EXECUTE de PUBLIC e do app em toda função própria (não-extensão) de `public` e concede só o que estiver na `allowlist` (hoje vazia; funções de trigger não precisam de EXECUTE para disparar). `ALTER DEFAULT PRIVILEGES FOR ROLE prospector_migrator REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC` vale para toda função futura. Funções de extensão (pgvector, pg_trgm) não são tocadas, porque os operadores dependem delas. Uma função nova que o app precise chamar entra na allowlist do script e em `APP_EXECUTE_ALLOWLIST` do teste. Se for SECURITY DEFINER, precisa de revisão do 15.
- **Sequences.** Só `USAGE, SELECT`: `nextval()` precisa só de USAGE, e nenhum caminho do app usa `setval()` (verificado com `grep`).
- **Testes (D).** `tests/integration/db-owner-role-separation.test.ts` cobre: CREATE SCHEMA/TABLE/VIEW/FUNCTION/TYPE/TEMP negados; o caso A2 (tabela, função de trigger e `CREATE TRIGGER` negados, e nenhum trigger em tabela que não seja do migrator); posse das `checkpoint*`; toda tabela FORCE RLS do migrator; inventário de SECURITY DEFINER (search_path fixo e tenant guard, ou allowlist); EXECUTE do app só por allowlist; e inventário dos grants de PUBLIC.

- `ALTER DEFAULT PRIVILEGES FOR ROLE prospector_migrator` faz com que toda tabela, sequence, função ou tipo criado por migration já nasça com DML para o app.
- Tabelas com regime restrito, como a cadeia LGPD do #35, ajustam os próprios grants na migration. O script chama `lgpd_apply_consent_privileges()` **por último**, então os defaults nunca reconcedem UPDATE/DELETE nas tabelas append-only. Compatibilidade testada: aplicar a migration do #35 como migrator e reexecutar o script mantém os grants mínimos.
- O script é idempotente e pode ser reexecutado. Cada execução devolve ao migrator qualquer objeto que tenha ficado com outro dono, inclusive os de um banco no modelo antigo, em que o app era dono de tudo. Ele também zera e reaplica os grants do app.

## Conexões
| Uso | Variável | Papel |
|---|---|---|
| `prisma migrate deploy` (CLI; `prisma.config.ts` prefere `DIRECT_URL`) | `DIRECT_URL` | `prospector_migrator` |
| runtime do app, workers, testes | `DATABASE_URL` | `prospector_app` |

⚠️ Se a migration rodar como `prospector_app` depois do rollout, ela **falha** com `must be owner`. Esse é o comportamento desejado. O `Dockerfile` roda `npx prisma migrate deploy` no boot, então o container precisa receber `DIRECT_URL` (do migrator) **ou** as migrations precisam sair para um job separado de release (recomendado: o processo do app não deve ter a credencial do dono).

## Rollout em produção (08A)
Pré-requisitos: janela curta (os `ALTER … OWNER` pegam `ACCESS EXCLUSIVE` por objeto, mas são instantâneos), acesso de superusuário ou do papel administrador do provedor (Supabase: `postgres`) e backup recente.

1. **Inventário (antes):**
   ```sql
   SELECT pg_get_userbyid(relowner) AS owner, count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind IN ('r','p','v','m','S') GROUP BY 1;
   SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname='public';
   ```
   Guarde a saída para o rollback.
2. **Senha do migrator** no cofre de segredos (`MIGRATOR_DB_PASSWORD`). Ela não vai para o env do processo do app.
3. **Executar o bootstrap** como administrador:
   ```bash
   PGPASSWORD=<admin> APP_DB_PASSWORD=<senha-app-atual> MIGRATOR_DB_PASSWORD=<senha-migrator> \
     ./scripts/db/bootstrap-app-role.sh <host> <port> <admin> <db>
   ```
   Isso equivale a um `REASSIGN OWNED BY prospector_app TO prospector_migrator` escopado em `public`, sem tocar em objetos de extensão. O script faz isso por objeto, de propósito, porque `REASSIGN OWNED` falharia em objetos do sistema. As `checkpoint*` que o app criou em runtime também passam para o migrator, com os dados preservados.

   **Atenção:** `APP_DB_PASSWORD` redefine a senha do app. Use a senha atual, ou troque as duas no mesmo passo.
4. **Configurar** `DIRECT_URL=postgresql://prospector_migrator:<senha>@<host>:<port>/<db>` no job de migrations (ou no container, se a migration continuar no boot). `DATABASE_URL` continua como `prospector_app`.
   - Supabase: `DIRECT_URL` deve apontar para a conexão de sessão (5432), não para o pooler de transação.
5. **Verificar (depois):**
   ```sql
   SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relowner='prospector_app'::regrole AND relkind IN ('r','p','v','m','S');  -- 0
   SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname='public';  -- prospector_migrator
   SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname='prospector_app'; -- f, f
   ```
   Depois, rode `npx prisma migrate deploy` com o `DIRECT_URL` novo. Ela aplica `20261021010000_langgraph_checkpoint_tables`: as tabelas que já existirem são preservadas (`IF NOT EXISTS`) e as versões 0..4 são gravadas com `ON CONFLICT DO NOTHING`. Faça um smoke test da aplicação.
   **Ordem obrigatória:** primeiro o bootstrap (passo 3), depois a migration, e só então o deploy do app novo. O app novo não roda mais `setup()` e falha ao usar o checkpointer se a migration não tiver rodado.
   Verifique também o endurecimento:
   ```sql
   SELECT has_database_privilege('prospector_app', current_database(), 'CREATE') OR has_database_privilege('prospector_app', current_database(), 'TEMP') OR has_schema_privilege('prospector_app','public','CREATE');  -- f
   SELECT rolname, rolconfig FROM pg_roles WHERE rolname IN ('prospector_app','prospector_migrator'); -- search_path fixo
   ```
6. **Monitorar** os logs da aplicação em busca de `permission denied` ou `must be owner` por 24 h. Nenhum caminho de runtime faz DDL: o LangGraph era o único, e saiu. Nos testes de integração, nenhum caso falhou por permissão.

## Rollback
O rollback não perde dados, porque só muda posse e grants:
```sql
ALTER SCHEMA public OWNER TO prospector_app;
REASSIGN OWNED BY prospector_migrator TO prospector_app;   -- devolve tudo ao app (modelo antigo)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO prospector_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO prospector_app;
SELECT format('GRANT CREATE, TEMPORARY ON DATABASE %I TO prospector_app', current_database()) \gexec
GRANT CREATE ON SCHEMA public TO prospector_app;
ALTER ROLE prospector_app RESET search_path; ALTER ROLE prospector_migrator RESET search_path;
-- opcional: ALTER ROLE prospector_migrator NOLOGIN;
```
Em seguida, volte o job de migrations para o `DATABASE_URL` do app (remova o `DIRECT_URL`). Não apague o `prospector_migrator` enquanto ele tiver default privileges: antes de um `DROP ROLE`, rode `DROP OWNED BY prospector_migrator`, que remove as default ACLs.

## CI
Todos os workflows que fazem o bootstrap (`ci.yml`, `endpoint-latency-budget.yml`, `onda-2.5-validation.yml`, `playwright-ci.yml`, `visual-regression.yml`) passam `MIGRATOR_DB_PASSWORD` e exportam `DIRECT_URL` (migrator) no nível do job e no `.env.test`. A migration roda como dono e os testes rodam como `prospector_app`. A prova está em `tests/integration/db-owner-role-separation.test.ts`.

## Dev local
O `docker-compose.postgres-local.yml` repassa `MIGRATOR_DB_PASSWORD` (padrão `prospector_migrator_pass`). Para migrar localmente com o papel dono, defina `DIRECT_URL` apontando para `prospector_migrator`. Sem ele, a CLI usa `DATABASE_URL` (o app), e a migration falha com `permission denied for schema public`, porque o app não tem mais CREATE. Isso é intencional.

## Em aberto
- **C4:** uma migration rodada pelo superusuário de bootstrap cria objetos dele, sem os defaults do migrator. O boot check do 15 não pega esse caso. Sugestão: um passo de CI pós-`migrate deploy` que rode o mesmo inventário de posse (ou reexecute o script).
- **CONNECT de PUBLIC no banco** foi mantido (ver acima). Revogar é opcional, por ambiente.
- **Rotação da senha do migrator:** fica no cofre, fora do env do app; recomenda-se NOLOGIN fora da janela de deploy.
- **Tombstone (#35):** a checagem de tenant em `consent_subject_key_tombstone()` e a troca de `pg_trigger_depth() > 1` pela checagem de cascata de Organization ficam no PR #35, porque a função é dele. Com este PR, o vetor A2 já está fechado do lado do papel.
