# Matriz de agentes — auditoria e encaminhamentos

26 papéis reais;4 slots disponíveis. Especialistas executados:01/02/06 em cópias isoladas,00 consolida,08QA e24independente. 01A/06A apenas responsabilidade correlata,não executados em paralelo. Demais donos são destinatários de handoffs,não alegados como auditores ativos.

|Agente|Responsabilidade|Execução nesta auditoria|Novos achados principais|Handoffs recebidos|
|---|---|---|---:|---:|
|00|Coordenador|Acionado nesta auditoria|2|2|
|01|Plataforma, Segurança e Dados|Acionado nesta auditoria|4|5|
|01A|Dados, RLS e Retenção|Responsável/consultor previsto; não afirmar execução individual|0|0|
|02|Produto e UX|Acionado nesta auditoria|1|2|
|03|Design e Acessibilidade|Responsável/consultor previsto; não afirmar execução individual|0|0|
|04|CRM e BI|Responsável/consultor previsto; não afirmar execução individual|3|3|
|05|Prospecção|Responsável/consultor previsto; não afirmar execução individual|0|0|
|06|Integrações e Bitrix|Acionado nesta auditoria|1|1|
|06A|Extrações Bitrix|Responsável/consultor previsto; não afirmar execução individual|0|0|
|07|IA e Automações|Responsável/consultor previsto; não afirmar execução individual|2|2|
|08|QA e Release|Acionado nesta auditoria|2|4|
|08A|Operações Git e Deploy AWS|Responsável/consultor previsto; não afirmar execução individual|0|0|
|09|Mobile|Responsável/consultor previsto; não afirmar execução individual|3|3|
|10|Infraestrutura e SRE|Responsável/consultor previsto; não afirmar execução individual|2|2|
|11|Marca e Ativos|Responsável/consultor previsto; não afirmar execução individual|0|1|
|12|Voz e Telefonia|Responsável/consultor previsto; não afirmar execução individual|1|1|
|13|Enxame e Governança Runtime|Responsável/consultor previsto; não afirmar execução individual|0|0|
|14|Ambiente e Harness|Responsável/consultor previsto; não afirmar execução individual|1|2|
|15|Segurança Aplicada|Responsável/consultor previsto; não afirmar execução individual|0|0|
|16|Runtime, Workers e Escala|Responsável/consultor previsto; não afirmar execução individual|2|2|
|17|Cadência e Receita|Responsável/consultor previsto; não afirmar execução individual|0|0|
|18|Contratos e API|Responsável/consultor previsto; não afirmar execução individual|0|1|
|21|Privacidade e LGPD|Responsável/consultor previsto; não afirmar execução individual|0|0|
|22|Verificação de Realidade|Responsável/consultor previsto; não afirmar execução individual|0|0|
|23|Custo e Limites IA|Responsável/consultor previsto; não afirmar execução individual|0|0|
|24|Revisão Independente|Acionado nesta auditoria|0|0|

## Matriz de investigação

00:DT07,08,11,12,13,14,15,17,22,40;01:DT01,02,04,05,06,24,28,29,30,38;02:DT03,18,23,31,32,33,34,36,37,39;06:DT09,10,16,19,20,21,25,26,27,35. Cada responsável produziu50checks;cada categoria5 propriedades distintas. 08 revisa cobertura/dados;24 não edita entrega auditada.

## Propriedade e dependências

Schema/migrations01;App/navegação02;CI/Docker/compose08;infra10;Android/capacitor09;marca11;prompts eAGENTS decisão humana. Config/harness14,com testes08 conforme regra local;escopos de ondas históricas não transferem propriedade silenciosamente. A decisão00 desta matriz atribui revisão de viteconfig ao08 e coordenação de PWA09→08→02;não autoriza edição durante diagnóstico.

Notificações02 consome schema01 por handoff específico. Segurança15 aconselha01 auth. FinOps23 aconselha07 gateway.22 comprova tenant/persistência nas correções.21 valida minimização/retenção/exclusão. Nenhum agente altera arquivo alheio por compartilhar conhecimento.

## Registro dos encaminhamentos

- .agents/handoffs/onda-dividas-20261014/00-para-14-debt-20261014-ops-001.md → 14;principal;DEBT-20261014-OPS-001;aberto;aguarda autorização.
- .agents/handoffs/onda-dividas-20261014/00-para-08-debt-20261014-ops-002.md → 08;principal;DEBT-20261014-OPS-002;aberto;aguarda autorização.
- .agents/handoffs/onda-dividas-20261014/00-para-08-debt-20261014-ops-003.md → 08;principal;DEBT-20261014-OPS-003;aberto;aguarda autorização.
- .agents/handoffs/onda-dividas-20261014/00-para-10-debt-20261014-ops-004.md → 10;principal;DEBT-20261014-OPS-004;aberto;aguarda autorização.
- .agents/handoffs/onda-dividas-20261014/00-para-00-debt-20261014-gov-001.md → 00;principal;DEBT-20261014-GOV-001;aberto;aguarda autorização.
- .agents/handoffs/onda-dividas-20261014/00-para-00-debt-20261014-gov-002.md → 00;principal;DEBT-20261014-GOV-002;aberto;aguarda autorização.
- .agents/handoffs/onda-dividas-20261014/00-para-01-debt-20261014-sec-001.md → 01;principal;DEBT-20261014-SEC-001;aberto;aguarda autorização.
- .agents/handoffs/onda-dividas-20261014/00-para-01-debt-20261014-code-001.md → 01;principal;DEBT-20261014-CODE-001;aberto;aguarda autorização.
- .agents/handoffs/onda-dividas-20261014/00-para-01-debt-20261014-perf-001.md → 01;principal;DEBT-20261014-PERF-001;aberto;aguarda autorização.
- .agents/handoffs/onda-dividas-20261014/00-para-12-debt-20261014-bill-003.md → 12;principal;DEBT-20261014-BILL-003;aberto;aguarda autorização.
- .agents/handoffs/onda-dividas-20261014/00-para-01-debt-20261014-onb-001.md → 01;principal;DEBT-20261014-ONB-001;aberto;aguarda autorização.
- .agents/handoffs/onda-dividas-20261014/00-para-09-debt-20261014-ux-001.md → 09;principal;DEBT-20261014-UX-001;aberto;aguarda autorização.
- .agents/handoffs/onda-dividas-20261014/00-para-04-debt-20261014-ux-002.md → 04;principal;DEBT-20261014-UX-002;aberto;aguarda autorização.
- .agents/handoffs/onda-dividas-20261014/00-para-04-debt-20261014-ux-003.md → 04;principal;DEBT-20261014-UX-003;aberto;aguarda autorização.
- .agents/handoffs/onda-dividas-20261014/00-para-04-debt-20261014-ux-004.md → 04;principal;DEBT-20261014-UX-004;aberto;aguarda autorização.
- .agents/handoffs/onda-dividas-20261014/00-para-09-debt-20261014-ux-005.md → 09;principal;DEBT-20261014-UX-005;aberto;aguarda autorização.
- .agents/handoffs/onda-dividas-20261014/00-para-09-debt-20261014-ux-006.md → 09;principal;DEBT-20261014-UX-006;aberto;aguarda autorização.
- .agents/handoffs/onda-dividas-20261014/00-para-07-debt-20261014-ux-007.md → 07;principal;DEBT-20261014-UX-007;aberto;aguarda autorização.
- .agents/handoffs/onda-dividas-20261014/00-para-06-debt-20261014-int-001.md → 06;principal;DEBT-20261014-INT-001;aberto;aguarda autorização.
- .agents/handoffs/onda-dividas-20261014/00-para-07-debt-20261014-ai-001.md → 07;principal;DEBT-20261014-AI-001;aberto;aguarda autorização.
- .agents/handoffs/onda-dividas-20261014/00-para-16-debt-20261014-ops-006.md → 16;principal;DEBT-20261014-OPS-006;aberto;aguarda autorização.
- .agents/handoffs/onda-dividas-20261014/00-para-16-debt-20261014-ops-007.md → 16;principal;DEBT-20261014-OPS-007;aberto;aguarda autorização.
- .agents/handoffs/onda-dividas-20261014/00-para-10-debt-20261014-fin-001.md → 10;principal;DEBT-20261014-FIN-001;aberto;aguarda autorização.
- .agents/handoffs/onda-dividas-20261014/00-para-02-debt-20261014-not-001.md → 02;principal;DEBT-20261014-NOT-001;aberto;aguarda autorização.
- .agents/handoffs/onda-dividas-20261014/00-para-01-notificacoes-estado-individual-schema.md → 01;dependência;DEBT-20261014-NOT-001;aberto;aguarda autorização.
- .agents/handoffs/onda-dividas-20261014/00-para-02-pwa-limpeza-troca-identidade.md → 02;dependência;DEBT-20261014-UX-001;aberto;aguarda autorização.
- .agents/handoffs/onda-dividas-20261014/00-para-08-pwa-politica-cache-autenticado.md → 08;dependência;DEBT-20261014-UX-001;aberto;aguarda autorização.
- .agents/handoffs/onda-dividas-20261014/00-para-11-pwa-assets-manifest.md → 11;dependência;DEBT-20261014-UX-006;aberto;aguarda autorização.
- .agents/handoffs/onda-dividas-20261014/00-para-08-politica-publicacao-ghcr.md → 08;dependência;DEBT-20261014-GOV-002;aberto;aguarda autorização.
- .agents/handoffs/onda-dividas-20261014/00-para-18-contrato-paginacao-busca.md → 18;dependência;DEBT-20261014-UX-002;aberto;aguarda autorização.
- .agents/handoffs/onda-dividas-20261014/00-para-14-baseline-isolado.md → 14;pré-requisito;pré-requisito ambiental;aberto;aguarda autorização.

A ausência de prompts próprios21/22/23 é descrita noREADME e não registrada como dívida.19/20 não existem.
