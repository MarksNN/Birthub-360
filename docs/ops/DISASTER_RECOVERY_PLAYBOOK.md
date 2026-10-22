# Playbook de Recuperação de Desastres (Disaster Recovery — DR) — Birth Hub 360
**SRE / Infraestrutura:** Agente 10  
**Data:** 22 de outubro de 2026  
**Status:** HOMOLOGADO

---

## 1. Métricas Críticas de Continuidade Operacional

- **RTO (Recovery Time Objective):** < 15 minutos (tempo máximo para restabelecimento total dos serviços em caso de perda total de nós primários).
- **RPO (Recovery Point Objective):** < 1 minuto (perda máxima aceitável de transações persistidas via replicação contínua e WAL archiving).

---

## 2. Procedimento de Recuperação a Quente

1. **Detecção e Isolamento:**
   - O healthcheck do balanceador/Nginx detecta indisponibilidade contínua (> 3 falhas de 5s).
   - Isolamento imediato do tráfego para failover passivo.
2. **Promover Réplica ou Restaurar Snapshot Recente:**
   - Restauração a partir do último backup criptografado AES-256 (`backup-encrypted.sh`).
   - Aplicação de WAL logs incrementais até o timestamp da falha.
3. **Verificação de Integridade Referencial:**
   - Execução de validação de schemas Prisma e constraints de Foreign Key.
4. **Rechaveamento de DNS / Roteador:**
   - Apontamento do proxy Nginx para o nó restaurado.
