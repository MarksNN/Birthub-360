# BIRTH HUB 360° — ONDA 04: ESTRATÉGIA DE ROLLBACK E FEATURE FLAGS
Data: 2026-10-18
Agente: 08A / 10 / 00
Status: HOMOLOGADO

## 1. Feature Flags Canônicas
Todas as funcionalidades da Onda 04 estão blindadas pelas seguintes flags registradas em `src/features/feature-flags/domain/FeatureFlag.ts`:

| Feature Flag | Eixo | Default Global | Comportamento quando Desativada (`false`) |
|---|---|---|---|
| `BIMODAL_LIVE_VOICE_ENABLED` | Eixo 5 (Live Voice) | `true` | Retorna imediatamente ao fluxo clássico assíncrono STT/TTS |
| `METHODOLOGICAL_TWINS_ENABLED` | Eixo 8 (Digital Twins) | `true` | Desativa criação de novos mentores e volta às personas estáticas |
| `MOBILE_EDGE_AI_ENABLED` | Eixo 9 (Mobile Edge AI) | `true` | Desativa cache de briefings e ignora eventos de proximidade geográfica |
| `WAR_ROOM_ARENA_ENABLED` | Eixo 14 (War Room Arena) | `true` | Oculta salas de duelo e redireciona usuários para Roleplay solo |
| `SHADOW_COPYWRITING_ENABLED` | Eixo 15 (Shadow Copywriting) | `true` | Utiliza templates genéricos padronizados da empresa sem personalização |

## 2. Níveis de Rollback

### Nível 1: Rollback Lógico Instantâneo (Zero Downtime)
- **Ação:** O Administrador desativa a feature flag da funcionalidade afetada via endpoint seguro `PUT /api/feature-flags/:key` com `enabled: false`.
- **Efeito:** A plataforma desliga a funcionalidade no runtime em milissegundos sem necessidade de reiniciar o pod ou container.

### Nível 2: Rollback de Microsserviço de Streaming de Voz
- Se o gateway de WebRTC sofrer gargalo, o circuit breaker no `BimodalLiveVoiceService` comuta automaticamente o tráfego para a rota fallback assíncrona com evento `LIVE_VOICE_SESSION_FALLBACK_TRIGGERED`.

### Nível 3: Rollback de Código Git
- Caso seja necessário reverter a branch `integracao/onda-04`:
  ```bash
  git checkout main
  git revert -m 1 <merge_commit_onda_04>
  ```
- Nenhum script destrutivo de banco ou alteração em `prisma/schema.prisma` foi introduzido (schema freeze 100% respeitado).
