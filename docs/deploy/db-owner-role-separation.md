# Separação de papéis do banco: `prospector_migrator` (dono) × `prospector_app` (DML)

**Origem:** dívida de segurança apontada pelo Agente 15. **Implementação:** Agente 01. **Rollout em produção:** 08A. O boot check de produção fica com o 15 e não está neste PR.

## Problema
Na versão anterior, `scripts/db/create-app-role.sql` tornava `prospector_app` **dono** do schema `public` e de todas as tabelas e sequences. O dono de uma tabela pode rodar `ALTER TABLE … DISABLE ROW LEVEL SECURITY` / `NO FORCE ROW LEVEL SECURITY`, `DROP POLICY`, `DISABLE TRIGGER`, `DROP TABLE` e `TRUNCATE`. Na prática, uma SQL injection no app conseguia desligar a RLS.

## Modelo novo
| Papel | Atributos | Posse | Privilégios |
|---|---|---|---|
| `prospector_migrator` | NOSUPERUSER, **BYPASSRLS** (backfills de migration em tabelas FORCE RLS), NOCREATEDB, NOCREATEROLE; LOGIN só se `MIGRATOR_DB_PASSWORD` for definida (senão NOLOGIN) | schema `public`, todas as tabelas, views, sequences, funções e tipos (exceto objetos de extensão e `checkpoint*`) | dono |
| `prospector_app` | NOSUPERUSER, NOBYPASSRLS, NOCREATEDB, NOCREATEROLE, **não é membro** do migrator | nada (exceto tabelas `checkpoint*` do LangGraph, criadas em runtime) | `SELECT/INSERT/UPDATE/DELETE` nas tabelas; `USAGE, SELECT, UPDATE` nas sequences; `EXECUTE` nas funções; `USAGE, CREATE` no schema e `CREATE` no banco (necessários ao `PostgresSaver.setup()`). **Sem** TRUNCATE, REFERENCES ou TRIGGER |

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
   Isso equivale a um `REASSIGN OWNED BY prospector_app TO prospector_migrator` escopado em `public`, sem tocar em objetos de extensão nem do LangGraph. O script faz isso por objeto, de propósito: `REASSIGN OWNED` falharia em objetos do sistema e mudaria `checkpoint*`.

   **Atenção:** `APP_DB_PASSWORD` redefine a senha do app. Use a senha atual, ou troque as duas no mesmo passo.
4. **Configurar** `DIRECT_URL=postgresql://prospector_migrator:<senha>@<host>:<port>/<db>` no job de migrations (ou no container, se a migration continuar no boot). `DATABASE_URL` continua como `prospector_app`.
   - Supabase: `DIRECT_URL` deve apontar para a conexão de sessão (5432), não para o pooler de transação.
5. **Verificar (depois):**
   ```sql
   SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relowner='prospector_app'::regrole AND relname NOT LIKE 'checkpoint%' AND relkind IN ('r','p','v','m','S');  -- 0
   SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname='public';  -- prospector_migrator
   SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname='prospector_app'; -- f, f
   ```
   Depois, rode `npx prisma migrate deploy` com o `DIRECT_URL` novo (deve dar "No pending migrations") e faça um smoke test da aplicação.
6. **Monitorar** os logs da aplicação em busca de `permission denied` ou `must be owner` por 24 h. Nenhum caminho de runtime conhecido faz DDL além do LangGraph; nos testes de integração, nenhum caso falhou por permissão.

## Rollback
O rollback não perde dados, porque só muda posse e grants:
```sql
ALTER SCHEMA public OWNER TO prospector_app;
REASSIGN OWNED BY prospector_migrator TO prospector_app;   -- devolve tudo ao app (modelo antigo)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO prospector_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO prospector_app;
-- opcional: ALTER ROLE prospector_migrator NOLOGIN;
```
Em seguida, volte o job de migrations para o `DATABASE_URL` do app (remova o `DIRECT_URL`). Não apague o `prospector_migrator` enquanto ele tiver default privileges: antes de um `DROP ROLE`, rode `DROP OWNED BY prospector_migrator`, que remove as default ACLs.

## CI
Todos os workflows que fazem o bootstrap (`ci.yml`, `endpoint-latency-budget.yml`, `onda-2.5-validation.yml`, `playwright-ci.yml`, `visual-regression.yml`) passam `MIGRATOR_DB_PASSWORD` e exportam `DIRECT_URL` (migrator) no nível do job e no `.env.test`. A migration roda como dono e os testes rodam como `prospector_app`. A prova está em `tests/integration/db-owner-role-separation.test.ts`.

## Dev local
O `docker-compose.postgres-local.yml` repassa `MIGRATOR_DB_PASSWORD` (padrão `prospector_migrator_pass`). Para migrar localmente com o papel dono, defina `DIRECT_URL` apontando para `prospector_migrator`. Sem ele, a CLI usa `DATABASE_URL`: num volume novo, as tabelas nascem do app (comportamento antigo, só local); num banco já separado, a migration falha com `must be owner`.
