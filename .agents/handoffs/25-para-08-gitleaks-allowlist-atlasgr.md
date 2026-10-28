De: Agente 25 — PR & CI Commander
Para: Agente 08 — QA e Release
Onda: Corrente
Status: aberto
Prioridade: bloqueador
Bloqueador-ref: CI run 40718475789 (secret scan failure)
Sprint destino: Corrente

## Problema

O CI está falhando no gate "secret scan" (Gitleaks) devido a falsos-positivos não incluídos na allowlist do `.gitleaks.toml`.

## Arquivo(s) envolvido(s)

- `.gitleaks.toml`

## Evidência

Run atual: https://github.com/MarksNN/Birthub-360/actions/runs/40718475789
Job: Central Birth Hub 360 / secret scan (ID: 122922550941)
Conclusão: failure

Gitleaks detectou 43 leaks no histórico, sendo 31 em arquivos:
```
public/tools/treinamento-atlasgr/trilha/*/__next._tree.txt
```

Exemplo de leak detectado:
```
File: public/tools/treinamento-atlasgr/trilha/03-gerenciamento-risco/__next._tree.txt
Line: 4
Commit: 490919e96b0a63b16d8908510d8295736aabdecd
RuleID: generic-api-key
Secret: REDACTED
```

## Análise

1. O arquivo `.gitleaks.toml` já tem uma allowlist para:
   ```toml
   '''public/tools/treinamento-birthhub360/.*/__next\._tree\.txt$'''
   ```

2. Porém, os leaks encontrados estão em `public/tools/treinamento-atlasgr/trilha/*/__next._tree.txt` - um caminho diferente não coberto pela allowlist atual.

3. Esses arquivos `__next._tree.txt` são metadados de build gerados automaticamente pelo Next.js (route tree RSC) — não são código-fonte nem segredos reais.

4. Os arquivos de treinamento-atlasgr **não existem mais** no código atual (confirmado via `ls`), mas o Gitleaks escaneia todo o histórico de commits (4134 commits) e encontra esses falsos-positivos de commits antigos (2026-09-02).

5. O run anterior do mesmo SHA `1a5099598` (run 40684671699) teve secret scan com sucesso, o que indica que:
   - Ou a configuração mudou entre os runs
   - Ou houve um comportamento inconsistente do Gitleaks

## Alteração necessária

Adicionar o caminho faltante à allowlist do `.gitleaks.toml`:

```toml
[allowlist]
paths = [
  '''public/tools/treinamento-birthhub360/.*/__next\._tree\.txt$''',
  '''public/tools/treinamento-atlasgr/.*/__next\._tree\.txt$''',  # ADICIONAR ESTA LINHA
  '''(^|/)phase-12-manifest\.json$''',
  '''tests/unit/features/integrations/stripe/.*\.test\.ts$''',
  '''tests/unit/features/integrations/omie/.*\.test\.ts$''',
  '''\.agents/runs/.*\.md$''',
]
```

## Teste esperado

Após a alteração, o gate "secret scan" deve passar ao escanear o SHA `1a5099598` (o SHA verde onde o Landing360.css foi restaurado).

## Contexto adicional

Esta alteração segue o mesmo padrão do falso-positivo conhecido #3 já documentado no `.gitleaks.toml` (linhas 27-35): arquivos `__next._tree.txt` de treinamentos são metadados de build, não segredos reais.

O padrão regex de caminho é preferível sobre regex de conteúdo porque o conteúdo (slugs de rota, hashes) varia por página, enquanto o caminho do arquivo é o identificador estável.
