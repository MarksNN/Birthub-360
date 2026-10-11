# Recuperação cirúrgica Voice Studio — 2026-10-10

De: 12 — Voz e Telefonia
Para: 00 — Coordenação; 07 — Validação/runtime; 08 — QA; 24 — Auditoria independente
Onda: resgate-20261010
Status: em-andamento (implementado; aguardando auditoria independente)
Prioridade: alto
Bloqueador-ref: backend-voice-hub-indisponivel; validation-unavailable
Sprint destino: mesma onda para review; ativação backend fora deste resgate
Branch: agente/12-voice-recovery-20261010
Worktree: C:\Github\birthub-voice-recovery
Base: 33edc320f0e60394ac56994bc6f47e1eb48bdd3d
Origem de ideias: cafa57d65bbb8d795e8ced11f4cbb1fbe90bc3c2 (nenhum merge/cherry-pick integral)

## Suposições e plano executado

Sessão real do authClient (session.id + user.id + organizationId) identifica o estado local; tenant nunca é enviado como parâmetro de autoridade ao backend. main desativa /api/voice-hub com 503. Não habilitamos backend, telephony, runtime, integrações ou deploy.

1. Hidratar antes de montar os controles → loading/error não monta ReactFlow, toolbar, simulator nem version history; sem foco/atalhos para alterar template ou estado antigo.
2. Confirmar salvamento e serializar alterações → POST confirmado somente HTTP OK + success:true + workflow.id; savedGraph corresponde ao snapshot enviado; edição posterior permanece local e recebe outro debounce, nunca é substituída pela resposta de save.
3. Isolar sessões → cleanup aborta pedidos load/save; epoch invalida respostas antigas, limpa grafo/undo/clipboard/templates/configs de simulação/logs/histórico e guarda respostas async IA/publicação/rollback.
4. Corrigir simulador → declaração cleanup antes do efeito, callback estável, tracks/audio/recognition/speech cancelados; getUserMedia tardio libera tracks; chat tardio não fala após desmontagem; nomes acessíveis nos botões. Mantém demo explícita /api/chat.
5. Expor editor existente → contrato XYFlow tipado localmente, sem any novo ou tsconfig exclusions; erro backend bloqueia o editor. Publicação e simulação de grafo fail-closed por validador real indisponível.

## Descobertas e limites operacionais

main src/lib/studio/ValidationEngine.ts era stub isValid:true, issues:[]; histórico examinado não forneceu implementação real para restaurar. Coordenador autorizou ajuste compartilhado mínimo, retorno isValid:false/validation-unavailable, unknown[] e remoção de healthscore fictício da UI. O backend e a UI não podem publicar com esse validador. Não implementamos engine especulativo.

main montava /api/voice-hub em indisponibilidade; /api/workflow histórico não está montado e pode cair em SPA200. Coordenador orientou migrar os pedidos de workflow para /api/voice-hub/workflow e subpaths, explicitamente fechados com 503. Não alteramos bootstrap/server/router.

Homologação/local: endpoint real permanece indisponível. Testes com mock provam estados e concorrência, não persistência no banco, isolamento RLS real ou ativação de voz em produção.

## Arquivos de produção alterados

- src/features/voice-hub/components/studio/Canvas.tsx
- src/features/voice-hub/components/studio/nodes/UnifiedNode.tsx
- src/features/voice-hub/components/studio/panels/BottomDrawer.tsx
- src/features/voice-hub/components/studio/panels/TestSimulatorModal.tsx
- src/features/voice-hub/components/studio/panels/TopBar.tsx
- src/features/voice-hub/components/studio/panels/VersionHistoryPanel.tsx
- src/features/voice-hub/lib/studio/types.ts
- src/features/voice-hub/pages/VoiceStudio.tsx
- src/features/voice-hub/pages/Dashboard/VoiceStudio.tsx
- src/features/voice-hub/store/studioTypes.ts
- src/features/voice-hub/store/useStudioStore.ts
- src/features/voice-hub/store/useWorkflowPersistence.ts (novo, 51 linhas)
- src/lib/studio/ValidationEngine.ts (autorizado explicitamente pelo 00)

Nenhum tests/package/lockfile/server/tsconfig/prompt alterado pelo 12. Nenhum commit/push/merge/deploy executado.

## Validações medidas

- npm run typecheck rodada 1 → exit 1, 8 erros de contratos revelados pela importação transitiva do editor; simulador ainda antes da correção nessa rodada.
- npm run typecheck rodada 2 → exit 1, 2 erros da declaração global incompleta SpeechRecognitionLike; tipagem local browser corrigida.
- npm run typecheck rodada 3 → exit 0 após correções, sem mudar tsconfig.
- npm run typecheck rodada 4 → exit 0; guarda adicional de JSON e composição version history final.
- npx biome lint 12 arquivos afetados → exit 0; 6 warnings: 4 pré-existentes, 2 relativos ao cleanup/dependência inicialmente; os 2 novos foram corrigidos sem suppression.
- npm run lint → exit 0, 336 warnings + 1 info globais; não declarar ausência de warnings.
- npm run build → exit 0, Vite/esbuild/verify:pwa-precache: 162 entradas. Warnings de annotation Zod, circular chunk, chunks >500k e glob ico sem match. Snapshot anterior à última guarda adicional JSON/movimentação version panel.
- biome format somente arquivos editados → exit 0.
- git diff --check → exit 0.
- Agente 08 relatou 35/35 testes focados, exit 0 em QA isolado; rodada final solicitada após última guarda JSON/composição. Testes não foram escritos pelo 12.

## Handoffs acionáveis

07/00: definir e autorizar restauração de validador real e backend Voice Hub em missão separada; garantir contratos, autorização, RLS, publish gates e runtime compatível antes de expor gravação real/publicação. Este resgate não remove bloqueio de main.
08: cobrir carga503/invalid graph, empty graph, edição durante POST, serialização, failed save retry, sessão null/troca/response stale, cancelamento mic tardio e publish fail-closed. Confirmar defaults/contratos de fontes reais de auth sem inventar tenant.
24: revisar revisão exata/diff e evidências atuais antes de aprovação. Review pendente não equivale a APROVADO.

## Aprendizado reutilizável

TypeScript exclude não impede verificação de um módulo importado transitivamente. Reusar o editor revela os contratos quebrados anteriormente escondidos pelo placeholder; não adicionar excludes/suppressions para encobri-los.

Simular merge sem conflito textual não valida contratos do runtime. Hook/control state precisa distinguir snapshot enviado do grafo editado durante o request; confirmação antiga jamais autoriza substituir nodes/edges atuais.
