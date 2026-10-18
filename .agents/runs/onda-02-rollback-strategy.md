# ESTRATÉGIA DE ROLLBACK E PLANO DE CONTINGÊNCIA — ONDA 02
**Data:** 2026-10-18  
**Projeto:** Birth Hub 360°  
**Branch de Integração:** `integracao/onda-02`  
**Commit Base:** `afb3c47b`  
**Coordenador:** Agente 00  
**Auditor Independente:** Agente 24  

---

## 1. Princípio Fundamental de Reversibilidade
Todas as evoluções da Onda 02 foram desenhadas com isolamento modular estrito:
1. Novos contratos em `src/shared/contracts/` são puramente aditivos e autocontidos.
2. Novos serviços em `src/features/` operam sob injeção de dependência e desacoplamento via barramento `DomainEventMesh`.
3. Nenhuma migration de schema com breaking change foi introduzida no banco de dados (zero alteração em `prisma/schema.prisma`).
4. Se qualquer componente apresentar instabilidade em produção, a reversão pode ser executada sem perda de integridade dos dados históricos do CRM.

---

## 2. Pontos de Restauração (Restore Points)

### Restore Point 1: Rollback via Git Revert / Branch Reset
Caso seja necessário reverter a mesclagem da Onda 02 na branch principal:
```bash
git checkout main
git revert -m 1 <MERGE_COMMIT_HASH>
git push origin main
```
Isso desativa os eixos da Onda 02 imediatamente mantendo as Ondas 00 e 01 100% operacionais.

### Restore Point 2: Feature Flags de Isolamento Runtime
Cada eixo possui controle de execução condicional:
- **Eixo 6 (Knowledge Graph):** fallback para visualização relacional tradicional de contas caso o grafo seja desativado via configuração de tenant.
- **Eixo 11 (Swarm Tático):** os 3 agentes táticos (`AccountDetectiveAgent`, `PromiseGuardianAgent`, `DevilsAdvocateAgent`) requerem supervisão humana. Desativá-los não interrompe a criação manual de tarefas ou a edição padrão de oportunidades no CRM.
- **Eixo 12 (Market Sensing):** se a fila de sinais externos for pausada, o CRM opera normalmente sem ingestão de notícias exógenas.
- **Eixo 19 (Win-Loss Deep Autopsy):** a análise forense é assíncrona; sua suspensão não impede o fechamento padrão de negócios como Ganhos ou Perdidos no pipeline comercial.

---

## 3. Protocolo de Ação em Caso de Incidente
1. **Identificação e Contenção:**
   - Erro isolado em um agente do Swarm: pausar o agente correspondente no `commercialAgentRegistry`.
   - Erro de conectividade com Redis/Filas: o barramento `DomainEventMesh` ativa fallback automático sem travar a requisição HTTP do usuário.
2. **Auditoria Pós-Incidente:**
   - Registro de causa raiz em `.agents/runs/`.
   - Notificação imediata ao Agente 24 para revisão de segurança e tenancy.
3. **Comunicação com Stakeholders:**
   - Nenhuma PII ou dado financeiro de clientes é exposto, garantido pelo isolamento multi-tenant testado.
