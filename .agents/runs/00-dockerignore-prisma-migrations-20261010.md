# Run 00 — `.dockerignore` × `prisma/migrations` (item 3 da onda enxuta)

- Data: 2026-10-10 (America/Sao_Paulo)
- Agente: 00 — Coordenador
- Base: `main` @ `33edc320f0e60394ac56994bc6f47e1eb48bdd3d`
- Branch: `agente/00-dockerignore-prisma-migrations`
- Escopo: somente `.dockerignore` + este run + plano da onda. Sem código de app, sem `main`.

## Suspeita

O `.dockerignore` tem `*.sql` na seção de dumps (Bloqueadores #4/#14). A suspeita (prompt enxuto,
item 3) era que isso excluísse `prisma/migrations/**/migration.sql` do contexto de build — o que
faria `npx prisma migrate deploy` (CMD da imagem) subir sem migrations.

## Achado factual

Verificado com o mesmo matcher que Docker/BuildKit usam (`github.com/moby/patternmatcher` v0.6.1,
`MatchesOrParentMatches`): padrões do `.dockerignore` são ancorados na raiz do contexto
(semântica `filepath.Match`). Portanto `*.sql` **só** exclui `.sql` na raiz.

| Caminho | `main` (antes) | branch (depois) |
|---|---|---|
| `prisma/migrations/*/migration.sql` (138 arquivos) | incluído | incluído |
| `prisma/migrations/migration_lock.toml` | incluído | incluído |
| `migrate.sql` / `dump.sql` (raiz) | excluído | excluído |
| `backups/*.sql` | excluído | excluído |
| `scripts/db/create-app-role.sql` (usado por `bootstrap-app-role.sh`) | incluído | incluído |
| `src/features/cadence/dialer/.../migrations/*.sql` | incluído | incluído |
| `.env`, `.agents/**` | excluído | excluído |

Conclusão: **hoje as migrations já entram na imagem**; não havia exclusão efetiva. O risco real é
latente: um "endurecimento" futuro para `**/*.sql` removeria silenciosamente as 138 migrations
(e os `.sql` de `scripts/db/` e do dialer).

## Correção (cirúrgica, defesa em profundidade)

```
*.sql
!prisma/migrations/
!prisma/migrations/**
```

+ comentário explicando a semântica ancorada. Dumps continuam excluídos; nenhum `.sql` novo entra.

Prova de que a exceção resiste ao endurecimento: na variante hipotética com `**/*.sql` +
negação, as 138 migrations continuam `excluded=false` (e `scripts/db/*.sql` passaria a ser
excluído — por isso **não** troquei para `**/*.sql` nesta leva; exigiria decisão + teste do
`bootstrap-app-role.sh` na imagem).

## Como verificar

Com Go (sem Docker):

```go
// go mod init chk && go get github.com/moby/patternmatcher@v0.6.1
package main
import ("fmt";"os";"github.com/moby/patternmatcher";"github.com/moby/patternmatcher/ignorefile")
func main(){ f,_:=os.Open(os.Args[1]); p,_:=ignorefile.ReadAll(f); m,_:=patternmatcher.New(p)
  for _,x:=range os.Args[2:]{ e,_:=m.MatchesOrParentMatches(x); fmt.Println(x,"excluded=",e) } }
```

```bash
go run . .dockerignore $(git ls-files 'prisma/migrations/*.sql') | grep -c 'excluded= false'   # esperado: 138
go run . .dockerignore migrate.sql backups/x.sql   # esperado: excluded= true
```

Com Docker (quando disponível):

```bash
docker build --target builder -t b360-ctx-check . \
  && docker run --rm b360-ctx-check sh -c 'ls prisma/migrations | wc -l; test ! -e migrate.sql && echo dumps-ok'
```

## Gates

Mudança restrita a `.dockerignore` (comentários + 2 linhas de negação) e docs em `.agents/runs/`
(que não entram no contexto Docker). Não afeta `tsc`, `lint`, `test:architecture`, `test:unit`
nem `build` do app; suíte completa não executada nesta leva. Docker não disponível no box —
verificação feita com `moby/patternmatcher` (mesma lib do BuildKit).

## Pendências

- Parecer do Agente 24 antes de merge.
- (Opcional, decisão humana) endurecer para `**/*.sql` com exceções explícitas para
  `scripts/db/` e dialer, após validar uso em runtime.
