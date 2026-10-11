De: Agente 08 — QA e Release
Para: Agente 00 — Coordenador
Onda: resgate-20261010
Status: aberto
Prioridade: alto
Bloqueador-ref: persistência real e isolamento backend não restabelecidos
Sprint destino: revisão independente 24 e integração local autorizada

## Missão e base

Worktree: C:\Github\birthub-recovery-qa
Branch: agente/08-recovery-qa-20261010
Base: main 33edc320f0e60394ac56994bc6f47e1eb48bdd3d.
Autorização: resgatar testes do Voice Studio sem commit, merge, push ou deploy.
AGENTS.md, tests/AGENTS.md e prompt 08 lidos. EXECUCAO-ONDAS.md e .agents/runs/baseline.md não existem nesta base; instruções históricas da Onda 3 foram subordinadas à missão atual do 00.

## Suposições e critérios

HTTP fixtures demonstram comportamento do cliente, não persistência em banco nem autorização de produção. Modo Demo deve continuar explícito e sem chamadas pagas. Editor só pode montar depois de hidratação confirmada da sessão/organização. Falhas 503/HTTP/JSON bloqueiam autosave. Respostas de contexto anterior não podem restaurar dados. Backend canônico continua indisponível; não habilitá-lo é parte do escopo.
Plano executado: reproduzir testes históricos na main → acrescentar casos de segurança/concorrência → executar no snapshot do 12 → checar tipos e formatação → encaminhar revisão independente.

## Arquivos de propriedade 08

- tests/unit/features/voice-hub-studio-persistence.test.ts: GET/POSТ confirmados, HTTP 401/403/503, JSON inválido/HTML/network, graph shape/referências, abort, hidratação antes autosave, retry, edge-only edit, serialização save/edit e reset logout/tenant.
- tests/unit/features/voice-hub-test-simulator.test.tsx: demo disclosure, montagem sem TDZ, cleanup speech/microfone/AudioContext, permissão tardia após unmount e erro de comunicação.
- tests/unit/features/voice-hub-canvas-recovery.test.tsx: controles desmontados durante load/error/auth ausente, erro503/retry, logout e Enter/Space, publicar bloqueado.
- tests/unit/features/voice-hub-availability-gate.test.ts: middleware REAL indisponível via HTTP Express isolado, GET/save/publish retornam503. Não inclui autenticação/DB.
- tests/tsconfig.voice-recovery.json: verificação reproduzível dos testes e importações do resgate; inclui declarações Vite. Não altera tsconfig/package raiz.

Produção foi copiada do worktree estável do Agente12 somente para executar QA; Agente08 NÃO editou lógica de produção. Não incluir esses arquivos como autoria08. Coordenador deve integrar produção diretamente da origem12.

## Evidências e exit codes

1. Histórico cafa57d65, dois arquivos recuperados na main sem mudanças de produção: npm run test:unit -- tests/unit/features/voice-hub-studio-persistence.test.ts tests/unit/features/voice-hub-test-simulator.test.tsx → exit1, 8/8 falhas. Sete retornos load/save undefined e ReferenceError stopAudioWave antes inicialização. Baseline pré-existente.
2. Primeira rodada ampliada no snapshot12: 34/35 pass, exit1. Única falha: teste08 procurava rótulo Publicar, UI usa Publish. Ajustado seletor bilíngue; nenhuma mudança produção.
3. Rodada após correção: 35/35, quatro arquivos, exit0; 10.02s.
4. Repetição justificada por nova cópia final12 (VersionHistoryPanel apenas dentro ready e ajustes de tipos): 35/35, quatro arquivos, exit0; 8.63s.
5. Gate HTTP isolado independente: 1/1, exit0, 3.22s.
6. Primeiro tsc direcionado: exit1, duas declarações ambiente omitidas pela seleção específica e um cast Response do teste. Incluído src/vite-env.d.ts e corrigido cast; nenhum erro produção exigiu edição08.
7. node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p tests/tsconfig.voice-recovery.json → exit0.
8. Prettier check quatro arquivos testes → inicialmente exit1 por formatação após seletor; corrigido. Recheck exit0. git diff --check → exit0.

Comando reproduzível unitário:
```
npm run test:unit -- tests/unit/features/voice-hub-studio-persistence.test.ts tests/unit/features/voice-hub-test-simulator.test.tsx tests/unit/features/voice-hub-canvas-recovery.test.tsx tests/unit/features/voice-hub-availability-gate.test.ts
node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p tests/tsconfig.voice-recovery.json
```

## Infraestrutura e limites

Docker não disponível no PATH. Nenhuma escuta local 3000/3024/5432/6379 na descoberta inicial; DATABASE_URL e REDIS_URL não presentes no ambiente. Não foram criadas contas, usadas credenciais pessoais, nem acionados serviços externos pagos. Persistência real após reload, acesso cruzado de organizações contra DB real e integração backend completa: BLOQUEADOS / NÃO EXECUTADOS.
Main src/bootstrap/routes.ts196 fecha /api/voice-hub com authenticateToken, requireTenant e unavailableLegacyModule. Teste HTTP usa apenas o gate real numa aplicação isolada e não comprova cadeia de autenticação. O resgate usa destino canônico /api/voice-hub/workflow e informa indisponibilidade.
ValidationEngine shared era stub permissivo; snapshot12 agora bloqueia por validation-unavailable. Testes confirmam bloqueio; NÃO afirmam que existe validador funcional.
Canvas tests substituem ReactFlow e painéis decorativos; teclado Enter/Space testa TopBar real, não drag ou Delete real do ReactFlow em navegador. QA visual fica com00/24.
Gates globais build/lint/architecture/fullunit são do coordenador na integração; não declarar release verde com esta suíte dirigida.

## Comunicação e pendências

Contrato loadState/saveState/context/savedGraph e retries acordado com12. Achados de senha/auditoria histórica não foram reintroduzidos. Mic aria-label e late permission cleanup implementados pelo12, testados pelo08.
Pendente: parecer24 sobre revisão exata final, gates de integração, evidência visual desktop/mobile e decisões posteriores para backend real. Status aberto até revisão; estes testes não autorizam merge/push/deploy.


## Verificação final após guardas de graph do12

Dois testes negativos adicionais (category não-string e métricas não-numéricas). Rodada final: 37/37 testes em quatro arquivos, exit0, 12.86s. Novas guardas do12 verificadas, nenhum defeito remanescente nos casos dirigidos. Config de tipos inclui declarações Vite para manter ambiente igual ao produto.

## Hashes da revisão QA (históricos; substituídos pelo manifesto final)

- tests/unit/features/voice-hub-studio-persistence.test.ts: 165EFDDE4BC7AE357660C81B0A5922B1DCA8176D4F2E571AA67B943372EAEC4F
- tests/unit/features/voice-hub-test-simulator.test.tsx: F8BD17842F898740157A71AEDBCF531F849FBAB939D385E325ACEA9840299557
- tests/unit/features/voice-hub-canvas-recovery.test.tsx: 813B90078DC9F43E4F822FC203B63D0ADC022E20BCA58CA46AD52A9C80F0A388
- tests/unit/features/voice-hub-availability-gate.test.ts: 72D2C5B13A9CE475D12DFC7143EE9632F2C554015CFBB986EC531AEC8556A8F3
- tests/tsconfig.voice-recovery.json: 25A093E2D585D83C6EECB172EEA0C0BD223440E3DF1A1CA1E7C4DBB22B849433


## Remediação coordenador00 após revisão independente

Snapshot final inclui logger de navegador, payload sem renomeação e sem seleção/medição transitória ReactFlow; aviso de telemetria indisponível e erro global nos nós. Novo caso comprova que seleção/medição não gera POST, posição real gera POST e nome existente não é sobrescrito. 38/38 testes dirigidos, exit0 (9.36s); tsc dirigido exit0. Produção final foi remediada pelo coordenador00 sobre o trabalho12. Hashes atuais devem ser obtidos do manifesto final, não da rodada histórica acima.
