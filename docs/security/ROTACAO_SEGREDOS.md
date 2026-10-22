# Procedimento Operacional: Rotação de Segredos e Integração com Cofre (AWS Secrets Manager / Docker Secrets)
**Passo 029 — Agente 15 (Segurança Aplicada e Rotação de Segredos)**

## 1. Visão Geral
Este documento estabelece o procedimento operacional padrão (SOP) para rotação periódica e emergencial de credenciais do Birth Hub 360°, garantindo disponibilidade contínua sem reinicialização forçada de instâncias (dual-key grace period).

## 2. Segredos Sujeitos a Rotação
1. **DATABASE_URL / Credenciais do Banco**:
   - Usuário `prospector_app` do PostgreSQL.
   - Período de rotação: 90 dias ou imediato pós-incidente.
2. **ENCRYPTION_KEY / PII Cipher Key**:
   - Chave AES-256-GCM para criptografia em repouso.
   - Suporte a decifragem com chave anterior durante janela de migração.
3. **BETTER_AUTH_SECRET / JWT Secret**:
   - Chave simétrica de assinatura de sessões.
4. **Chaves de Provedores de IA (Groq, Anthropic, etc.)**:
   - Tokens de API externos com rotação por console/cofre.

## 3. Protocolo de Rotação com Período de Carência (Dual-Key)
```
Passo 1: Gerar novo segredo no AWS Secrets Manager / Vault com versão "AWSPENDING".
Passo 2: Injetar a nova chave como secundária nos pods da aplicação.
Passo 3: Migrar leituras/escritas para a nova credencial.
Passo 4: Promover versão para "AWSCURRENT".
Passo 5: Revogar credencial antiga após 48 horas de carência.
```

## 4. Execução do Script de Validação
Para validar os formatos de credenciais e parâmetros antes de aplicar mudanças reais:

```bash
bash scripts/security/rotate-secrets.sh --dry-run
```

Critério de aprovação: Código de saída 0 com relatório sanitizado (zero segredos reais exibidos).

## 5. Procedimento de Rollback
Em caso de falha de autenticação após a rotação:
1. Reverter o ponteiro do Secrets Manager para a versão "AWSPREVIOUS".
2. Emitir evento de alerta de auditoria de segurança no canal global.
3. Notificar o SRE (Agente 10) e Agente 15 para análise pós-morte.
