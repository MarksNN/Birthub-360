# ONDA 03 — MODELO ECONÔMICO DO ROI SIMULATOR
**Eixo 17: Engenharia Econômica da Venda e Business Cases Interativos**  
**Responsáveis:** Agentes 04 (CRM/BI), 07 (IA), 17 (Receita) e 23 (FinOps/Custos)  
**Coordenação:** Agente 00  
**Data:** Outubro de 2026  

---

## 1. Visão Geral e Princípios Financeiros
O **ROI Simulator** do Birth Hub 360 fornece modelagem econômica determinística para apoiar vendedores em negociações consultivas baseadas em valor. 

### Princípios Não-Negociáveis:
1. **Transparência Absoluta:** Distinção explícita entre dados observados da empresa, dados fornecidos pelo cliente e premissas estimadas. A IA nunca fabrica números como se fossem verdades comprovadas.
2. **Matemática Financeira Confiável:** Sem divisões por zero ou paybacks irreais.
3. **Cenários Comparativos:** Apresentação simultânea de três cenários fundamentados: Conservador, Base e Otimista.

---

## 2. Fórmulas Matemáticas Oficiais

### 2.1. Economia Mensal Estimada
$$\text{Economia Mensal} = (\text{Horas Economizadas por Colaborador} \times \text{Colaboradores Afetados} \times \text{Custo Hora Médio}) + \text{Perdas Evitadas}$$

### 2.2. Benefício Líquido
$$\text{Benefício Líquido Mensal} = \text{Economia Mensal} - \text{Custo Mensal da Solução}$$
$$\text{Benefício Líquido Anual} = (\text{Benefício Líquido Mensal} \times 12) - \text{Investimento Inicial}$$

### 2.3. Retorno sobre Investimento (ROI %)
$$\text{Investimento Anual Total} = \text{Investimento Inicial} + (\text{Custo Mensal da Solução} \times 12)$$
$$\text{ROI} (\%) = \left( \frac{\text{Benefício Líquido Anual}}{\text{Investimento Anual Total}} \right) \times 100$$
*Se o investimento for zero, o ROI é reportado como 0.0 com anotação de premissa.*

### 2.4. Payback Simples (Meses)
$$\text{Payback (meses)} = \frac{\text{Investimento Inicial}}{\text{Benefício Líquido Mensal}}$$
*Condição de Aplicação:* Somente calculado quando $\text{Benefício Líquido Mensal} > 0$ e $\text{Investimento Inicial} > 0$. Caso o benefício mensal seja negativo ou zero, o payback é considerado indeterminado (`null`) e o sistema sinaliza risco econômico.

---

## 3. Matriz de Cenários

| Parâmetro | Cenário Conservador | Cenário Base | Cenário Otimista |
|---|---|---|---|
| **Premissa de Adoção** | 60% do potencial teórico | 100% da estimativa padrão | 125% com expansão de uso |
| **Horas Economizadas** | Fator 0.6x | Fator 1.0x | Fator 1.25x |
| **Perdas Evitadas** | Fator 0.5x | Fator 1.0x | Fator 1.2x |
| **Finalidade** | Análise de piso de retorno e proteção de risco | Base central da proposta comercial | Potencial máximo de valor gerado |

---

## 4. Estrutura do Business Case
O `RoiSimulatorService` compila a apresentação comercial executiva com:
1. **Diagnóstico da Dor:** Descrição dos gargalos operacionais e volumetria.
2. **Quadro de Investimento e Custos:** Capex (setup/onboarding) e Opex (assinatura).
3. **Quadro de Benefícios:** Horas liberadas e custos de ineficiência eliminados.
4. **Resumo Executivo de ROI e Payback.**
5. **Matriz de Sensibilidade:** Variação de ganhos conforme taxa de adesão (50% a 150%).
6. **Declaração de Riscos e Próximos Passos.**
