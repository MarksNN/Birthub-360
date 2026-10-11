# Avaliação e Decisão de Integração de Ferramentas Open Source — Onda 04
**Data:** 11/10/2026  
**Agente Coordenador:** 00 — Coordenador  
**Participantes:** 02 (UX), 03 (Design), 04 (BI), 23 (Performance), 24 (Auditor)  

---

## 1. Princípio de Governança
> **Regra:** Não instalar ou importar dependências de forma automática ou redundante. Cada biblioteca deve justificar seu benefício técnico, impacto no bundle, compatibilidade com o stack Vite/React 18/Tailwind e obrigações de licença.

---

## 2. Matriz de Avaliação Obrigatória

| Ferramenta | Já existe equivalente no repo? | Compatibilidade Vite/React | Licença | Benefício real para o Birthub 360 | Riscos identificados | Decisão Final |
|---|---|---|---|---|---|---|
| **shadcn/ui** | Sim (`src/components/ui/*`) baseada em Radix UI + CVA + Tailwind | Alta | MIT | Padronização e acessibilidade de primitivas (Dialog, Dropdown, Tabs, Button, Card, Badge). | Duplicação de arquivos se importado como novo pacote externo. | **REUTILIZAR & REFINAR** (manter implementação local em `src/components/ui/`, sem pacote externo). |
| **Shadcn Admin** | Não (temos AppLayout e MainLayout próprios) | Média | MIT | Padrões de composição de sidebar colapsável e topbar de comandos. | Importar shell completo quebraria rotas, RBAC, e multitenancy do Birthub. | **DESCARTAR COMO PACOTE / UTILIZAR COMO REFERÊNCIA DE DESIGN**. |
| **Shadcn Dashboard** | Não | Média | MIT | Referência para arranjo de KPI Cards e filtros de datas. | Redundância com componentes de BI existentes. | **UTILIZAR COMO REFERÊNCIA CONCEITUAL**. |
| **Magic UI** | Parcial (`BorderBeam.tsx`, `Magnetic.tsx`) | Alta | MIT | Efeitos táteis e microinterações elegantes em botões e bordas de destaque. | Custo de renderização excessivo se usado em loops/listagens grandes; impacto mobile. | **INTEGRAR PARCIALMENTE** (apenas primitivas leves como `BorderBeam` já adotadas pontualmente, respeitando `prefers-reduced-motion`). |
| **Tremor** | Sim (Recharts e ECharts já estão instalados no repo) | Média | Apache-2.0 | Gráficos analíticos prontos para dashboard. | **Altíssimo risco de inchaço do bundle**. O projeto já carrega `vendor-echarts` (654 KB) e `vendor-charts` (443 KB). | **DESCARTAR** (utilizar Recharts/ECharts existentes com tokens canônicos). |
| **Onlook** | Não | Baixa / Complexa | Apache-2.0 | Edição visual assistida por IA. | Exige tooling específico, plugins de build invasivos e pode quebrar Vite HMR. | **DESCARTAR** (incompatível com a esteira CI/CD atual). |
| **Screenshot-to-Code** | Não | N/A (Ferramenta externa/CLI) | MIT | Geração de protótipos de tela a partir de mockups. | Gera código desconectado dos contratos de API e do design system do produto. | **DESCARTAR PARA RUNTIME** (código de IA não pode entrar em prod sem refatoração). |

---

## 3. Diretrizes de Execução para a Onda 05 (Modernização Progressiva)
- **App Shell & Design System**: Continuaremos utilizando as primitivas já consolidadas em `src/components/ui/`, alimentadas pelos tokens centralizados em `src/styles/globals.css`.
- **Dashboards & Visualização**: Gráficos continuarão padronizados sobre os componentes existentes de Recharts/ECharts sem introduzir Tremor.
- **Microinterações**: Framer Motion já instalado (`vendor-motion`) e microinterações magnéticas e beams com aceleração por GPU.
