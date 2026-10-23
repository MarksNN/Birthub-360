Para: Agente 07 — IA e Automações
Onda: Evolução da Plataforma 2026-10-23
Status: resolvido
Prioridade: alto
Bloqueador-ref: N/A
Sprint destino: Evolução P2

## Problema

P2.1 - Dynamic Model Routing: Seleção de provider/model é estática em `model-routing.ts`. Precisa de routing dinâmico baseado em custo, latência, disponibilidade e tenant tier.

## Arquivo(s) envolvido(s)

- EXISTE: `src/lib/ai/gateway/model-routing.ts` (routing estático)
- EXISTE: `src/lib/ai/gateway/circuit-breaker.ts` (estado de disponibilidade)
- EXISTE: `src/lib/ai/gateway/pricing.ts` (custo por modelo)
- NOVO: `src/lib/ai/gateway/dynamic-routing.ts` (a criar)

## Evidência

Atualmente:
- `model-routing.ts` tem aliases fixos
- Sem routing dinâmico por custo/latência/disponibilidade
- Tenant tier não influencia na escolha do modelo

## Alteração necessária

Criar `dynamic-routing.ts` que seleciona provider/model baseado em:
- Custo (USD por 1M tokens) de `pricing.ts`
- Latência (últimas N execuções)
- Disponibilidade (circuit breaker state de `circuit-breaker.ts`)
- Tenant tier (quota disponível)

Integrar com `getAiModel()` para usar routing dinâmico por padrão.

## Teste esperado

Routing funciona otimizando custo/latência automaticamente. Fallback automático quando provider indisponível.

## Após conclusão

Após completar, notificar para revisão do Agente 24.

## Resolução

Implementado em 2026-10-23 pelo Agente 07.

### Arquivos criados
- `src/lib/ai/gateway/dynamic-routing.ts` (272 linhas) - Implementação completa do routing dinâmico

### Arquivos modificados
- `src/lib/ai/gateway/chat-model.ts` - Integrado routing dinâmico com `getAiModel()`
- `src/lib/ai/gateway.ts` - Exportado funções públicas do dynamic routing
- `src/lib/ai/__tests__/dynamic-routing.test.ts` - Criado suite de testes unitários

### Funcionalidades implementadas
1. **Seleção dinâmica de provider** baseada em:
   - Custo (USD por 1M tokens de `pricing.ts`)
   - Latência (média móvel das últimas N execuções)
   - Disponibilidade (circuit breaker state de `circuit-breaker.ts`)
   - Tenant tier (quota disponível)

2. **Ajuste de pesos por tier**:
   - Free/Starter: custo 50%, latência 30%, disponibilidade 20%
   - Pro: custo 40%, latência 40%, disponibilidade 20%
   - Enterprise: custo 30%, latência 50%, disponibilidade 20%

3. **Cache de latência**:
   - Janela deslizante de 5 minutos
   - Máximo de 50 amostras por provider/model
   - Média móvel para cálculo de score

4. **Fallback automático**:
   - Se routing dinâmico falhar, usa cadeia estática tradicional
   - Se todos os providers tiverem circuit aberto, usa primeiro configurado anyway

5. **Integração com getAiModel()**:
   - Routing dinâmico usado por padrão
   - Resolve tenant tier automaticamente do contexto
   - Registra latência após cada chamada bem-sucedida

### Testes
- Suite de testes unitários criada em `src/lib/ai/__tests__/dynamic-routing.test.ts`
- Cobertura: registro de latência, seleção de provider, ajuste de pesos, fallback

### Próximos passos
- Aguardando revisão do Agente 24 antes de integrar na onda principal
