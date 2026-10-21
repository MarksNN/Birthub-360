-- N1 (docs/auditoria-divida-tecnica/08-PLANO-DE-SEGURANCA.md): a aplicacao sempre conectava como
-- superusuario do Postgres, o que faz TODAS as politicas RLS do projeto serem ignoradas (Postgres
-- nunca aplica RLS a um superusuario, nem com FORCE ROW LEVEL SECURITY). Este script cria um papel
-- de aplicacao NOSUPERUSER (so DML, dono de nada) e um papel dono separado (prospector_migrator).
-- Como o app nao e dono, a RLS (inclusive FORCE) vale sempre para ele e ele nao consegue desliga-la.
--
-- Deve ser executado conectado ao banco alvo, autenticado como o superusuario de bootstrap
-- (o POSTGRES_USER de cada ambiente). Requer a variavel psql "app_password":
--   psql -h <host> -p <port> -U <superusuario> -d <database> -v app_password=<senha> \
--     -v migrator_password=<senha-ou-vazio> -f scripts/db/create-app-role.sql
--
-- Idempotente: seguro rodar de novo (ex.: apos criar uma extensao nova) sem quebrar nada.

-- Cria (ou atualiza a senha d)o papel de aplicacao. NAO usa DO $$ ... $$ aqui de proposito: a
-- interpolacao de variavel do psql (:'app_password') e puramente lexica e NAO acontece dentro de
-- blocos dollar-quoted — testado ao vivo (psql do proprio pgvector/pgvector:pg15) e confirmado:
-- com :'app_password' dentro de um DO $$ ... $$, o texto chega literal no servidor e vira erro de
-- sintaxe. \gexec mantem a interpolacao num SELECT de nivel superior, onde ela funciona de verdade.
SELECT format(
    'CREATE ROLE prospector_app WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L',
    :'app_password'
)
WHERE NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'prospector_app')
UNION ALL
SELECT format(
    'ALTER ROLE prospector_app WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L',
    :'app_password'
)
WHERE EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'prospector_app')
\gexec

-- CREATE EXTENSION exige superusuario; roda aqui (com a conexao ainda autenticada como
-- superusuario de bootstrap) pra garantir que exista antes de qualquer coisa depender dela.
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── Separação de papéis (dívida de segurança do Agente 15) ──────────────────────────────────
-- Antes, prospector_app virava DONO do schema e de todas as tabelas. O dono pode
-- `ALTER TABLE ... DISABLE/NO FORCE ROW LEVEL SECURITY`, `DROP POLICY`, `DISABLE TRIGGER`, `DROP` —
-- uma SQL injection no app desligaria a RLS. Agora:
--   * prospector_migrator — DONO do schema public e de todos os objetos (tabelas, sequences, views,
--     funções, tipos). Só ele roda `prisma migrate deploy` (DIRECT_URL). NOSUPERUSER, BYPASSRLS
--     (backfills de migration em tabelas FORCE RLS não podem filtrar linhas em silêncio),
--     NOCREATEDB, NOCREATEROLE. LOGIN só se a variável psql "migrator_password" vier não vazia;
--     senão NOLOGIN (ambientes em que outro papel faz `SET ROLE prospector_migrator`).
--   * prospector_app — NÃO é dono de nada; só DML (SELECT/INSERT/UPDATE/DELETE), USAGE nas
--     sequences/schema e EXECUTE. NOSUPERUSER, NOBYPASSRLS.
--   * Exceção documentada: tabelas do LangGraph (`checkpoint*`), criadas em runtime por
--     `PostgresSaver.setup()` (src/lib/ai/checkpointer.ts), continuam do app — por isso o app mantém
--     CREATE no schema/banco. Ele pode criar/alterar SÓ as próprias tabelas, nunca as do migrator.
-- Idempotente e re-executável: re-rodar devolve ao migrator qualquer objeto que tenha ficado com
-- outro dono e re-aplica os grants mínimos. Ver docs/deploy/db-owner-role-separation.md.

SELECT format(
    'CREATE ROLE prospector_migrator WITH %s NOSUPERUSER BYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION %s',
    CASE WHEN :'migrator_password' = '' THEN 'NOLOGIN' ELSE 'LOGIN' END,
    CASE WHEN :'migrator_password' = '' THEN '' ELSE format('PASSWORD %L', :'migrator_password') END
)
WHERE NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'prospector_migrator')
UNION ALL
SELECT format(
    'ALTER ROLE prospector_migrator WITH %s NOSUPERUSER BYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION %s',
    CASE WHEN :'migrator_password' = '' THEN 'NOLOGIN' ELSE 'LOGIN' END,
    CASE WHEN :'migrator_password' = '' THEN '' ELSE format('PASSWORD %L', :'migrator_password') END
)
WHERE EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'prospector_migrator')
\gexec

-- Garante de novo os atributos do app (inclusive se alguém tiver dado BYPASSRLS na mão).
ALTER ROLE prospector_app NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB NOREPLICATION;
-- O app nunca pode herdar privilégios do migrator.
DO $$
BEGIN
    IF pg_has_role('prospector_app', 'prospector_migrator', 'MEMBER') THEN
        EXECUTE 'REVOKE prospector_migrator FROM prospector_app';
    END IF;
END
$$;

SELECT format('GRANT CONNECT, TEMPORARY ON DATABASE %I TO prospector_migrator, prospector_app', current_database()) \gexec

ALTER SCHEMA public OWNER TO prospector_migrator;

-- Posse: tudo em public que não pertence a extensão nem ao LangGraph vai para o migrator.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT c.oid, c.relname, c.relkind
          FROM pg_class c
         WHERE c.relnamespace = 'public'::regnamespace
           AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
           AND pg_get_userbyid(c.relowner) <> 'prospector_migrator'
           AND c.relname NOT LIKE 'checkpoint%'
           AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e')
           -- sequences de identidade/serial seguem a tabela dona (ALTER TABLE OWNER as leva junto)
           AND NOT (c.relkind = 'S' AND EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype IN ('a', 'i')))
    LOOP
        EXECUTE format(
            'ALTER %s public.%I OWNER TO prospector_migrator',
            CASE r.relkind WHEN 'S' THEN 'SEQUENCE' WHEN 'v' THEN 'VIEW' WHEN 'm' THEN 'MATERIALIZED VIEW' WHEN 'f' THEN 'FOREIGN TABLE' ELSE 'TABLE' END,
            r.relname
        );
    END LOOP;

    FOR r IN
        SELECT p.oid
          FROM pg_proc p
         WHERE p.pronamespace = 'public'::regnamespace
           AND pg_get_userbyid(p.proowner) <> 'prospector_migrator'
           AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')
    LOOP
        EXECUTE format('ALTER ROUTINE %s OWNER TO prospector_migrator', r.oid::regprocedure);
    END LOOP;

    FOR r IN
        SELECT t.oid
          FROM pg_type t
         WHERE t.typnamespace = 'public'::regnamespace
           AND t.typtype IN ('e', 'd', 'c')
           AND (t.typtype <> 'c' OR EXISTS (SELECT 1 FROM pg_class c WHERE c.oid = t.typrelid AND c.relkind = 'c'))
           AND pg_get_userbyid(t.typowner) <> 'prospector_migrator'
           AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_type'::regclass AND d.objid = t.oid AND d.deptype = 'e')
    LOOP
        EXECUTE format('ALTER TYPE %s OWNER TO prospector_migrator', r.oid::regtype);
    END LOOP;
END
$$;

-- Privilégios do app: zera o que existia (inclusive o GRANT ALL legado) e concede só DML.
REVOKE ALL ON SCHEMA public FROM prospector_app;
GRANT USAGE, CREATE ON SCHEMA public TO prospector_app;  -- CREATE: só pelo LangGraph (ver acima)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT c.relname, c.relkind FROM pg_class c
         WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
           AND pg_get_userbyid(c.relowner) = 'prospector_migrator'
    LOOP
        IF r.relkind = 'S' THEN
            EXECUTE format('REVOKE ALL ON SEQUENCE public.%I FROM prospector_app', r.relname);
            EXECUTE format('GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.%I TO prospector_app', r.relname);
        ELSE
            EXECUTE format('REVOKE ALL ON TABLE public.%I FROM prospector_app', r.relname);
            EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO prospector_app', r.relname);
        END IF;
    END LOOP;
END
$$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO prospector_app;

-- Objetos FUTUROS criados pelo migrator (migrations) já nascem com DML para o app.
-- Tabelas com regime restrito (ex.: cadeia LGPD do PR #35) ajustam os próprios grants na
-- migration e no hook abaixo, que roda DEPOIS destes defaults.
ALTER DEFAULT PRIVILEGES FOR ROLE prospector_migrator IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO prospector_app;
ALTER DEFAULT PRIVILEGES FOR ROLE prospector_migrator IN SCHEMA public
    GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO prospector_app;
ALTER DEFAULT PRIVILEGES FOR ROLE prospector_migrator IN SCHEMA public
    GRANT EXECUTE ON FUNCTIONS TO prospector_app;
ALTER DEFAULT PRIVILEGES FOR ROLE prospector_migrator IN SCHEMA public
    GRANT USAGE ON TYPES TO prospector_app;

-- Hook de regimes restritos: grants mínimos das tabelas LGPD (função criada pela migration
-- 20261020220000 do PR #35). No-op enquanto ela não existir. Roda por último de propósito.
DO $$
BEGIN
    IF to_regprocedure('public.lgpd_apply_consent_privileges()') IS NOT NULL THEN
        PERFORM public.lgpd_apply_consent_privileges();
    END IF;
END
$$;

-- AI-002 (onda 32): `@langchain/langgraph-checkpoint-postgres` roda `CREATE SCHEMA IF NOT EXISTS
-- "public"` em `PostgresSaver.setup()`; o Postgres checa CREATE no banco antes de checar se o
-- schema existe. Sem este GRANT o setup falha com "permission denied for database".
SELECT format('GRANT CREATE ON DATABASE %I TO prospector_app', current_database()) \gexec
