# Recuperação seletiva — Voice Studio

Coordenação00; implementação12 com remediações00; testes08/00; revisão independente24. Autorização humana: “pode comecar”. Este é o primeiro patch de recuperação; não representa integração de todas as branches auditadas.

## Base e isolamento

Base publicada: `33edc320f0e60394ac56994bc6f47e1eb48bdd3d`, confirmada em origin/main às12:28 de10/10/2026. Origem analisada: `cafa57d65bbb8d795e8ced11f4cbb1fbe90bc3c2` da branch `agente/12-voice-studio-safe-persistence-20261009`; ideias adaptadas, sem merge/cherry-pick integral.

Candidato: `C:\Github\birthub-recovery-integration`, branch `integracao/onda-resgate-20261010`. Alterações não commitadas. Nenhum push, merge, deploy, exclusão de backup ou mudança de governança.

O checkout principal avançou por outra missão para `8d643da032e3753c8c0e798fd1ff24a10e22ab10`; status limpo às12:28. Seus18 caminhos diferentes da base publicada não se sobrepõem aos21 caminhos do manifesto deste resgate. Preservados integralmente. Compatibilidade executada neste patch é com a base publicada; aplicar sobre esses commits locais exigirá nova validação.

## Decisões por arquivo ou mudança

| Arquivo / grupo | Decisão | Razão e efeito |
| --- | --- | --- |
| `pages/VoiceStudio.tsx`, `pages/Dashboard/VoiceStudio.tsx` | Adaptar | Recuperar editor existente sem reverter AgentRegistry/Telephony recentes; backend indisponível é estado explícito. |
| `components/studio/Canvas.tsx` | Adaptar | Montar controles apenas após carga válida da sessão; bloquear atalhos/edição enquanto loading/error; tratar erro global de validação nos nós. |
| `store/useStudioStore.ts` | Adaptar | Limpar estado e histórico ao trocar contexto; invalidar respostas antigas de IA/publicação/rollback; serializar gravação; impedir sucesso fictício. Novos nós não ganham latência inventada. |
| `store/workflowPersistence.ts` (novo) | Adaptar | Validar resposta e grafo, conservar snapshot enviado e proteger edições mais recentes. POST preserva nome existente e ignora somente seleção, medição e dragging transitórios. Extração mantém store dentro da exceção1100 linhas. |
| `store/useWorkflowPersistence.ts` (novo) | Adaptar | Hidratar antes de autosave, debouncing3s e retries explícitos; abortar requests do contexto anterior. |
| `panels/TestSimulatorModal.tsx` | Adaptar | Corrigir inicialização/cleanup; liberar áudio, tracks e reconhecimento, inclusive permissão tardia. Simulação permanece demonstrativa. Logger apropriado para navegador. |
| `panels/TopBar.tsx` | Descartar indicadores fictícios; preservar controles | Remover horário fixo de autosave e healthscore sem medição. Publicação bloqueada sem validador. |
| `panels/BottomDrawer.tsx` | Descartar métricas/eventos fictícios; adaptar estados | Sem telefones/tokens/latência/score inventados apresentados como eventos reais. Informar indisponibilidade de telemetria/analytics e do engine. |
| `panels/VersionHistoryPanel.tsx` | Adaptar | Endpoints canônicos de Voice Hub; painel montado somente com contexto carregado. Não ativa backend legado. |
| `nodes/UnifiedNode.tsx`, `lib/studio/types.ts`, `store/studioTypes.ts` | Adaptar | Corrigir contratos XYFlow transitivos sem any/suppressions/exclusões novas. Tipo de ciclo de vida tem origem única, eliminando ciclo arquitetural. |
| `src/lib/studio/ValidationEngine.ts` | Descartar aprovação permissiva do stub | Fail-closed: validation-unavailable. Não inventar validador funcional nem permitir publicar grafo aceito automaticamente. |
| Quatro testes em `tests/unit/features/voice-hub-*` + `tests/tsconfig.voice-recovery.json` | Preservar/adaptar |39 casos de sucesso e falha: HTTP inválido, hidratação, sessão, edição concorrente, payload, recursos do simulador e middleware real de indisponibilidade. |

## Evidências

| Verificação | Base | Candidato final |
| --- | --- | --- |
| Typecheck global |0 |0 |
| Lint global |0;340 warnings+1info |0;336 warnings+1info |
| Build + PWA precache |0 |0;162 entradas verificadas |
| Arquitetura/cobertura/hotspots | Não executado separadamente na base |0 após corrigir ciclo novo; store1098/1100 linhas |
| Testes dirigidos |8/8 históricos falhavam antes da correção |39/39;0 pelo coordenador e0 pelo auditor independente |
| Typecheck dirigido | Não aplicável antes dos novos testes |0 pelo coordenador e auditor |
| Unitários completos |478 arquivos;3946pass+1skip;0 |482 arquivos;3985pass+1skip;0;1095.07s |
| Integração |1 no pretest; suíte não iniciou |1 no pretest; Docker ausente; suíte não iniciou |
| E2E |1 no pretest; suíte não iniciou |1 no pretest; Docker ausente; suíte não iniciou |
| Secret scan dos21 caminhos | Não repetido globalmente |0 no fallback oficial de padrões de alto sinal; gitleaks/Docker indisponíveis |
| Patch reverso e aplicação em modo check | Não aplicável |0 no reverso e0 sobre índices da base e main local; nenhuma aplicação de arquivos |

Tentativas anteriores de revisão independente falharam por memória antes de executar testes; após reduzir concorrência,39 testes e tipos passaram. Uma execução de arquitetura abortou ambientalmente; outra detectou ciclo real, corrigido e validado com gate completo0. A primeira suíte geral foi interrompida pelo coordenador após alterações adicionais, portanto não conta como resultado final. Logs da missão ficam em `work` desta conversa.

## Inspeção visual e limites

Harness local4188 importa componentes reais e CSS do build, com sessão/API controladas por fixtures e banner explícito. Não comprova autenticação ou persistência real. Desktop:503 bloqueia editor; fluxo de fixture carrega; Publish fica desabilitado; modal identifica demonstração; falha de save permanece observável e conserva edições; Event Bus informa ausência de eventos reais.

Em390x844 a mensagem503 permanece acessível. O editor ready herdado tem largura897px e canvas sem espaço, portanto uso mobile NÃO aprovado; encaminhar02/09. Nenhum microfone real foi autorizado/acionado e nenhum provedor pago foi chamado.

`src/bootstrap/routes.ts` mantém authenticateToken + requireTenant + unavailableLegacyModule em `/api/voice-hub`. Os controllers antigos continuam desativados. Não remover503 nem montar `/api/workflow` como atalho. Isolamento no banco, persistência após reload, publicação real e runtime não estão demonstrados.

## Próximas condições antes de ativar

1. Missão07/12/22 para contratos, validador funcional e persistência real de Voice Hub com autenticação/RLS e testes cruzados entre organizações.
2. Ambiente com Postgres, Redis e Meilisearch reais para integração/E2E; não anunciar skips como aprovação.
3. Missão02/09 para layout utilizável em telas menores.
4. Nova revisão24 da versão exata e autorização específica de merge/deploy. Este patch não fornece essa autorização.

## Identidade da revisão

Manifesto de21 caminhos: SHA256 `BD0E2300CAB7A19BF0ACB342D89B9D8EB194EBF61AF6BE3C4F6B5E8922A3D757`.
Patch de19 arquivos de código/testes: SHA256 `E3C179421D0742FF0EA4C3527838236E4E48E8F331B7E1CC7394F5098E6CACBE`.
As duas notas de handoff completam o manifesto e registram evidências históricas, sem atribuir seus hashes antigos ao código atual. Nenhum arquivo de ambiente, dependência, lockfile ou schema alterado.

Status: gates do cliente concluídos. Decisão independente registrada em parecer separado, exigido antes de integração. Integração backend, produção e uso mobile permanecem bloqueados.