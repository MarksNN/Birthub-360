# BirthHub 360 — Design Language v2.0

> *"Not just another SaaS. A Business Command Center."*

## 1. Brand DNA

### Personality
- **Authoritative** — speaks with confidence, not bravado
- **Intelligent** — shows insight, not just data
- **Precise** — every pixel earns its place
- **Operational** — built for work, not for show
- **Connected** — the 360° means nothing is isolated

### Brand Attributes
| Attribute | Expression |
|-----------|------------|
| Intelligence | Clean information hierarchy, not purple sparkles |
| Precision | Mathematical spacing, intentional radius scale |
| Authority | Navy foundation, gold accents that mean something |
| 360° Vision | Orbital motifs, radial layouts, concentric depth |
| Premium Technology | Surface layering, spatial shadows, material depth |

### Visual DNA (from brand reference)
- **Composition**: Asymmetric, editorial — not grid-locked
- **Hierarchy**: Strong editorial headlines, descending density
- **Color Role**: Navy = command; Gold = signal/action; Off-White = clarity
- **Orbital Concept**: The 360° system — DATA → INTELLIGENCE → DECISION → EXECUTION
- **Depth**: Layered surfaces (bg → surface → elevated), not flat

### Anti-Patterns
- ❌ Rainbow color-per-module (not every section needs a unique color)
- ❌ Purple as default AI color
- ❌ Infinite glowing/pulsing decorations
- ❌ Generic SaaS dashboard layouts (4 cards + 2 charts)
- ❌ Gradient text as the only identity element
- ❌ Every element in a rounded pill or circle
- ❌ Decorative borders with no structural function

## 2. Color System

### Primary Neon Palette
```
Azul Neon       #00D4FF  — Tecnologia, confiança, inovação. Cor padrão de títulos, bordas e destaque comercial
Rosa Neon       #FF2D9B  — Energia, criatividade, atitude. Destaques, tags, inteligência e gradientes de botões
Dourado Neon    #FFC107  — Sofisticação, prosperidade, previsibilidade e métricas
Preto Neon      #0D0D0D  — Fundo principal da página (Dark Mode), gerando alto contraste
Branco Neon     #F8F9FF  — Textos corridos de corpo, subtítulos secundários e leitura padrão
Fundo de Cards  #14141A  — Superfícies e cartões de conteúdo
Bordas Glow     rgba(0, 212, 255, 0.22) — Bordas com efeito neon sutil
```

### Gradients & Light Tones
```
Gradiente de Títulos:    linear-gradient(135deg, #00D4FF 0%, #FF2D9B 50%, #FFC107 100%)
Gradiente de Ação (CTA): linear-gradient(135deg, #FF2D9B 0%, #00D4FF 100%)
Tons Light:              Rosa claro (#E6007A), Azul claro (#0284C7), Dourado/Âmbar (#D97706)
```

### Mandatory Title Rule
> **Regra Mandatória do Design:** Todos os títulos (`h1` ao `h6`) devem usar as cores neon (`#00D4FF`, `#FF2D9B` ou `#FFC107`) ou gradientes oficiais, **nunca branco ou preto**.

## 3. Typography System

### Font Roles
| Role | Font | Usage |
|------|------|-------|
| Primary & Titles | Plus Jakarta Sans | Corpo e títulos: H1–H6, parágrafos, formulários, botões (400, 500, 600, 700, 800) |
| Display (Alternativa) | Sora | Display, heros institucionais e botões especiais |
| Data & Code | JetBrains Mono | Badges técnicos, KPIs, contadores, tags numéricas e pilares (500, 700) |

### Scale
| Token | Size | Line Height | Font | Usage |
|-------|------|-------------|------|-------|
| display | clamp(2.5rem, 5vw, 4rem) | 1.05 | Sora 800 | Hero, marketing |
| h1 | clamp(1.625rem, 3.2vw, 2.375rem) | 1.15 | Sora 700 | Page title |
| h2 | clamp(1.35rem, 2.5vw, 1.85rem) | 1.2 | Sora 600 | Section title |
| h3 | clamp(1.15rem, 2vw, 1.5rem) | 1.25 | Sora 600 | Card title |
| h4 | clamp(1rem, 1.2vw + 0.5rem, 1.25rem) | 1.3 | Sora 500 | Subsection |
| body | 0.9375rem (15px) | 1.6 | IBM Plex Mono 400 | Body text |
| body-sm | 0.8125rem (13px) | 1.5 | IBM Plex Mono 400 | Secondary text |
| label | 0.75rem (12px) | 1.4 | IBM Plex Mono 500 | Labels, captions |
| data | 0.8125rem (13px) | 1.4 | IBM Plex Mono 500 | Data, numeric |
| mono | 0.8125rem (13px) | 1.5 | IBM Plex Mono 400 | Code, tech |

### Typography Rules
- Sora for everything editorial and structural
- IBM Plex Mono for everything operational and data-driven
- Never mix fonts arbitrarily within a single component
- Tracking: -0.02em on Sora large sizes (Display, H1)
- Never use system-ui or Inter directly (Inter is aliased to system-ui — OK)

## 4. Spacing Scale

Base unit: 4px

```
space-1   4px    — Micro gaps
space-2   8px    — Icon gaps, label spacing
space-3   12px   — Compact padding
space-4   16px   — Standard padding
space-5   20px   — Card internal padding
space-6   24px   — Standard card padding  
space-8   32px   — Section spacing
space-10  40px   — Generous section
space-12  48px   — Large section
space-16  64px   — Page-level spacing
space-20  80px   — Hero section
space-24  96px   — Large hero
space-32  128px  — Maximum hero
```

Rule: No arbitrary spacing values. All spacing must be from this scale.

## 5. Border Radius Scale

```
radius-xs   4px   — Micro elements, badges, tags
radius-sm   6px   — Compact controls, pills
radius-md   8px   — Inputs, small cards (radius-control = 10px)
radius-lg   12px  — Cards (radius-card)
radius-xl   16px  — Large cards (radius-card-lg)
radius-2xl  20px  — Hero elements
radius-pill 9999px — Tags, badges that need pill shape
```

Rule: Not everything is rounded. Sophisticated UI knows when NOT to round.
- Tables: radius-sm or sharp on cells, radius-lg on container
- Inputs: radius-control (10px)
- Cards: radius-card (12px)
- Sidebar: sharp edges against viewport edge
- Buttons: radius-control (10px)

## 6. Border System

Borders communicate structure. They are never decorative.

```
border-subtle    1px solid rgba(ink, 0.06)   — Dividers, section separators  
border-default   1px solid rgba(ink, 0.12)   — Card borders, input borders (= --line)
border-strong    1px solid rgba(ink, 0.25)   — Emphasis borders, selected states
border-focus     2px solid var(--brand)       — Focus rings only
border-brand     1px solid var(--brand-0.35) — Brand-accented cards
```

Banned patterns:
- Border-left colored bar on every card (decorative)
- Multiple borders on same element
- Random colored borders as decoration
- border-top + border-bottom inconsistently applied

## 7. Shadow / Elevation System

```
shadow-none     none                           — Flat elements on same surface
shadow-subtle   0 1px 2px rgba(0,0,0,0.04)   — Subtle lift
shadow-card     var(--shadow-card-value)       — Card default elevation
shadow-raised   0 4px 12px rgba(0,0,0,0.08)  — Dropdowns, floating elements  
shadow-floating  0 8px 24px rgba(0,0,0,0.12) — Popovers, command palette
shadow-modal    0 20px 60px rgba(0,0,0,0.20) — Modals, sheets
```

Glow shadows (hover/focus only, NEVER in resting state):
```
shadow-glow-brand   Gold glow — Primary button hover
shadow-glow-brand-strong  — Accent card hover  
```

## 8. Motion System

### Principles
- Every animation has a purpose (feedback, continuity, emphasis)
- Nothing animates infinitely in resting state except the orbital system
- prefers-reduced-motion: all animations collapse to immediate transitions

### Duration Tokens
```
duration-instant  100ms — Press feedback, micro
duration-fast     150ms — Hover states, small UI changes
duration-normal   250ms — Navigation, panel transitions
duration-slow     350ms — Page transitions, modals
duration-slowest  500ms — Complex entry animations
```

### Easing Tokens  
```
eas e-standard    cubic-bezier(0.4, 0, 0.2, 1)  — General UI
eas e-enter       cubic-bezier(0.22, 1, 0.36, 1) — Elements entering (decelerate)
eas e-exit        cubic-bezier(0.4, 0, 1, 1)     — Elements leaving (accelerate)
eas e-emphasized  cubic-bezier(0.16, 1, 0.3, 1)  — Premium entrance, max deceleration
```

### Animation Usage
| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Page transition | Fade + slide 8px | 300ms | ease-enter |
| Card hover | translateY(-2px) + shadow | 250ms | ease-enter |
| Sidebar collapse | Width | 300ms | ease-emphasized |
| Modal enter | Scale 0.96→1 + fade | 250ms | ease-enter |
| Navigation | Background + scale | 150ms | ease-standard |
| Orbital system | Rotation (slow) | 60s | linear |
| Data update | Fade-in-up | 300ms | ease-enter |

### Banned Animations
- ❌ Bounce/spring on UI feedback (save for playful moments only)
- ❌ Infinite pulse-glow on static cards in resting state
- ❌ neon-flicker (cyber-scan, hologram — these feel like a game, not a command center)
- ❌ Elastic easing on navigation or data

## 9. Icon System

### Library: Lucide React (primary)

### Sizes
```
icon-xs  12px — Inline badges, compact labels
icon-sm  14px — Secondary UI, nav items compact
icon-md  16px — Standard UI, navigation items  
icon-lg  20px — Feature icons, card headers
icon-xl  24px — Section icons, empty states
icon-2xl 32px — Focal icons, hero elements
```

### Usage Rules
- stroke-width: 1.75 (not 2 — too heavy; not 1.5 — too light)
- Never put every icon in a colored circle chip
- Icon color = text-ink-2 by default, text-ink on hover/active
- Colored icons ONLY for semantic meaning (success=green, danger=red)
- Nav icons get color from --nav-c-* tokens ONLY on active state

## 10. The Orbital Concept (360° System)

The orbital visual is BirthHub 360's signature. It represents:
```
DATA → INTELLIGENCE → DECISION → EXECUTION → (back to DATA)
```

### Rules
- Must be built in SVG + CSS/Framer Motion (not raster images)
- Must be responsive (scales from 280px to 480px diameter)
- Must respect prefers-reduced-motion (pause rotation)
- Four nodes: DATA (orbit-blue), INTELLIGENCE (iris), DECISION (gold), EXECUTION (ok/green)
- Central nucleus: BirthHub "B" emblem, navy background, gold ring
- Connection lines: subtle, animated (clockwise slow rotation of rings)
- Each node has: icon + label + short description

## 11. AI Language System

AI/Intelligence is communicated through:
- **Contextual insights** (not sparkles)
- **Confidence levels** (subtle percentage or signal strength)
- **Reasoning trails** (expandable context)
- **Action recommendations** (specific, actionable)
- **Signal strength** (visual indicators of confidence)

Never communicate AI with:
- Purple gradients everywhere
- Sparkle (✨) emoji or magic wand icons as the primary AI signal
- Infinite glowing borders
- "AI-powered" badges on every element

## 12. Page Architecture Pattern

Every page follows this logical hierarchy:
```
[Page Context — Breadcrumb + metadata]
[Page Title — H1 + subtitle + primary action]
[Primary Information — Key metrics / signals / status]
[Secondary Information — Detailed data, charts, lists]
[Contextual Actions — Filters, exports, secondary CTAs]
```

But: Adapt the layout to the content. Not all pages need 4-card KPI rows.

## 13. Responsive Strategy

| Breakpoint | Sidebar | Content | Priority |
|-----------|---------|---------|----------|
| 1440px | 240px expanded | Full | Desktop-first |
| 1280px | 220px expanded | Full | Desktop |
| 1024px | 64px collapsed | Full | Tablet landscape |
| 768px | Hidden (hamburger) | Full | Tablet portrait |
| 390px | Hidden (drawer) | Stacked | Mobile |

## 14. Empty / Loading / Error States

Each state must answer:
- **Empty**: What is this section for? Why is it empty? What do I do next?
- **Loading**: Skeleton that matches the expected content shape
- **Error**: What went wrong? What can I do? Is it recoverable?

Loading patterns:
- Skeleton shimmer (not spinner) for content areas
- Progress bar for multi-step operations  
- Inline spinner ONLY for button-triggered actions
- Optimistic UI where safe (form submissions, toggles)

## Revision History
| Version | Date | Change |
|---------|------|--------|
| 2.0 | 2026-09 | Complete redesign — strategic command center direction |
| 1.0 | 2026-06 | Initial design language |

---
*This document is the single source of design truth for BirthHub 360.*

