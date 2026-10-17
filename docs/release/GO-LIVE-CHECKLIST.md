# Checklist de Go-Live (Birth Hub 360)

## PRE-DEPLOY
- [ ] CI canônico (`ci.yml`, check `build`) verde no mesmo SHA candidato; `npm run release:check` verifica gates locais e não consulta o resultado do CI
- [ ] Parecer APROVADO do Agente 24 para a revisão exata, com varredura de segredos do diff acumulado
- [ ] Security scan aprovado (ausência de criticals/highs não justificados)
- [ ] Variaveis de ambiente (`.env`) validadas em produção

## DEPLOY
- [ ] Infraestrutura local iniciada (`docker compose -f docker-compose.yml -f docker-compose.postgres-local.yml up -d`); este comando não inicia a aplicação
- [ ] Migrations testadas e aplicadas antes de iniciar a aplicação (`prisma migrate deploy`); falha interrompe a publicação
- [ ] Aplicação e worker iniciados pelo caminho aprovado para o ambiente, com acesso externo via Proxy verificado

## POST-DEPLOY
- [ ] `GET /health/live` OK
- [ ] `GET /health/ready` OK
- [ ] Login testado com sucesso
- [ ] Fluxo crítico (Pipeline/CRM) OK
- [ ] Logs chegando no Loki
- [ ] Métricas chegando no Prometheus
- [ ] Alertas do Alertmanager testados
- [ ] Sentry e PostHog reportando dados reais

## HYPERCARE
- [ ] Acompanhamento de 48h das taxas de 5xx
- [ ] Validação do 1º backup noturno em R2/Off-site
- [ ] Restore drill aprovado na primeira semana

## ROLLBACK CRITERIA
- Falha crítica em login que dure > 5min
- Latência sustentada > 2000ms
- Falha de banco de dados irrecuperável via reinício rápido

