# PLANO DE ROLLBACK, CONTINGÊNCIA E RECUPERAÇÃO — ONDA 00
**Projeto:** Birth Hub 360° / Birthub 360  
**Onda:** `00 — Fundação e Preparação`  
**Data:** 2026-10-18  
**Autoridade:** `AGENTS.md`  
**Coordenador:** Agente 00 — Chief Commercial Intelligence Engineering Orchestrator  
**Auditor Independente:** Agente 24 — Revisão Independente  

---

## 1. Princípio de Reversibilidade

Toda e qualquer intervenção realizada no repositório Birthub 360 durante as ondas de engenharia deve possuir procedimento determinístico de reversão, garantindo que o retorno ao estado anterior seguro (`aa46f0f6`) seja executável em menos de 5 minutos sem corrupção de dados ou interrupção de serviços produtivos.

---

## 2. Estratégia de Reversão de Código (Git & Build)

### 2.1 Reversão Imediata de Branch de Especialista
Se uma entrega de um agente especialista introduzir regressão antes do merge na branch de integração:
```bash
# Abortar branch do especialista e retornar à base limpa da onda
git checkout integracao/onda-00
git branch -D agente/<NN>-onda-00-<slug>
```

### 2.2 Reversão de Merge na Branch de Integração
Caso um merge na branch `integracao/onda-00` cause falha no gate intermediário de 2–3 integrações:
```bash
# Identificar o commit causador do erro e reverter atomicamente
git log -n 5 --oneline
git revert -m 1 <merge_commit_sha> --no-edit
# Rodar os gates locais novamente para restabelecer o baseline verde
npm run lint && npm run typecheck && npm run test:architecture
```

---

## 3. Estratégia de Reversão de Banco de Dados (Prisma & PostgreSQL)

1. **Migrações Pré-Testadas:** Nenhuma migration pode ser executada em produção sem drill prévio de aplicação e rollback em ambiente descartável (`npm run backup:drill`).
2. **Reversão com Prisma Migrate:**
   - Em caso de falha durante a execução de uma nova migration:
     ```bash
     # Marcar a migration falhada como revertida no histórico do Prisma
     npx prisma migrate resolve --rolled-back <migration_name>
     ```
   - Para reverter fisicamente uma alteração de DDL no PostgreSQL:
     - Executar o script de down-migration preparado pelo Agente 01 (ex.: `ALTER TABLE ... DROP COLUMN ...`).
3. **Preservação de Políticas de RLS:** Nunca desabilitar o RLS globalmente (`DISABLE ROW LEVEL SECURITY`) durante um rollback. Apenas schemas ou tabelas com defeito cirúrgico devem ser ajustadas.

---

## 4. Contingência de Filas e Runtime Assíncrono (BullMQ & Redis)

1. **Drenagem Segura de Filas:**
   Se uma nova versão de worker apresentar falha sistemática no consumo de jobs:
   ```bash
   # Pausar imediatamente a fila afetada via BullMQ API sem descartar dados
   # Os jobs permanecem no Redis em estado 'delayed' ou 'waiting'
   ```
2. **Isolamento de Mensagens Malformadas:**
   - Mensagens venenosas (*poison pills*) que acionam unhandled rejections são automaticamente movidas para a Dead-Letter Queue (`src/lib/queue/deadLetter.ts`).
   - O worker principal continua operando normalmente para as demais organizações.

---

## 5. Simulação e Teste de Recuperação de Desastres

- Script canônico: `npm run backup:drill` (`scripts/backup/run-backup-restore-drill.ts`).
- O drill simula um snapshot completo do banco PostgreSQL, gera o dump binário criptografado, sobe um container temporário e restaura a base comprovando integridade referencial e leitura sob RLS do papel `prospector_app`.
