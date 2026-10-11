De: 05 — Prospecção
Para: 03 — Design e Acessibilidade (+ Marks Orquestrador / landing)
Onda: landing-clip-20261010
Status: pronto-para-captura
Prioridade: alto

## Pedido
Clip **real** (não mock) do módulo de prospecção em uso, 8–15s, para a landpage.

## Ambiente de captura
- App autenticado no tenant demo/homolog com dados reais (ou busca Discovery que retorne ≥1 candidato).
- Rota base: `/app/prospect` (ProspectingHub).
- **05 não tem app de produção autenticado neste box** (hosts públicos 404 / sem sessão). Captura = 03 (ou 08A) no browser logado do Marcelo.

## Rotas oficiais (BirthHub 360)
| Tela | Rota | Componente |
|------|------|------------|
| Hub de Prospecção | `/app/prospect` | `ProspectingHub` |
| Aba Discovery | `/app/prospect` + tab `discovery` | `DiscoveryFilterPanel` + `DiscoveryResultsPanel` |
| Prospecção Inteligente | `/app/prospect/inteligente` | `ProspeccaoInteligenteHub` |
| MI / LDR | `/app/market-intelligence` | `LdrAccountIntelligence` |
| Radar MI | `/app/market-intelligence/hub` | `InteligenciaMercadoHub` |
| Account 360 | `/app/market-intelligence/accounts/:id` | `Account360` (id = Company CRM) |
| Cadências | `/app/cadence` | `CadenceHub` |

## Fluxo canônico recomendado (~12s) — Discovery → lead → CRM
Evitar CNPJ-first (mais “lookup”); o story comercial é **Radar Discovery**.

| t | Frame / ação | O que deve aparecer |
|---|--------------|---------------------|
| 0.0–1.0s | Abrir `/app/prospect` (já logado) | PageTitle / Hub; tabs visíveis |
| 1.0–2.0s | Clicar tab **「Radar Discovery (Fontes abertas)」** | Painel de filtros ICP |
| 2.0–4.5s | Preencher ICP: Segmento (ex. SaaS/Software), UF/cidade se houver, chip de persona **「+ …」** ou cargo | Campos `discovery-segmento`, personas, cargos |
| 4.5–5.0s | Clicar **「🚀 Encontrar Leads Ideais」** (`#btn-discover`) | Botão → estado **「⏳ Buscando...」** |
| 5.0–8.5s | Resultados reais na lista | Cards com empresa, score/fit, localização — **dados da API**, não HTML estático |
| 8.5–11.0s | Hover/clique no 1º candidato → **「Salvar no CRM」** | Botão vira **「✅ No CRM」** (promote real) |
| 11.0–13.0s | (opcional fecho) Dock/sidebar → **Cadências** `/app/cadence` OU voltar ao card promovido | Mostra continuidade pipeline; se cadência vazia, **parar no ✅ No CRM** (não inventar sequência) |

### Alternativa curta (~9s) se Discovery pago não estiver configurado
1. `/app/prospect` → tab Discovery  
2. Se providers indisponíveis, **não fingir resultados** — usar tab **「Busca Direta (CNPJ/Nome)」** com CNPJ que exista no snapshot/Receita, consultar, **Salvar no CRM**.  
3. Clip honesto > UI maquiada.

## Anti-mock (obrigatório)
- Sem listas hardcoded / seed de demo na UI.
- Network: `POST /api/prospecting/discover` (ou CNPJ) + `POST /api/prospecting/promote` com 2xx.
- Se ambiente sem chave Apollo/hybrid: usar caminho CNPJ/catálogo gratuito e declarar isso na legenda do clip.

## Entrega sugerida pro 03
- Resolução ≥1280×720, 8–15s, sem PII sensível (mascarar e-mail/telefone se necessário).
- Arquivo em assets da landing (combinar com 11/02 no slot da Landing360).
- Legenda sugerida: “Prospecção real no BirthHub 360 — Discovery → lead no CRM”.
