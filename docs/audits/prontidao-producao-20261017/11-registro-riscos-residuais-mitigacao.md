# REGISTRO DE RISCOS RESIDUAIS E PLANO DE MITIGAÇÃO

**Projeto:** Birth Hub 360° / Birthub 360  
**Data:** 2026-10-17  
**Autoridade:** Agente 00 (Coordenação Global) & Agente 24 (Auditoria Independente)  

---

## 1. MATRIZ DE RISCOS RESIDUAIS MAPEADOS

| ID | Classificação | Descrição do Risco | Impacto Potencial | Probabilidade | Mitigação Técnica Implementada | Dono Responsável |
| :---: | :---: | :--- | :---: | :---: | :--- | :---: |
| **R-01** | **P2 (Médio)** | **Ausência de Branch Protection nativa no GitHub Free:** A API do GitHub impede a ativação de regras de proteção de branch em repositórios privados no plano Free. | Commits diretos na `main` ou merges não revisados poderiam ser feitos por desenvolvedores com permissão de escrita. | Baixa (Operação estritamente multiagente / controlada) | **Controles Compensatórios:** Bloqueio local via pre-push hook, validação mandatória com `scripts/release-gate.js` e auditoria independente pelo Agente 24 antes de qualquer integração. | Agente 08A / 00 |
| **R-02** | **P2 (Médio)** | **Deriva de Schema Estrutural Histórica (DATA-007):** `verify:migration-drift` acusa diferenças históricas de nomenclatura de índices do Postgres truncados em 63 bytes e tabela `KnowledgeChunk`. | Falhas em ambientes de teste que executam diff estrito de migrations contra schema sem tratamento defensivo. | Baixa | Passo mantido com `continue-on-error: true` na CI de release, documentado em `docs/audits/repository-debt-audit/DELTA-2026-09-20.md`. O schema do Prisma é válido e 139 migrations aplicam com sucesso. | Agente 01 |
| **R-03** | **P3 (Baixo)** | **Latência Variável em Provedores de IA Externos:** Variação de tempo de resposta em provedores LLM (Groq, OpenAI Whisper) durante picos de demanda. | Lentidão temporária na geração de copys no Social Selling ou atraso na transcrição de reuniões mobile. | Média | Circuit breakers com timeout de 15s, filas assíncronas BullMQ no processamento de áudio com retry exponencial e UI com skeleton loaders e feedback otimista. | Agente 07 / 23 |
| **R-04** | **P3 (Baixo)** | **Desconexão Temporária do PBX 3CX / SIP:** Queda de rede ou reinício de servidor de telefonia em clientes on-premise. | Impossibilidade temporária de originar chamadas pelo VoiceHub. | Baixa | Painel de status em tempo real exibe status de conexão em vermelho com mensagem clara ao operador; botão de discagem fica desabilitado para prevenir falsas expectativas. | Agente 12 / 06 |
| **R-05** | **P3 (Baixo)** | **Hotspots de Código Acima de 700 Linhas:** 29 arquivos entre 700 e 1000 linhas identificados pelo script `check:hotspots`. | Manutenção mais complexa a longo prazo se esses arquivos continuarem crescendo. | Baixa (Nenhum arquivo acima de 1000 linhas sem exceção) | Monitoramento contínuo pelo gate `check:hotspots`. Regra de ratchet proíbe que qualquer arquivo ultrapasse o teto sem aprovação arquitetural formal. | Agente 00 / 08 |

---

## 2. PLANO DE CONTROLE E REAVALIAÇÃO PERIÓDICA

1. **Reavaliação de Dívida e Hotspots:** Checkpoint agendado para **2026-11-30**, conforme definido em `docs/architecture/KNOWN_VIOLATIONS.md`.
2. **Upgrade de Plano GitHub:** Recomendamos avaliar o upgrade para GitHub Pro ou Team caso a organização necessite de Branch Protection rulesets nativos diretamente na nuvem.
3. **Saneamento de Deriva DATA-007:** Abertura de missão técnica com o Agente 01 para padronizar os nomes de índices de 63 bytes em uma migration de consolidação pós-lançamento.
