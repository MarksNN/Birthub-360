# ONDA 03 — ARQUITETURA DO PREDICTIVE REVENUE ORACLE
**Eixo 20: Cockpit Executivo, Simulação What-If e Alocação Inteligente de Contas**  
**Responsáveis:** Agentes 04 (CRM/BI), 07 (IA), 13 (Swarm), 23 (FinOps) e 02 (UX/Interface)  
**Coordenação:** Agente 00  
**Data:** Outubro de 2026  

---

## 1. Visão Geral
O **Predictive Revenue Oracle** é a camada analítica de governança de receita do Birth Hub 360, projetada para diretores comerciais, CROs e CEOs. Ela oferece projeção determinística e estatística de receita, simulação de cenários contrafactuais (**What-If**) sem tocar nos dados de produção, e recomendações supervisionadas de balanceamento de carteiras comerciais.

### Princípios Inegociáveis:
1. **Zero Mutação de Dados Reais:** Nenhuma simulação What-If altera o banco de dados operacional ou os registros dos negócios.
2. **Incerteza Explícita:** Apresentação obrigatória de intervalos de confiança (P10 pessimista, P50 mediana esperada, P90 otimista). Previsão matemática nunca é apresentada como garantia de faturamento.
3. **Alocação Supervisionada:** Recomendações de redistribuição de contas são orientadas por especialização, capacidade e equidade de carga, exigindo aprovação expressa do gestor (`status: PENDING_APPROVAL`).

---

## 2. Horizontes de Projeção e Intervalos de Confiança
O motor calcula previsões em três janelas temporais a partir do pipeline ponderado e win rate histórico:
- **30 dias:** P50 baseado em negócios em fechamento e ciclo curto.
- **90 dias:** P50 trimestral com ajuste por velocidade de etapas.
- **180 dias:** P50 semestral considerando taxa de perda e geração de demanda.

Cada projeção reporta:
- `p10Pessimistic`: Piso de segurança operacional (80% do ponderado).
- `p50MedianExpected`: Valor esperado mediano.
- `p90Optimistic`: Teto de captura com aceleração de conversão (125% do ponderado).
- `uncertaintyGrade`: Classificação de certeza baseada no volume de dados (`LOW`, `MEDIUM`, `HIGH`).

---

## 3. Motor de Simulação What-If
Permite aos líderes testar variações de parâmetros comerciais de forma interativa:
- $\Delta \text{ Prospecção}$ (ex: $+15\%$): Acelera receita projetada e volume de pipeline.
- $\Delta \text{ Ciclo de Vendas}$ (ex: $+10$ dias): Reduz a velocidade e impõe penalidade de receita no período.
- $\Delta \text{ Win Rate}$ (ex: $-5\%$): Recalcula a taxa de perda ponderada.
- $\Delta \text{ Contratação de Vendedores}$ (ex: $+3$ SDRs/Closers): Incorpora capacidade comercial adicional com período de ramp-up.

---

## 4. Backtesting e Calibração Retrospectiva
O modelo mede seu próprio desempenho contra períodos históricos passados:
- **Mean Absolute Error (MAE):** Desvio médio absoluto em reais.
- **Mean Absolute Percentage Error (MAPE %):** Erro percentual relativo.
- **Prediction Bias:** Tendência de superestimação ou subestimação.
- **Coverage 80%:** Percentual dos resultados reais que caíram dentro do intervalo P10-P90 (alvo: >= 80%).
- **Is Calibrated:** Flag booleana indicando se o modelo atende aos critérios de calibração estatística.

---

## 5. Alocação Inteligente de Contas
- Analisa contas chave e vendedores disponíveis, avaliando especialização setorial (ex: Logística, Finanças) e taxa histórica de conversão.
- Gera proposta fundamentada com `expectedWinRateImprovementPercent` e justificativa auditável.
- Aplicação somente após aprovação humana documentada com registro do evento `ACCOUNT_ALLOCATION_RECOMMENDED`.
