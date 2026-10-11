# Parecer 24 — formatação para CI do Voice Studio

Data: 10/10/2026. Autor da correção: coordenador00; auditor independente:24.

**APROVADO somente commit e push da correção de formatação na branch do PR draft688. Merge segue BLOQUEADO aguardando CI do novo HEAD exato.** Nenhuma aprovação de produção, ativação backend ou uso mobile.

Repositório canônico MaarkssN/Birthub-360; base publicada33edc320f0e60394ac56994bc6f47e1eb48bdd3d; HEAD anterior6c8d3817f61b996d65299ce6b1b07ba2105c8540. Auditoria da correção não commitada em C:\Github\birthub-recovery-integration.

Diff:2 arquivos,8 linhas adicionadas e7 removidas, somente quebra da declaração SpeechRecognition, export type multilinha e remoção de5 linhas em branco para conservar hotspot. Dashboard somente normalizado paraLF, sem diffGit. Não alterados lógica, APIs, permissões ou workflows.

| Arquivo | SHA256 do arquivo corrigido |
| --- | --- |
| src/features/voice-hub/components/studio/panels/TestSimulatorModal.tsx | F1CA82BC901EFBE8F82DC0F55911DDE3ABAA17275897A65EA90F2A8B06960D12 |
| src/features/voice-hub/store/useStudioStore.ts | 6B6CDA24487A9CA68466B1F5E48DE29115E12E98F2E43B8A6CD01E9F72A078E5 |
| src/features/voice-hub/pages/Dashboard/VoiceStudio.tsx | 2F2A217CA0C9E98A6E87DEB73EDC487073D258049EFC3B950E6DEE0CE7998F52 |

Verificações independentes: leitura integral do diff; TypeScript transpileModule com targetES2022/moduleESNext/jsxReactJSX/removeComments reproduziu emissão idêntica nos3 arquivos entre HEAD6c8 e workingtree (exit0); git diff --check exit0; npx biome check --formatter-enabled=true --linter-enabled=false --assist-enabled=false nos3 arquivos exit0, sem fixes. Get-Content conta1097 linhas do store, conservando limite1100. Testes de runtime anteriores39/39 e tipos passaram; não foram repetidos para alteração cuja emissão é idêntica. CI novo é necessário antes de merge.

A aprovação original do resgate continua válida para comportamento desktop; os hashes acima substituem os3 arquivos de workingtree normalizados. SHA do novo commit deverá ser identificado no parecer operacional.

Publicação GHCR após CImain é build/push de artefato, sem comando de ativação de serviço. O bloqueio inicial desse artefato foi interpretação cautelosa do auditor, não proibição explícita: reavaliado com autorização humana de commit/PR/merge/push e leitura dos workflows. Não constitui autorização AWSruntime. API GitHub confirmou ausência de AWS_ROLE_TO_ASSUME nos secrets do repositório, ownerUser e jobAWS sem environment; revalidar antes do merge. CI pendente/falha não é aprovação, proteção ausente não autoriza bypass. Integração backend/produção/mobile conservam os bloqueios do parecer anterior.
