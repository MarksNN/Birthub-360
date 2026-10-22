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
--   * prospector_app — NÃO é dono de nada e NÃO cria nada: só DML (SELECT/INSERT/UPDATE/DELETE),
--     USAGE/SELECT nas sequences, USAGE no schema e EXECUTE só por allowlist explícita (abaixo).
--     Sem CREATE no banco/schema e sem TEMP (parecer 15 do PR #39: A1/A2/C3). NOSUPERUSER,
--     NOBYPASSRLS. As tabelas do LangGraph (`checkpoint*`) nascem por migration
--     (20261021010000_langgraph_checkpoint_tables), do migrator, como qualquer outra.
--   * search_path fixado: app `pg_catalog, public`; migrator só `public` (pg_catalog implícito antes; ver abaixo).
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

-- Banco: PUBLIC e o app perdem TEMP (tabela temporária sombreia relação não qualificada, pg_temp
-- é buscado primeiro) e CREATE (CREATE SCHEMA "prospector_app"/qualquer nome). CONNECT de PUBLIC
-- fica como está (outros papéis do provedor podem depender dele); app/migrator recebem explícito.
SELECT format('REVOKE CREATE, TEMPORARY ON DATABASE %I FROM PUBLIC, prospector_app', current_database()) \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO prospector_migrator, prospector_app', current_database()) \gexec
-- O migrator também não precisa de TEMP; mantém CREATE só se já tiver (não criamos schemas).
SELECT format('REVOKE TEMPORARY ON DATABASE %I FROM prospector_migrator', current_database()) \gexec

-- search_path fixo (A1/A4): sem "$user", um schema homônimo do papel não sombreia public.
-- App: pg_catalog primeiro (nada em public sombreia built-ins; o app não cria nada, então não
-- importa que o 1º schema do path seja o alvo de CREATE).
-- Migrator (parecer 15 v2, P1): só `public`. Com pg_catalog AUSENTE do path, o Postgres o busca
-- implicitamente ANTES de public, então nenhuma função/operador em public (inclusive de extensão
-- ou resíduo do app de antes do rollout) sombreia built-ins para o dono/BYPASSRLS. E o alvo de
-- CREATE continua sendo public, que é onde o Prisma cria `_prisma_migrations` sem qualificar
-- (com pg_catalog explícito em 1º: "permission denied for schema pg_catalog", testado).
ALTER ROLE prospector_app SET search_path = pg_catalog, public;
ALTER ROLE prospector_migrator SET search_path = public;

ALTER SCHEMA public OWNER TO prospector_migrator;

-- Posse: tudo em public que não pertence a extensão vai para o migrator (sem exceções).
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
-- C1: em bancos vindos de PG < 15 (ou gerenciados) PUBLIC ainda tem CREATE em public.
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM prospector_app;
GRANT USAGE ON SCHEMA public TO prospector_app;
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
            -- USAGE basta para nextval(); sem UPDATE o app não faz setval() (parecer 15, BAIXA).
            EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO prospector_app', r.relname);
        ELSE
            EXECUTE format('REVOKE ALL ON TABLE public.%I FROM prospector_app', r.relname);
            EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO prospector_app', r.relname);
        END IF;
    END LOOP;
END
$$;

-- Funções (B1/C2): nenhuma função própria do projeto (não-extensão) é executável por PUBLIC nem
-- pelo app, a não ser as da allowlist abaixo. Funções de extensão (vector, pg_trgm) ficam como a
-- extensão as criou (os operadores do pgvector dependem delas). Funções de trigger NÃO precisam
-- de EXECUTE para disparar; SECURITY DEFINER nunca entra na allowlist sem revisão do Agente 15.
DO $$
DECLARE
    r RECORD;
    -- Allowlist revisada: assinaturas regprocedure que o app chama direto (hoje: nenhuma).
    allowlist CONSTANT text[] := ARRAY[]::text[];
BEGIN
    FOR r IN
        SELECT p.oid::regprocedure AS sig
          FROM pg_proc p
         WHERE p.pronamespace = 'public'::regnamespace
           AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')
    LOOP
        EXECUTE format('REVOKE ALL ON ROUTINE %s FROM PUBLIC, prospector_app', r.sig);
        IF r.sig::text = ANY (allowlist) THEN
            EXECUTE format('GRANT EXECUTE ON ROUTINE %s TO prospector_app', r.sig);
        END IF;
    END LOOP;
END
$$;

-- Objetos FUTUROS criados pelo migrator (migrations) já nascem com DML para o app.
-- Tabelas com regime restrito (ex.: cadeia LGPD do PR #35) ajustam os próprios grants na
-- migration e no hook abaixo, que roda DEPOIS destes defaults.
ALTER DEFAULT PRIVILEGES FOR ROLE prospector_migrator IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO prospector_app;
ALTER DEFAULT PRIVILEGES FOR ROLE prospector_migrator IN SCHEMA public
    REVOKE ALL ON SEQUENCES FROM prospector_app;
ALTER DEFAULT PRIVILEGES FOR ROLE prospector_migrator IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO prospector_app;
-- Funções futuras: sem EXECUTE para PUBLIC (default global do papel; o default por schema só
-- consegue ADICIONAR) e sem EXECUTE para o app — cada migration concede o que precisar, por função.
ALTER DEFAULT PRIVILEGES FOR ROLE prospector_migrator IN SCHEMA public
    REVOKE EXECUTE ON FUNCTIONS FROM prospector_app;
ALTER DEFAULT PRIVILEGES FOR ROLE prospector_migrator
    REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
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

-- (PR #39) O antigo `GRANT CREATE ON DATABASE ... TO prospector_app` (AI-002, exigido pelo
-- `PostgresSaver.setup()`) foi removido: as tabelas do LangGraph vêm da migration e o app só
-- confere a versão (src/lib/ai/checkpointer.ts). O REVOKE lá em cima tira o grant de bancos antigos.
