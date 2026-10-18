# MODELO WIN-LOSS DEEP AUTOPSY — ANÁLISE FORENSE DE DEALS
**Projeto:** Birth Hub 360°  
**Eixo:** 19 — Win-Loss Deep Autopsy  
**Contrato:** `src/shared/contracts/winLossAutopsy.contract.ts`  
**Serviço:** `src/features/intelligence/services/winLossAutopsy.service.ts`  

---

## As 9 Seções Estruturadas do Relatório Forense

A autópsia forense do Birth Hub 360 analisa o ciclo de vida completo de uma oportunidade ganha ou perdida, gerando 9 seções padronizadas:

### Seção A: Linha do Tempo Factual
- Histórico cronológico verificado de transições de etapa, calls, reuniões e propostas enviadas.
- Sem omissões ou interpolações artificiais de eventos.

### Seção B: Sinais Positivos Observados
- Elementos favoráveis identificados durante a negociação (patrocinador interno ativo, validação de ROI pelo comitê, feedback verbal positivo).

### Seção C: Sinais Negativos e Objeções Registradas
- Objeções pendentes não superadas, menção explícita de concorrência ou estagnação prolongada em etapa.

### Seção D: Fatores Associados ao Resultado (Hipóteses Fundamentadas)
- Diferenciação rigorosa: a IA nunca afirma causa única absoluta em deals perdidos.
- Apresenta hipóteses primárias e fatores contribuintes com `confidenceScore < 1.0` (ex: 0.85 para atrito de preço; 0.72 para pressão de concorrente).

### Seção E: Evidências Auditáveis
- Citações diretas de mensagens, notas de CRM, transcrições de áudio e datas de ocorrência.

### Seção F: Lacunas de Informação
- Identificação de dados faltantes (ex: ausência de gravação da reunião com o comitê financeiro, decisor econômico não acessado diretamente).

### Seção G: Recomendações de Melhoria de Processo
- Ações corretivas para as etapas de descoberta, qualificação e fechamento.

### Seção H: Candidatos a Aprendizado Curado
- Padrões de objeção ou estratégias vencedoras estruturados para validação humana.
- Estado inicial: `curationStatus: 'proposed'`.
- Requer aprovação de gestor comercial para promoção oficial.

### Seção I: Plano de Ação nos Módulos Integrados
- **Playbook Comercial:** Atualização de contra-argumentos de custo ou pitches vencedores.
- **Roleplay Simulator:** Criação de cenários de simulação com IA baseados na objeção real detectada.
- **RevOps:** Calibração de SLAs, regras de forecast e penalidades de estagnação.
