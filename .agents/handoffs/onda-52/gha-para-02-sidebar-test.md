De: gha — Agente de CI/GitHub Actions (workflows sob 08 — QA e Release)
Para: 02 — Produto e UX
Onda: 52
Status: aberto
Prioridade: alto
Bloqueador-ref: GHA-SONAR-02 (run 40203001370)
Sprint destino: workflow SonarQube verde (`Run Tests with Coverage`)

## Problema

`src/features/voice-hub/components/Sidebar.test.tsx` falha na main e na validação combinada #67+#71+#72. O teste procura o texto contínuo `Birth Hub 360`, mas desde `3505031f` ("fix(ui): acessibilidade de contraste e microinteracoes tateis nos sidebars", 2026-10-23) o título é renderizado como `Birth Hub{' '}<span>360</span>`. O `getByText` não encontra texto quebrado entre elementos. Sidebar é ownership do 02 (§15).

## Arquivo(s) envolvido(s)

- `src/features/voice-hub/components/Sidebar.test.tsx:80`
- `src/features/voice-hub/components/Sidebar.tsx:252-257` (`<h1>` com `Birth Hub{' '}` e `<span>360</span>`)

## Evidência

- **Main `6d63eb39`:** SonarQube Analysis run `40203001370`, job `121197953969`, passo `Run Tests with Coverage`. https://github.com/MarksNN/Birthub-360/actions/runs/40203001370
- **Validação `def64798` (main + #67/#71/#72):** run `40204212548`, job `121201569205`. Mesma falha, na mesma linha.

```
FAIL  src/features/voice-hub/components/Sidebar.test.tsx > Sidebar > renders without crashing and shows the main navigation items
TestingLibraryElementError: Unable to find an element with the text: Birth Hub 360. This could be because the text is broken up by multiple elements. In this case, you can provide a function for your text matcher to make your matcher more flexible.
 ❯ src/features/voice-hub/components/Sidebar.test.tsx:80:19
     80|     expect(screen.getByText('Birth Hub 360')).toBeInTheDocument();
```

- O DOM renderizado no log mostra `<h1 ...>Birth Hub <span ...>360</span></h1>`.
- Não tem relação com typecheck. O application gate do Release (run `40204212570`) para antes, em `Run Type Check`; ver os handoffs 01/06/07.

## Alteração necessária

Escolher uma das duas opções (decisão do 02):

1. **Teste:** usar uma query acessível que tolere o texto quebrado, por exemplo `screen.getByRole('heading', { name: 'Birth Hub 360' })` (o nome acessível concatena os nós) ou um matcher de função sobre `textContent`; ou
2. **Componente:** manter `Birth Hub 360` como nome acessível (por exemplo `aria-label` no `<h1>`), se esse for o contrato desejado.

Sem `skip` ou `.todo`.

## Teste esperado

- `npx vitest run src/features/voice-hub/components/Sidebar.test.tsx` verde.
- Workflow SonarQube sem esta falha.

## Contexto adicional

Os outros testes que falham no mesmo run (`AgentExecutor.test.ts` e `gateway.test.ts`) estão encaminhados ao 07 em `gha-para-07-typecheck-ai-agents.md`.
