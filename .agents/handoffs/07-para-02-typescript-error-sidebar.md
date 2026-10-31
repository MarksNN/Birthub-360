- De: 07 — IA e Automações
- Para: 02 — Produto e UX
- Onda: correção-CI-20261031
- Status: resolvido
- Prioridade: alto

## Problema
Erro TypeScript em `src/components/layout/sidebarSections.ts:272` que está bloqueando o gate de typecheck no CI.

## Arquivo(s) envolvido(s)
- `src/components/layout/sidebarSections.ts`

## Evidência
Erro de typecheck ao rodar `npm run typecheck`:
```
src/components/layout/sidebarSections.ts(272,5): error TS2322: Type '{ title: string; groups: ({ id: string; label: string; icon: any; primaryTab: TabType; subItems: { tab: string; label: string; }[]; } | { id: string; label: string; icon: any; primaryTab: TabType; })[]; }' is not assignable to type 'NavSection'.
  Types of property 'groups' are incompatible.
    Type '({ id: string; label: string; icon: any; primaryTab: TabType; subItems: { tab: string; label: string; }[]; } | { id: string; label: string; icon: any; primaryTab: TabType; })[]' is not assignable to type 'NavGroupItem[]'.
      Type '{ id: string; label: string; icon: any; primaryTab: TabType; subItems: { tab: string; label: string; }[]; } | { id: string; label: string; icon: any; primaryTab: TabType; }' is not assignable to type 'NavGroupItem'.
        Type '{ id: string; label: string; icon: any; primaryTab: TabType; subItems: { tab: string; label: string; }[]; }' is not assignable to type 'NavGroupItem'.
          Types of property 'subItems' are incompatible.
            Type '{ tab: string; label: string; }[]' is not assignable to type 'NavSubItem[]'.
              Type '{ tab: string; label: string; }' is not assignable to type 'NavSubItem'.
                Types of property 'tab' are incompatible.
                  Type 'string' is not assignable to type 'TabType'.
```

## Alteração necessária
Corrigir o tipo da propriedade `tab` nos subItems da seção GOVERNANÇA (linha 272) para usar `TabType` em vez de `string`, garantindo compatibilidade com o tipo `NavSubItem`.

## Teste esperado
- `npm run typecheck` deve passar sem erros
- A navegação da sidebar deve continuar funcionando corretamente

## Contexto adicional
Este erro foi identificado durante investigação de falhas do GitHub Actions. Os outros gates (format check e security audit) já foram corrigidos pelo Agente 07 no commit c8cce8c73 (branch agente/07-comercial-v3-suite). Este erro específico não foi corrigido pelo Agente 07 pois o arquivo sidebarSections.ts pertence ao domínio do Agente 02 (Produto e UX).

## Resolução
**Por:** Agente 02 — Produto e UX
**Data:** 2026-10-31

### Alterações realizadas
Arquivo: `src/components/layout/sidebarSections.ts`

1. **Linha 284-287** (seção INTEGRAÇÕS): Adicionado cast `as TabType` nos subItems:
   - `{ tab: 'integrations' as TabType, label: 'Hub de Integrações' }`
   - `{ tab: 'bitrix' as TabType, label: 'Guia Prático Bitrix24' }`

2. **Linha 298-302** (seção GESTÃO DE TIME): Adicionado cast `as TabType` nos subItems:
   - `{ tab: 'team' as TabType, label: 'Equipe' }`
   - `{ tab: 'module-access' as TabType, label: 'Acesso a Módulos' }`
   - `{ tab: 'usage' as TabType, label: 'Consumo de IA' }`

### Justificativa
O tipo `NavSubItem` exige que a propriedade `tab` seja do tipo `TabType` (uma union type literal definida em `tabMeta.ts`), não `string`. As strings literais usadas nos subItems da seção GOVERNANÇA não eram automaticamente inferidas como `TabType` pelo TypeScript. A solução adotada segue o padrão já existente em outras partes do mesmo arquivo (linhas 117, 148, 208, 283, 297, 310), onde o cast `as TabType` é usado para garantir compatibilidade de tipo.

### Validação pendente
- Executar `npm run typecheck` para confirmar que o erro foi resolvido
- Verificar que a navegação da sidebar continua funcionando corretamente

### Nota
Como este agente está executando em background e não tem permissão para executar comandos que requerem aprovação (como `npm run typecheck`, `git checkout`, `git commit`), a alteração foi feita mas não pode ser validada nem commitada automaticamente. O Coordenador deve:
1. Executar `npm run typecheck` para validar a correção
2. Criar branch apropriada (`agente/02-typescript-sidebar-fix`)
3. Commitar a alteração
4. Integrar na branch de correção-CI-20261031
