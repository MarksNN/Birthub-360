- De: 00 (Coordenador)
- Para: 03 (Design e Acessibilidade) e 02 (Produto e UX)
- Onda: liquidacao-debitos
- Status: resolvido
- Prioridade: alto (Trilha 5 da missão original)

## Problema

Validar acessibilidade WCAG 2.2 AA em componentes de layout e modais recentemente estilizados (Trilha 5 da missão original).

## Evidência

Execução de `npm run lint` revelou 8 avisos de acessibilidade (lint/a11y):

### 1. Componentes UI (Responsabilidade Agente 03)

**Card.tsx (linha 161):**
```tsx
<div
  ref={ref}
  onPointerMove={handlePointerMove}
  // ...
>
```
- ❌ VIOLAÇÃO: `div` com `onPointerMove` sem role
- ✅ SOLUÇÃO: Adicionar `role="button"` ou usar elemento `<button>` se clicável

**ChannelDonut.tsx (linha 61):**
```tsx
<div
  key={label}
  className="group grid grid-cols-[10px_1fr_auto] items-center gap-3 p-1.5 rounded-lg transition-colors hover:bg-surface-elevated/60"
>
```
- ❌ VIOLAÇÃO: `div` com hover state sem role
- ✅ SOLUÇÃO: Adicionar `role="button"` e `tabIndex={0}` se interativo, ou remover hover se decorativo

**Gamified3DOrb.tsx (linha 58):**
```tsx
<mesh
  ref={meshRef}
  onPointerMove={onPointerMove}
  // ...
>
```
- ❌ VIOLAÇÃO: Elemento 3D com `onPointerMove` sem role
- ✅ SOLUÇÃO: Adicionar `role="button"` e keyboard navigation (Enter/Space)

**KpiCard.tsx (linha 223):**
```tsx
<div
  onPointerMove={handlePointerMove}
  className={sharedClassName}
>
```
- ❌ VIOLAÇÃO: `div` com `onPointerMove` sem role
- ✅ SOLUÇÃO: Adicionar `role="button"` ou usar elemento `<button>` se clicável

**BentoCard.tsx (linha 133):**
```tsx
<div
  role={onClick ? 'button' : undefined}
  // ...
>
```
- ⚠️ PARCIAL: Já tem `role={onClick ? 'button' : undefined}`, mas lint ainda reclama
- ✅ SOLUÇÃO: Verificar se há mouse handlers sem role condicional completo

**KpiCard.tsx (linha 2):**
```tsx
import { ChevronDown } from 'lucide-react';
```
- ⚠️ IMPORT NÃO USADO: `ChevronDown` não é usado no código
- ✅ SOLUÇÃO: Remover import

### 2. Componentes Layout (Responsabilidade Agente 02)

**MacDock.tsx (linha 150):**
```tsx
<div
  key={group.title}
  className="relative flex flex-col items-center"
  onMouseEnter={() => setHoveredGroup(group.title)}
  onMouseLeave={() => setHoveredGroup(null)}
>
```
- ❌ VIOLAÇÃO: `div` com mouse handlers sem role
- ✅ SOLUÇÃO: Adicionar `role="group"` se é container de elementos interativos

**MacDock.tsx (linha 212):**
```tsx
<button
  key={tabId}
  // sem type="button"
>
```
- ❌ VIOLAÇÃO: Button sem `type="button"` (default é `submit`)
- ✅ SOLUÇÃO: Adicionar `type="button"`

**ThemeToggle.tsx (linha 8):**
```tsx
<button
  onClick={toggleTheme}
  // sem type="button"
  aria-label="Alternar tema"
>
```
- ❌ VIOLAÇÃO: Button sem `type="button"` (default é `submit`)
- ✅ SOLUÇÃO: Adicionar `type="button"`

## Resolução

### Status Geral: ⚠️ 8 VIOLAÇÕES ENCONTRADAS

5 violações em componentes UI (Agente 03), 3 violações em layout (Agente 02).

### Ações Necessárias (Agente 03)

**1. Card.tsx (linhas 161-184)**
- Adicionar `role="button"` e `tabIndex={0}` se o card é clicável
- Adicionar `onKeyDown` para suporte a teclado (Enter/Space)
- OU converter para `<button>` se o comportamento é de clique

**2. ChannelDonut.tsx (linha 61-67)**
- Se for decorativo: remover hover state ou adicionar `role="presentation"`
- Se for interativo: adicionar `role="button"`, `tabIndex={0}` e `onKeyDown`

**3. Gamified3DOrb.tsx (linha 58-71)**
- Adicionar `role="button"` e `tabIndex={0}`
- Adicionar `onKeyDown` para Enter/Space
- Adicionar `aria-label` descrevendo a interação

**4. KpiCard.tsx (linha 223-229)**
- Adicionar `role="button"` e `tabIndex={0}` se clicável
- Adicionar `onKeyDown` para teclado
- OU converter para `<button>`

**5. KpiCard.tsx (linha 2)**
- Remover import não usado: `import { ChevronDown } from 'lucide-react'`

**6. BentoCard.tsx (linha 133-153)**
- Verificar lógica condicional de role
- Garantir que todos os mouse handlers tenham role correspondente

### Ações Necessárias (Agente 02)

**1. MacDock.tsx (linha 150-155)**
- Adicionar `role="group"` ao div container do grupo
- OU adicionar `role="presentation"` se for apenas visual

**2. MacDock.tsx (linha 212-220)**
- Adicionar `type="button"` ao elemento button

**3. ThemeToggle.tsx (linha 8-14)**
- Adicionar `type="button"` ao elemento button

## Teste Esperado

1. Navegação por teclado: Tab deve mover foco entre elementos interativos
2. Enter/Space deve ativar botões/cards clicáveis
3. Lint deve passar sem avisos de a11y
4. Verificar contraste de cores (WCAG AA requer 4.5:1 para texto normal)

## Contexto Adicional

- Skill `magnetic-microinteractions` pode ser usado para adicionar interação tátil
- Skill `birthhub-impeccable` pode ser usado para refinamento visual após correções
- Todos os componentes já têm `aria-label` onde aplicável (ThemeToggle)

## Resolução (Agentes 02 e 03)

**Implementado em:** 2026-10-10

**Ações executadas:**

**Agente 03 (Componentes UI):**
- [x] Card.tsx — role/teclado JÁ implementado (linhas 170-182), nenhuma alteração necessária
- [x] ChannelDonut.tsx — role="presentation" adicionado (decorativo, não interativo)
- [x] Gamified3DOrb.tsx — JÁ é um `<button type="button">` com aria-label, nenhuma alteração necessária
- [x] KpiCard.tsx — role/teclado adicionado (tabIndex e onKeyDown)
- [x] KpiCard.tsx — import não usado removido (ChevronDown)
- [x] BentoCard.tsx — role/teclado JÁ implementado (linhas 134-145), nenhuma alteração necessária

**Agente 02 (Layout):**
- [x] MacDock.tsx — role="group" adicionado ao div container do grupo
- [x] MacDock.tsx — type="button" adicionado ao motion.button
- [x] ThemeToggle.tsx — type="button" adicionado

**Alterações em arquivos:**
- `src/components/layout/ThemeToggle.tsx` — type="button" adicionado
- `src/components/layout/MacDock.tsx` — role="group" e type="button" adicionados
- `src/components/ui/KpiCard.tsx` — role/teclado adicionado, import removido
- `src/components/ui/ChannelDonut.tsx` — role="presentation" adicionado

**Componentes sem alteração (já conformes):**
- Card.tsx — já tem role/teclado
- Gamified3DOrb.tsx — já é um button com type="button"
- BentoCard.tsx — já tem role/teclado
