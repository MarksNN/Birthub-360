# Parecer independente — Onda 53: falha do teste de tema em Settings

## Identificação

- **Missão:** reavaliar a correção do tema persistido em Settings
- **Autor:** Agente 02
- **Auditor:** Agente 24
- **Base:** `origin/main` — `b2fb5a6f7b1e74f985cd2cb62fe32f3bf8da951e`
- **Branch/worktree:** `agents/fix-settings-theme-test-failure`
- **HEAD auditado:** `b2fb5a6f7b1e74f985cd2cb62fe32f3bf8da951e`
- **Arquivo de produto auditado:** `src/contexts/ThemeContext.tsx`
- **SHA-256 do conteúdo não commitado:** `8124B86992C25084E096FED5F1F97A6844E258AF4652830663C098F1C4926BE6`
- **Diff:** 4 adições, 1 remoção; status inicial continha somente `src/contexts/ThemeContext.tsx`.

## Critérios e análise

1. **Diff, escopo e simplicidade — atendidos.** A alteração substitui o estado inicial fixo `light` por leitura preguiçosa de `atlas_theme`, aceita somente `dark`/`light` e usa `light` como fallback. Não há alterações em testes, dependências ou arquivos alheios. `tests/AGENTS.md` identifica Agente 08 como proprietário dos testes; portanto, não alterar o teste respeita a propriedade.
2. **Intenção e comportamento do teste — atendidos.** `.agents/VISUAL_ARCHITECTURE_INVENTORY.md` descreve persistência de tema em `localStorage`. O teste existente semeia `atlas_theme=dark`, monta o provider e verifica o estado escuro antes e depois do clique. O estado anterior sempre `light` contradizia essa preferência; inicializá-lo da chave persistida corrige a causa descrita, enquanto `Settings` continua fixando o modo explicitamente.
3. **SSR — sem risco no caminho de execução atual.** A aplicação inicializa no browser via `createRoot` em `src/main.tsx`; não foi encontrado fluxo de renderização SSR da aplicação. O initializer, contudo, passa a pressupor `localStorage` sempre que `ThemeProvider` for renderizado. Reutilização futura em SSR precisará de proteção ou inicialização client-side.
4. **Falha de inicialização quando storage é bloqueado — achado.** `localStorage.getItem` pode lançar `SecurityError` em contextos nos quais o acesso ao storage é negado. A chamada agora ocorre sincronicamente durante a renderização do provider e pode impedir a montagem de toda a aplicação. Antes da alteração, o acesso ocorria apenas no efeito pós-montagem; o efeito também escreve sem proteção, mas não impedia a renderização inicial. Não há evidência de que o ambiente de produção bloqueie storage, porém o novo caminho de falha é direto e não está tratado nem coberto. Recomenda-se proteger a leitura e manter fallback `light`; acrescentar teste de regressão para `getItem` que lança. Considerar também que a escrita não protegida do efeito pode impedir a aplicação das classes de tema nesse ambiente.

## Comandos executados e resultados

| Comando | Resultado |
|---|---|
| `npm run test:unit -- tests/unit/features/settings/Settings.test.tsx` | **PASSOU** — 1 arquivo, 5 testes |
| `npx biome lint src/contexts/ThemeContext.tsx` | **PASSOU** — 1 arquivo, sem correções |
| `npx tsc --noEmit` | **PASSOU** — exit 0 |
| `npm run lint` | **PASSOU** — exit 0; avisos do Biome em outros arquivos, sem alteração desses arquivos no diff |
| `npm run build` | **PASSOU** — exit 0 |
| `npm run test:e2e -- tests/e2e/accessibility.spec.ts` | **BLOQUEADO** — exit 1 no pretest antes de executar testes; `Docker CLI não encontrado no PATH`, serviços reais exigidos |
| `git diff --check` | **PASSOU** — exit 0 |
| `Get-FileHash -Algorithm SHA256 src/contexts/ThemeContext.tsx` | `8124B86992C25084E096FED5F1F97A6844E258AF4652830663C098F1C4926BE6` |

O E2E não é aprovado nem considerado skip. A tentativa direta de Playwright citada pelo autor não foi usada como evidência de produto nem como gate.

## Achado

- **Prioridade:** média
- **Proprietário da correção:** Agente 02
- **Problema:** leitura não protegida de `localStorage` no initializer pode lançar durante render e bloquear a aplicação em navegador/contexto que nega acesso ao storage.
- **Correção esperada:** fallback seguro para `light` se a leitura falhar, sem permitir que essa exceção escape do render; cobrir a falha com teste. Reavaliar o efeito de escrita se o suporte a storage indisponível fizer parte do contrato.
- **Teste esperado:** manter o teste atual de preferência `dark` e adicionar caso em que `getItem` lança, confirmando que o provider ainda monta com fallback seguro.

## Pendências e riscos

- O gate E2E permanece **NÃO EXECUTADO**, bloqueado pela ausência do Docker CLI.
- A cobertura executada comprova o caminho normal com preferência `dark`; não comprova a falha de acesso ao storage.
- Não houve inspeção visual em navegador.
- Nenhum commit, push ou merge foi executado ou autorizado.
- Handoffs abertos: nenhum; correção pertence ao autor e esta missão autorizou escrever somente o parecer.

## Veredito

**REPROVADO.** O teste unitário, typecheck, lint e build passam, e não foi identificado risco SSR no caminho atual. Porém, a alteração introduz uma falha síncrona de inicialização não tratada quando o acesso ao `localStorage` é negado. A entrega precisa corrigir ou demonstrar que esse contexto está fora do suporte e incluir evidência apropriada. Este parecer não autoriza integração.
