-- PR #39 / parecer 15 (A1-A3): as tabelas do checkpointer LangGraph
-- (@langchain/langgraph-checkpoint-postgres 1.0.5) deixam de ser criadas em runtime por
-- `PostgresSaver.setup()` (que exigia CREATE no banco e no schema public para o papel do app) e
-- passam a nascer aqui, como prospector_migrator. O DDL é o mesmo de `getMigrations()` em
-- node_modules/@langchain/langgraph-checkpoint-postgres/dist/migrations.js (v0..v4, com a v4 —
-- `blob DROP NOT NULL` — já incorporada em checkpoint_blobs) e `checkpoint_migrations` é
-- preenchida com 0..4, então um `setup()` eventual (rodado como migrator) é no-op.
-- O app recebe só DML pelos default privileges do migrator (scripts/db/create-app-role.sql).
-- As tabelas ficam fora do schema.prisma: estão em `tables.external` do prisma.config.ts.
-- Bancos antigos em que o app já criou essas tabelas: IF NOT EXISTS as preserva (com os dados);
-- re-rodar scripts/db/create-app-role.sql transfere a posse ao migrator (não há mais exceção).

CREATE TABLE IF NOT EXISTS "checkpoint_migrations" (
    v INTEGER PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS "checkpoints" (
    thread_id TEXT NOT NULL,
    checkpoint_ns TEXT NOT NULL DEFAULT '',
    checkpoint_id TEXT NOT NULL,
    parent_checkpoint_id TEXT,
    type TEXT,
    checkpoint JSONB NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
);

CREATE TABLE IF NOT EXISTS "checkpoint_blobs" (
    thread_id TEXT NOT NULL,
    checkpoint_ns TEXT NOT NULL DEFAULT '',
    channel TEXT NOT NULL,
    version TEXT NOT NULL,
    type TEXT NOT NULL,
    blob BYTEA,
    PRIMARY KEY (thread_id, checkpoint_ns, channel, version)
);

CREATE TABLE IF NOT EXISTS "checkpoint_writes" (
    thread_id TEXT NOT NULL,
    checkpoint_ns TEXT NOT NULL DEFAULT '',
    checkpoint_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    idx INTEGER NOT NULL,
    channel TEXT NOT NULL,
    type TEXT,
    blob BYTEA NOT NULL,
    PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
);

-- v4 do pacote, só se a tabela já existia (criada pelo app) e é nossa; senão o bootstrap resolve.
DO $$
BEGIN
    IF pg_get_userbyid((SELECT relowner FROM pg_class WHERE oid = 'public.checkpoint_blobs'::regclass)) = current_user THEN
        ALTER TABLE "checkpoint_blobs" ALTER COLUMN blob DROP NOT NULL;
    END IF;
END
$$;

INSERT INTO "checkpoint_migrations" (v) VALUES (0), (1), (2), (3), (4) ON CONFLICT (v) DO NOTHING;
