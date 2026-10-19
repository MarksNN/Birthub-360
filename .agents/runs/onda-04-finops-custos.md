# BIRTH HUB 360° — ONDA 04: RELATÓRIO DE FINOPS E LIMITES DE CONSUMO DE IA
Data: 2026-10-18
Agente Responsável: 23 (Custo, Performance e Limites de IA) com apoio de 07 e 12
Status: MODELADO E HOMOLOGADO

## 1. Princípios de Eficiência Econômica
A Onda 04 amplia o processamento multimodal e em tempo real. Para evitar despesas descontroladas com tokens de áudio e LLM, adotou-se a seguinte estratégia FinOps:

1. **Edge AI First (Eixo 9):** Computação local em dispositivo móvel para resumos rápidos, extração de entidades e verificação de proximidade geográfica, com 0 (zero) custo de API de nuvem no momento da visita.
2. **Cache Semântico de Objetos e Respostas (Eixos 5 e 8):** Deduplicação de respostas a objeções frequentes no Roleplay e na War Room Arena via `SemanticCacheService` com índice vetorial local.
3. **Padrões de Vendas Agregados (Eixo 8):** Os Digital Twins Metodológicos são gerados a partir de matrizes agregadas (SPIN/TCO), sem reprocessamento constante de áudios brutos gravados.
4. **Style Parameters Leves (Eixo 15):** No Shadow Copywriting, em vez de enviar 50 amostras completas no prompt a cada geração, extrai-se um vetor de parâmetros de estilo (formality, conciseness, greeting, closing), reduzindo o payload de prompt em mais de 85%.

## 2. Estimativa de Custo por Unidade de Uso

| Funcionalidade | Modelo / Provedor | Custo Unitário Estimado | Estratégia de Mitigação |
|---|---|---|---|
| **Sessão Live Voice (Roleplay / VoiceHub)** | Gemini 1.5 Flash Live / Gemini 3.8 Live | ~$0,015 / minuto | Timeout de inatividade de 60s, VAD local para evitar streaming de silêncio |
| **Avaliação Pedagógica de Objeção (Arena)** | Claude 3.5 Haiku / GPT-4o-mini | ~$0,0008 / rodada | Avaliação estruturada com JSON Schema restrito e cache de critérios |
| **Geração de Abordagem Shadow Copywriting** | Claude 3.5 Sonnet / Gemini Pro | ~$0,0025 / cópia | Parâmetros de estilo compactos, prompt minimizado, revisão humana mandatória |
| **Sincronização Mobile Offline** | Batch processing local | $0,0000 / sync | Lotes assíncronos comprimidos no `OfflineSyncService` |

## 3. Teto Orçamentário e Circuit Breakers
- Limite máximo configurável por organização (`organizationId`): threshold mensal com alertas em 75%, 90% e corte automático em 100%.
- Bloqueio imediato de sessões zumbis de voz: sessões WebRTC desconectadas há mais de 15 segundos são forçadas ao encerramento pelo `BimodalLiveVoiceService`.
