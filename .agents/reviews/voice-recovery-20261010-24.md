# Parecer 24 — recuperação do cliente Voice Studio

Missão/onda: resgate-20261010. Autores: Agente12 (produção), Agente08 (QA), coordenador00 (remediações e testes finais). Auditor: Agente24, independente; não editou a solução auditada. Data: 10/10/2026, America/Sao_Paulo.

## Decisão e escopo exato

**APROVADO exclusivamente o patch de resgate de segurança/estado do cliente desktop, sobre a base publicada abaixo, e a documentação final que declara seus limites.** Não há pendência bloqueadora dos critérios desse escopo: hidratação antes de edição/autosave, confirmação explícita de gravação, isolamento do estado entre contextos, preservação de edições concorrentes, limpeza do simulador e bloqueio por validador indisponível.

**BLOQUEADOS integração backend, ativação de Voice Hub, persistência real, publicação/runtime de produção e uso do editor mobile.** A aprovação não autoriza merge, commit, push, deploy, remoção de backups nem aplicação no checkout principal. Qualquer mudança dos arquivos auditados ou da base de aplicação exige nova revisão e gates pertinentes. A suíte com fixtures demonstra o cliente; não constitui aprovação parcial de backend ou release.

## Identidade e cobertura

Base/HEAD: 33edc320f0e60394ac56994bc6f47e1eb48bdd3d. Branch de auditoria: agente/24-recovery-review-20261010; worktree C:\Github\birthub-recovery-review. Candidato do00: C:\Github\birthub-recovery-integration, integracao/onda-resgate-20261010, alterações não commitadas. Origem histórica cafa57d65bbb8d795e8ced11f4cbb1fbe90bc3c2 foi adaptada, não integrada integralmente.

Manifesto final de21 caminhos: BD0E2300CAB7A19BF0ACB342D89B9D8EB194EBF61AF6BE3C4F6B5E8922A3D757. Os21 hashes foram conferidos independentemente contra os arquivos antes dos checks e imediatamente antes deste parecer. Cobertura:14 arquivos de produção,5 de testes/configuração e2 handoffs; leitura integral dos diffs/arquivos pertinentes, regras raiz, regras locais Voice Hub/testes e prompt24.

O checkout principal avançou por outra missão para8d643da032e3753c8c0e798fd1ff24a10e22ab10, conforme coordenação; origin/main permanece na base publicada. A ausência de interseção textual dos18 caminhos dessa outra missão e os21 deste resgate, ou apply --check, não demonstra compatibilidade funcional. Não aprovamos aplicação sobre esses commits locais.

## Verificações executadas pelo auditor

Scripts conferidos antes da execução. Na revisão final BD0E, em C:\Github\birthub-recovery-review:

- npm run test:unit -- tests/unit/features/voice-hub-studio-persistence.test.ts tests/unit/features/voice-hub-test-simulator.test.tsx tests/unit/features/voice-hub-canvas-recovery.test.tsx tests/unit/features/voice-hub-availability-gate.test.ts → exit0;4 arquivos,39/39;8.16s, início12:25:10.
- node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p tests/tsconfig.voice-recovery.json → exit0.
- git diff --check → exit0; somente avisos de conversão LF/CRLF do checkout Windows.
- SHA256 dos21 caminhos, manifesto, patch e relatórios → correspondência confirmada.

Tentativas anteriores de unitários e tipos terminaram exit1 por out-of-memory sem resultado de suíte/diagnóstico TypeScript. O rerun sequencial acima passou após aliviar concorrência. As tentativas ambientais não são resultados verdes nem regressões atribuídas ao código.

## Gates do coordenador e evidências confrontadas

Resultados recebidos do00, separados dos checks executados pelo24:

| Comando/verificação | Resultado final |
| --- | --- |
| npm run typecheck | exit0 |
| npm run lint | exit0;336 warnings+1info, não ausência de warnings |
| npm run build | exit0; verificação PWA162 entradas; work/final-build-extracted.log lido |
| Gate completo de arquitetura/cobertura/hotspots | exit0; ciclo de tipos corrigido, store1098/limite1100; work/final-architecture-remediation.log lido |
| npm run test:unit, suíte inteira | exit0;482 arquivos;3985pass+1skipped,3986total;1095.07s; sumário work/final-unit-frozen.log lido |
| Suíte inteira na base | recebido exit0;478 arquivos;3946pass+1skipped |
| Integração e E2E | ambos exit1 no pretest por Docker CLI ausente; suítes não iniciadas |
| secret-scan.sh nos21 caminhos | recebido exit0 no fallback oficial de alto sinal; gitleaks/Docker ausentes |
| Patch em check reverso e checks --cached nos índices existentes da base e main local | recebido exit0 com --check; verificação textual nos índices existentes, sem modificações ou aplicação |

Uma execução anterior de arquitetura abortou ambientalmente; outra identificou ciclo real novo e excesso do hotspot, corrigidos antes do manifesto final. A suíte geral anterior foi interrompida pelo proprietário após mudança de runtime e não foi contada. Não se confundem execuções históricas com a revisão final.

## Inspeção visual

Inspeção própria via computer-use em Chrome, http://127.0.0.1:4188/, harness explícito de sessão/API por fixtures e CSS real do build. Não usa autenticação real nem banco. Desktop observado:503 apresenta erro e desmonta controles; fixture válida hidrata dois nós; publicação desabilitada e engine indisponível; Event Bus informa falta de telemetria; modal monta e declara Demo/mock, ausência de LLM real e erro de validação; após edição local, save503 conserva o nó e mostra alterações não confirmadas com retry. Nenhum microfone real/permissão/provedor pago foi acionado. Cleanup de áudio e resposta tardia foram verificados por testes.

A inspeção ocorreu antes da extração equivalente de persistência e remoção de defaults de métricas; a extração foi lida integralmente e revalidada pelos39 testes/tipos. O00 reinspecionou a versão final e registrou outputs/voice-studio-validacao-isolada.png.

Evidência mobile recebida do00:390x844, mensagem503 íntegra; editor ready com document.scrollWidth897 e ReactFlowwidth0 por colunas fixas herdadas. **QA responsivo não aprovado.** Alterar esse layout não integra o escopo deste patch; encaminhar02/09 antes de ativação mobile.

## Achados resolvidos e limites acionáveis

- P1/00-12, resolvido: imports Node-only do logger causavam process undefined e tela vazia quando editor montava. Ambos agora usam clientLogger existente, com formato de chamada compatível. Nenhuma nova dependência.
- P1/00-12, resolvido: payload não renomeia fluxo com nome fixo; snapshot ignora apenas measured/selected/dragging dos nós e selected das arestas, conserva posição/config/conteúdo. Teste diferencia seleção/medição de mudança real de posição; serialização save/edit preserva edição mais recente.
- P1/00-12, resolvido: validador compartilhado permissivo passa a validation-unavailable/isValidfalse. Publicação/simulação do grafo bloqueadas; issues globais chegam aos nós; métricas e eventos inventados substituídos por indisponibilidade, defaults0/15ms de novos nós removidos.
- P2/00-12, resolvido: tipo de ciclo de vida agora definido em libtypes e reexportado pelo store, eliminando ciclo; extração de load/save/validação/snapshot mantém o store na exceção existente sem ampliar waiver.
- P1/07-12-22, pendência de ativação: /api/voice-hub continua authenticateToken+requireTenant+unavailableLegacyModule503. É correto neste resgate. Não montar rota histórica paralela nem retirar503 sem contratos, validador funcional, persistência e provas de autorização/RLS entre organizações.
- P1/08-22, pendência de integração/release: Docker/serviços ausentes impedem integração/E2E; persistência após reload e tenancy de banco real não demonstradas. Teste HTTP usa gate real isolado, não comprova cadeia de autenticação.
- P1/02-09, pendência mobile: largura/canvas impossibilitam editor ready em390px. Corrigir em missão própria e testar interação/teclado/layout antes de anunciar suporte.
- P2/12-07, limite herdado: IA/history/rollback ainda possuem contratos pouco validados e fallback local identificado como offline; UI tem controles históricos sem implementação. Epoch impede mutação de sessão anterior, mas não valida funcionamento real dessas integrações. Revisar antes de ativar backend.

## Auditoria documental e artefatos

Handoffs12/08 lidos; status abertos/aguardando review e evidências históricas não são alegações de release. Hashes antigos QA estão marcados históricos; contagens35/37/38 referem rodadas anteriores,39 é a rodada atual. Relatório00 e output final foram lidos integralmente; atualização de unitários/status confrontada com log e hashes. **APROVADOS como documentação do escopo e limites**, não como prova de trabalho externo não executado.

- C:\Github\birthub-recovery-integration\.agents\runs\resgate-branches-20261010-00.md
- C:\Users\marce\Documents\Codex\2026-10-10\referenced-chatgpt-conversation-this-is-an\outputs\recuperacao-voice-studio.md

Ambos SHA256 AD1A4FD64639CE2D5B49994F2DEB42B561D14C1D4620172D355C10141D07DF72.

Patch de19 arquivos de código/testes: outputs/voice-studio-recuperacao.patch, SHA256 E3C179421D0742FF0EA4C3527838236E4E48E8F331B7E1CC7394F5098E6CACBE, conferido. A aprovação refere-se ao conteúdo desses arquivos no manifesto sobre a base indicada; não autoriza aplicação ou publicação. Nenhum arquivo de ambiente/dependência/lockfile/schema foi introduzido.

## Inventário exato dos arquivos auditados

| Caminho | SHA256 |
| --- | --- |
| .agents/handoffs/onda-resgate-20261010/08-para-00-voice-tests.md | 5F1BE4DA24A9FA59322E4E02B336D196A0F1BDB714D4AEA46620D69FD8D7406D |
| .agents/handoffs/onda-resgate-20261010/12-para-00-voice.md | CB4F497F3F95A8EB1A80B39526153A6DA3B2A3D14F1A627B29454F3866EBF2C3 |
| src/features/voice-hub/components/studio/Canvas.tsx | 234DCB9B2C1CB71C433188851E113C0A7940BD61F7F26EA95694F01C4FE9DB09 |
| src/features/voice-hub/components/studio/nodes/UnifiedNode.tsx | FD781350DB63393257120BD42A78C99F45E125BEAE380E5F5F6F39CABBE1145C |
| src/features/voice-hub/components/studio/panels/BottomDrawer.tsx | 19FDEF467AFB0F362402F1B4998A8769432F2FDF3E959B75702630F693F128C4 |
| src/features/voice-hub/components/studio/panels/TestSimulatorModal.tsx | 0606FBFA6468708B12245C7317702FDF1A4DBBA940468FA9800A37F127997B16 |
| src/features/voice-hub/components/studio/panels/TopBar.tsx | F807B425C35ADCD6F4C1CA33599475F541F4A6D490340CCB4331EAE45DC3854E |
| src/features/voice-hub/components/studio/panels/VersionHistoryPanel.tsx | 4AEB19AF8FA68627FAB610290A481C29A7699AAE4DDB3DD3CDC51E3342AF2139 |
| src/features/voice-hub/lib/studio/types.ts | 882E1AA2F3E0D4EE8AF79D3D104C24E4A3B20C96459350D97DFADF2A712641C1 |
| src/features/voice-hub/pages/Dashboard/VoiceStudio.tsx | EDC8BA9337CAA2CFA3C97FEFA1C9102B5855D9DFA60451C827775B64FC8A5B35 |
| src/features/voice-hub/pages/VoiceStudio.tsx | 01CC2301C6AF165BC896A03FE0DCB7845BC4335EE4E15E1BF9A302BCAE8B7411 |
| src/features/voice-hub/store/studioTypes.ts | 1110481DC39DC092A510A5D931747FD09130165CE17DCAB9C8E93103913A42EB |
| src/features/voice-hub/store/useStudioStore.ts | 7FA63FB04C7F680E9ACB29262B15DA5188AD358F3CE510E0DEF71B408EA06C08 |
| src/features/voice-hub/store/useWorkflowPersistence.ts | A9FD72E2FC5E64D2B9A9F348859113F9FBC6F1104D858BF3E643DEAB1E2FF106 |
| src/lib/studio/ValidationEngine.ts | CEC55B7FEAAE4B8BA408EDFF72CAF09A0FC0E9F75B6858BE7485586E5B58E45A |
| tests/tsconfig.voice-recovery.json | 25A093E2D585D83C6EECB172EEA0C0BD223440E3DF1A1CA1E7C4DBB22B849433 |
| tests/unit/features/voice-hub-availability-gate.test.ts | 72D2C5B13A9CE475D12DFC7143EE9632F2C554015CFBB986EC531AEC8556A8F3 |
| tests/unit/features/voice-hub-canvas-recovery.test.tsx | 813B90078DC9F43E4F822FC203B63D0ADC022E20BCA58CA46AD52A9C80F0A388 |
| tests/unit/features/voice-hub-studio-persistence.test.ts | 1475FED7E2E12799B7A0676887831953412B13CB0A0270C7B59D187C94CC1056 |
| tests/unit/features/voice-hub-test-simulator.test.tsx | F8BD17842F898740157A71AEDBCF531F849FBAB939D385E325ACEA9840299557 |
| src/features/voice-hub/store/workflowPersistence.ts | 3B36AB271D9784F8C053431E7565FEA34CF2266B75B82B8B9A2A288FBC56CC78 |

