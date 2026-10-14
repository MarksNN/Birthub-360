# Plano de saneamento — autorização de execução pendente

Base9373fb224a8aba30a39f7d10d1a2be639c35af78;somente proposta. HTML substituído por handoffs;nenhuma correção nesta missão.

## Dependências e coordenação

Pré-requisito14 prepara ambiente isolado,08 controla testes e gates. SEC01 com15/21;PWA09 coordena08vite e02sessão,22 comprovaA/B;notificações02 exige contrato01/18 antes migration01 e consumidor02;busca04 exige contrato18;stream07 consume política23;alerts10 requer emissão07/23;GOV00 exige decisão humana e execução08. 01↔01A,06↔06A e proprietários de filas em slots exclusivos. Sem especialistas executarem mesmo workingtree.

PrioridadeP1 dentro de qualquer onda pode antecipar P2/P3. Os intervalos de datasRPO/RTO e custos reais não foram quantificados neste ambiente. EstimativasP/M/Baixo são relativas,não compromisso de entrega. Não executar scripts de migração/backup/restore comenvreal ou dados não descartáveis.

## Onda 00 — Preparação e baseline

Objetivo:sanar causas dos achados selecionados preservando contratos.

Achados:DEBT-20261014-OPS-002, DEBT-20261014-OPS-003. Donos:08. Arquivos e módulos:vide handoffs dos IDs;propriedade de dependências explícita.

Pré-requisitos:

- Autorização específica para saneamento; contexto Git preservado

Entrada:Missão autorizada;fonte/hashes revalidados;propriedade e ambiente isolado publicados. Ordem:Sequência sugerida após autorização;P1 prevalece,não precisa aguardar P2/P3 da onda anterior.

Saída:Achados selecionados reproduzidos,corrigidos,testados e parecer24 APROVADO para revisão exata;nenhum status fechado sem evidência

Testes:

- Typecheck,lint,build e testes específicos do handoff
- Gates integrações/tenancy apenas em fixtures e serviços descartáveis
- Varredura de segredos no diff

Evidências:

- Comando+exitcode
- Diff mínimo
- Caminho feliz/falha
- Backend/reload/tenant quando aplicável
- Parecer24 por SHA/hashes

Riscos:

- Regressão nos contratos compartilhados
- Configuração real não verificada
- Não transformar mocks em validação de produto

Rollback:Preservar release/artefato anterior;planejar reversão de app compatível schema.Para dados,migration/restore somente01/10 com backup validado;nunca revert destrutivo presumido

## Onda 01 — Segurança e isolamento

Objetivo:sanar causas dos achados selecionados preservando contratos.

Achados:DEBT-20261014-SEC-001, DEBT-20261014-UX-001. Donos:01, 09. Arquivos e módulos:vide handoffs dos IDs;propriedade de dependências explícita.

Pré-requisitos:

- Baseline isolado do14
- Parecer24 da etapa precedente
- PWA cache exige coordenação09→08(vite)→02(sessão),testeA/B por22

Entrada:Missão autorizada;fonte/hashes revalidados;propriedade e ambiente isolado publicados. Ordem:Sequência sugerida após autorização;P1 prevalece,não precisa aguardar P2/P3 da onda anterior.

Saída:Achados selecionados reproduzidos,corrigidos,testados e parecer24 APROVADO para revisão exata;nenhum status fechado sem evidência

Testes:

- Typecheck,lint,build e testes específicos do handoff
- Gates integrações/tenancy apenas em fixtures e serviços descartáveis
- Varredura de segredos no diff

Evidências:

- Comando+exitcode
- Diff mínimo
- Caminho feliz/falha
- Backend/reload/tenant quando aplicável
- Parecer24 por SHA/hashes

Riscos:

- Regressão nos contratos compartilhados
- Configuração real não verificada
- Não transformar mocks em validação de produto

Rollback:Preservar release/artefato anterior;planejar reversão de app compatível schema.Para dados,migration/restore somente01/10 com backup validado;nunca revert destrutivo presumido

## Onda 02 — Integridade e recuperação

Objetivo:sanar causas dos achados selecionados preservando contratos.

Achados:DEBT-20261014-OPS-004. Donos:10. Arquivos e módulos:vide handoffs dos IDs;propriedade de dependências explícita.

Pré-requisitos:

- Baseline isolado do14
- Parecer24 da etapa precedente

Entrada:Missão autorizada;fonte/hashes revalidados;propriedade e ambiente isolado publicados. Ordem:Sequência sugerida após autorização;P1 prevalece,não precisa aguardar P2/P3 da onda anterior.

Saída:Achados selecionados reproduzidos,corrigidos,testados e parecer24 APROVADO para revisão exata;nenhum status fechado sem evidência

Testes:

- Typecheck,lint,build e testes específicos do handoff
- Gates integrações/tenancy apenas em fixtures e serviços descartáveis
- Varredura de segredos no diff

Evidências:

- Comando+exitcode
- Diff mínimo
- Caminho feliz/falha
- Backend/reload/tenant quando aplicável
- Parecer24 por SHA/hashes

Riscos:

- Regressão nos contratos compartilhados
- Configuração real não verificada
- Não transformar mocks em validação de produto

Rollback:Preservar release/artefato anterior;planejar reversão de app compatível schema.Para dados,migration/restore somente01/10 com backup validado;nunca revert destrutivo presumido

## Onda 03 — Backend e contratos

Objetivo:sanar causas dos achados selecionados preservando contratos.

Achados:DEBT-20261014-CODE-001, DEBT-20261014-BILL-003, DEBT-20261014-ONB-001, DEBT-20261014-UX-002, DEBT-20261014-UX-003, DEBT-20261014-UX-004, DEBT-20261014-OPS-006, DEBT-20261014-OPS-007. Donos:01, 12, 04, 16. Arquivos e módulos:vide handoffs dos IDs;propriedade de dependências explícita.

Pré-requisitos:

- Baseline isolado do14
- Parecer24 da etapa precedente

Entrada:Missão autorizada;fonte/hashes revalidados;propriedade e ambiente isolado publicados. Ordem:Sequência sugerida após autorização;P1 prevalece,não precisa aguardar P2/P3 da onda anterior.

Saída:Achados selecionados reproduzidos,corrigidos,testados e parecer24 APROVADO para revisão exata;nenhum status fechado sem evidência

Testes:

- Typecheck,lint,build e testes específicos do handoff
- Gates integrações/tenancy apenas em fixtures e serviços descartáveis
- Varredura de segredos no diff

Evidências:

- Comando+exitcode
- Diff mínimo
- Caminho feliz/falha
- Backend/reload/tenant quando aplicável
- Parecer24 por SHA/hashes

Riscos:

- Regressão nos contratos compartilhados
- Configuração real não verificada
- Não transformar mocks em validação de produto

Rollback:Preservar release/artefato anterior;planejar reversão de app compatível schema.Para dados,migration/restore somente01/10 com backup validado;nunca revert destrutivo presumido

## Onda 04 — Mobile/PWA e leitura notificações

Objetivo:sanar causas dos achados selecionados preservando contratos.

Achados:DEBT-20261014-UX-005, DEBT-20261014-UX-006, DEBT-20261014-NOT-001. Donos:09, 02. Arquivos e módulos:vide handoffs dos IDs;propriedade de dependências explícita.

Pré-requisitos:

- Baseline isolado do14
- Parecer24 da etapa precedente
- Contrato e migration01 de notificações antes consumidor02

Entrada:Missão autorizada;fonte/hashes revalidados;propriedade e ambiente isolado publicados. Ordem:Sequência sugerida após autorização;P1 prevalece,não precisa aguardar P2/P3 da onda anterior.

Saída:Achados selecionados reproduzidos,corrigidos,testados e parecer24 APROVADO para revisão exata;nenhum status fechado sem evidência

Testes:

- Typecheck,lint,build e testes específicos do handoff
- Gates integrações/tenancy apenas em fixtures e serviços descartáveis
- Varredura de segredos no diff

Evidências:

- Comando+exitcode
- Diff mínimo
- Caminho feliz/falha
- Backend/reload/tenant quando aplicável
- Parecer24 por SHA/hashes

Riscos:

- Regressão nos contratos compartilhados
- Configuração real não verificada
- Não transformar mocks em validação de produto

Rollback:Preservar release/artefato anterior;planejar reversão de app compatível schema.Para dados,migration/restore somente01/10 com backup validado;nunca revert destrutivo presumido

## Onda 05 — Integrações e busca de conhecimento

Objetivo:sanar causas dos achados selecionados preservando contratos.

Achados:DEBT-20261014-UX-007, DEBT-20261014-INT-001. Donos:07, 06. Arquivos e módulos:vide handoffs dos IDs;propriedade de dependências explícita.

Pré-requisitos:

- Baseline isolado do14
- Parecer24 da etapa precedente

Entrada:Missão autorizada;fonte/hashes revalidados;propriedade e ambiente isolado publicados. Ordem:Sequência sugerida após autorização;P1 prevalece,não precisa aguardar P2/P3 da onda anterior.

Saída:Achados selecionados reproduzidos,corrigidos,testados e parecer24 APROVADO para revisão exata;nenhum status fechado sem evidência

Testes:

- Typecheck,lint,build e testes específicos do handoff
- Gates integrações/tenancy apenas em fixtures e serviços descartáveis
- Varredura de segredos no diff

Evidências:

- Comando+exitcode
- Diff mínimo
- Caminho feliz/falha
- Backend/reload/tenant quando aplicável
- Parecer24 por SHA/hashes

Riscos:

- Regressão nos contratos compartilhados
- Configuração real não verificada
- Não transformar mocks em validação de produto

Rollback:Preservar release/artefato anterior;planejar reversão de app compatível schema.Para dados,migration/restore somente01/10 com backup validado;nunca revert destrutivo presumido

## Onda 06 — IA e quotas

Objetivo:sanar causas dos achados selecionados preservando contratos.

Achados:DEBT-20261014-AI-001. Donos:07. Arquivos e módulos:vide handoffs dos IDs;propriedade de dependências explícita.

Pré-requisitos:

- Baseline isolado do14
- Parecer24 da etapa precedente
- 07 consome política e custos23 sem consultar providers reais durante ensaios

Entrada:Missão autorizada;fonte/hashes revalidados;propriedade e ambiente isolado publicados. Ordem:Sequência sugerida após autorização;P1 prevalece,não precisa aguardar P2/P3 da onda anterior.

Saída:Achados selecionados reproduzidos,corrigidos,testados e parecer24 APROVADO para revisão exata;nenhum status fechado sem evidência

Testes:

- Typecheck,lint,build e testes específicos do handoff
- Gates integrações/tenancy apenas em fixtures e serviços descartáveis
- Varredura de segredos no diff

Evidências:

- Comando+exitcode
- Diff mínimo
- Caminho feliz/falha
- Backend/reload/tenant quando aplicável
- Parecer24 por SHA/hashes

Riscos:

- Regressão nos contratos compartilhados
- Configuração real não verificada
- Não transformar mocks em validação de produto

Rollback:Preservar release/artefato anterior;planejar reversão de app compatível schema.Para dados,migration/restore somente01/10 com backup validado;nunca revert destrutivo presumido

## Onda 07 — Performance e escala

Objetivo:sanar causas dos achados selecionados preservando contratos.

Achados:DEBT-20261014-PERF-001. Donos:01. Arquivos e módulos:vide handoffs dos IDs;propriedade de dependências explícita.

Pré-requisitos:

- Baseline isolado do14
- Parecer24 da etapa precedente

Entrada:Missão autorizada;fonte/hashes revalidados;propriedade e ambiente isolado publicados. Ordem:Sequência sugerida após autorização;P1 prevalece,não precisa aguardar P2/P3 da onda anterior.

Saída:Achados selecionados reproduzidos,corrigidos,testados e parecer24 APROVADO para revisão exata;nenhum status fechado sem evidência

Testes:

- Typecheck,lint,build e testes específicos do handoff
- Gates integrações/tenancy apenas em fixtures e serviços descartáveis
- Varredura de segredos no diff

Evidências:

- Comando+exitcode
- Diff mínimo
- Caminho feliz/falha
- Backend/reload/tenant quando aplicável
- Parecer24 por SHA/hashes

Riscos:

- Regressão nos contratos compartilhados
- Configuração real não verificada
- Não transformar mocks em validação de produto

Rollback:Preservar release/artefato anterior;planejar reversão de app compatível schema.Para dados,migration/restore somente01/10 com backup validado;nunca revert destrutivo presumido

## Onda 08 — QA e observabilidade

Objetivo:sanar causas dos achados selecionados preservando contratos.

Achados:DEBT-20261014-OPS-001, DEBT-20261014-FIN-001. Donos:14, 10. Arquivos e módulos:vide handoffs dos IDs;propriedade de dependências explícita.

Pré-requisitos:

- Baseline isolado do14
- Parecer24 da etapa precedente

Entrada:Missão autorizada;fonte/hashes revalidados;propriedade e ambiente isolado publicados. Ordem:Sequência sugerida após autorização;P1 prevalece,não precisa aguardar P2/P3 da onda anterior.

Saída:Achados selecionados reproduzidos,corrigidos,testados e parecer24 APROVADO para revisão exata;nenhum status fechado sem evidência

Testes:

- Typecheck,lint,build e testes específicos do handoff
- Gates integrações/tenancy apenas em fixtures e serviços descartáveis
- Varredura de segredos no diff

Evidências:

- Comando+exitcode
- Diff mínimo
- Caminho feliz/falha
- Backend/reload/tenant quando aplicável
- Parecer24 por SHA/hashes

Riscos:

- Regressão nos contratos compartilhados
- Configuração real não verificada
- Não transformar mocks em validação de produto

Rollback:Preservar release/artefato anterior;planejar reversão de app compatível schema.Para dados,migration/restore somente01/10 com backup validado;nunca revert destrutivo presumido

## Onda 09 — Governança e release

Objetivo:sanar causas dos achados selecionados preservando contratos.

Achados:DEBT-20261014-GOV-001, DEBT-20261014-GOV-002. Donos:00. Arquivos e módulos:vide handoffs dos IDs;propriedade de dependências explícita.

Pré-requisitos:

- Baseline isolado do14
- Parecer24 da etapa precedente
- Decisão humana sobre prompt ausente e publicaçãoGHCR

Entrada:Missão autorizada;fonte/hashes revalidados;propriedade e ambiente isolado publicados. Ordem:Sequência sugerida após autorização;P1 prevalece,não precisa aguardar P2/P3 da onda anterior.

Saída:Achados selecionados reproduzidos,corrigidos,testados e parecer24 APROVADO para revisão exata;nenhum status fechado sem evidência

Testes:

- Typecheck,lint,build e testes específicos do handoff
- Gates integrações/tenancy apenas em fixtures e serviços descartáveis
- Varredura de segredos no diff

Evidências:

- Comando+exitcode
- Diff mínimo
- Caminho feliz/falha
- Backend/reload/tenant quando aplicável
- Parecer24 por SHA/hashes

Riscos:

- Regressão nos contratos compartilhados
- Configuração real não verificada
- Não transformar mocks em validação de produto

Rollback:Preservar release/artefato anterior;planejar reversão de app compatível schema.Para dados,migration/restore somente01/10 com backup validado;nunca revert destrutivo presumido

## Backlog executável

|ID|P|Onda|Dono|Esforço relativo|Handoff|
|---|---|---|---|---|---|
|DEBT-20261014-SEC-001|P1|01|01|Baixo|.agents/handoffs/onda-dividas-20261014/00-para-01-debt-20261014-sec-001.md|
|DEBT-20261014-UX-001|P1|01|09|M|.agents/handoffs/onda-dividas-20261014/00-para-09-debt-20261014-ux-001.md|
|DEBT-20261014-OPS-004|P1|02|10|M (1–3 dias de engenharia com ambiente disponível)|.agents/handoffs/onda-dividas-20261014/00-para-10-debt-20261014-ops-004.md|
|DEBT-20261014-UX-003|P1|03|04|M|.agents/handoffs/onda-dividas-20261014/00-para-04-debt-20261014-ux-003.md|
|DEBT-20261014-OPS-006|P1|03|16|P|.agents/handoffs/onda-dividas-20261014/00-para-16-debt-20261014-ops-006.md|
|DEBT-20261014-OPS-007|P1|03|16|P|.agents/handoffs/onda-dividas-20261014/00-para-16-debt-20261014-ops-007.md|
|DEBT-20261014-OPS-001|P1|08|14|M (1–3 dias de engenharia com ambiente disponível)|.agents/handoffs/onda-dividas-20261014/00-para-14-debt-20261014-ops-001.md|
|DEBT-20261014-OPS-002|P2|00|08|M (1–3 dias de engenharia com ambiente disponível)|.agents/handoffs/onda-dividas-20261014/00-para-08-debt-20261014-ops-002.md|
|DEBT-20261014-OPS-003|P2|00|08|M (1–3 dias de engenharia com ambiente disponível)|.agents/handoffs/onda-dividas-20261014/00-para-08-debt-20261014-ops-003.md|
|DEBT-20261014-ONB-001|P2|03|01|Médio|.agents/handoffs/onda-dividas-20261014/00-para-01-debt-20261014-onb-001.md|
|DEBT-20261014-UX-002|P2|03|04|M|.agents/handoffs/onda-dividas-20261014/00-para-04-debt-20261014-ux-002.md|
|DEBT-20261014-UX-004|P2|03|04|M|.agents/handoffs/onda-dividas-20261014/00-para-04-debt-20261014-ux-004.md|
|DEBT-20261014-UX-005|P2|04|09|M|.agents/handoffs/onda-dividas-20261014/00-para-09-debt-20261014-ux-005.md|
|DEBT-20261014-UX-006|P2|04|09|M|.agents/handoffs/onda-dividas-20261014/00-para-09-debt-20261014-ux-006.md|
|DEBT-20261014-NOT-001|P2|04|02|M|.agents/handoffs/onda-dividas-20261014/00-para-02-debt-20261014-not-001.md|
|DEBT-20261014-UX-007|P2|05|07|M|.agents/handoffs/onda-dividas-20261014/00-para-07-debt-20261014-ux-007.md|
|DEBT-20261014-INT-001|P2|05|06|P|.agents/handoffs/onda-dividas-20261014/00-para-06-debt-20261014-int-001.md|
|DEBT-20261014-AI-001|P2|06|07|P|.agents/handoffs/onda-dividas-20261014/00-para-07-debt-20261014-ai-001.md|
|DEBT-20261014-PERF-001|P2|07|01|Médio|.agents/handoffs/onda-dividas-20261014/00-para-01-debt-20261014-perf-001.md|
|DEBT-20261014-FIN-001|P2|08|10|P|.agents/handoffs/onda-dividas-20261014/00-para-10-debt-20261014-fin-001.md|
|DEBT-20261014-GOV-002|P2|09|00|M (1–3 dias de engenharia com ambiente disponível)|.agents/handoffs/onda-dividas-20261014/00-para-00-debt-20261014-gov-002.md|
|DEBT-20261014-CODE-001|P3|03|01|Baixo|.agents/handoffs/onda-dividas-20261014/00-para-01-debt-20261014-code-001.md|
|DEBT-20261014-BILL-003|P3|03|12|Baixo|.agents/handoffs/onda-dividas-20261014/00-para-12-debt-20261014-bill-003.md|
|DEBT-20261014-GOV-001|P3|09|00|M (1–3 dias de engenharia com ambiente disponível)|.agents/handoffs/onda-dividas-20261014/00-para-00-debt-20261014-gov-001.md|

## Gates de integração e release

Conferir scripts existentes antes execução. Typecheck,lint,architecture,unit,integration,E2E,build após cada2–3 merges autorizados;verifyAI/integrations só com isolamento de transportes e custos. Release adiciona dependency audit e secrets scan. Parecer24 paraSHA/hashes exatos antecede integração e08A. Nenhuma aprovação deste documento autorizaGit/deploy.
