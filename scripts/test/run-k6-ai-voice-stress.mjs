#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const PORT = 3001;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const WS_URL = `ws://127.0.0.1:${PORT}`;
const SUMMARY_FILE = path.resolve(process.cwd(), 'k6-ai-voice-summary.json');
const K6_BIN = 'C:\\Program Files\\k6\\k6.exe';

console.log('==============================================================================');
console.log('BIRTH HUB 360° — BENCHMARK DE CARGA E ESTRESSE K6 (IA, WEBSOCKETS E VOZ)');
console.log('Volume Comercial Intenso: 100+ requisições simultâneas distribuídas');
console.log('==============================================================================\n');

// 1. Subir servidor de benchmark
console.log(`[1/4] Iniciando servidor de teste de alta performance na porta ${PORT}...`);
const serverProcess = spawn(process.execPath, ['./node_modules/tsx/dist/cli.mjs', 'scripts/test/ai-voice-load-server.ts'], {
  stdio: 'inherit',
  shell: false,
  env: { ...process.env, PORT: String(PORT) },
});

// 2. Aguardar servidor ficar pronto
async function waitForReady() {
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${BASE_URL}/health/ready`);
      if (res.ok) {
        console.log('[2/4] Servidor pronto para receber carga distribuída.\n');
        return true;
      }
    } catch {
      // continua tentando
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Timeout aguardando servidor de carga inicializar.');
}

async function run() {
  try {
    await waitForReady();

    // 3. Executar suíte k6
    console.log('[3/4] Executando suíte K6 (100+ VUs simultâneas, estágios de estresse)...');
    console.log(`Comando: ${K6_BIN} run tests/load/k6-ai-voice-stress.js`);

    const k6Args = [
      'run',
      'tests/load/k6-ai-voice-stress.js',
      `--summary-export=${SUMMARY_FILE}`,
      `--env`,
      `BASE_URL=${BASE_URL}`,
      `--env`,
      `WS_URL=${WS_URL}`,
    ];

    const k6ExitCode = await new Promise((resolve) => {
      const k6Proc = spawn(K6_BIN, k6Args, {
        stdio: 'inherit',
        shell: false,
      });

      k6Proc.on('close', (code) => resolve(code));
    });

    console.log(`\n[4/4] Execução K6 concluída com código: ${k6ExitCode}`);

    // 4. Analisar e exibir sumário executivo
    if (existsSync(SUMMARY_FILE)) {
      const summary = JSON.parse(readFileSync(SUMMARY_FILE, 'utf-8'));
      const metrics = summary.metrics || {};

      console.log('\n==============================================================================');
      console.log('RELATÓRIO EXECUTIVO DE LATÊNCIA E THROUGHPUT (SLO / SRE)');
      console.log('==============================================================================');

      const getVal = (m, key) => {
        if (!m) return 'N/A';
        if (key === 'p(50)' && m.med !== undefined) return m.med;
        if (m[key] !== undefined) return m[key];
        if (m.values && m.values[key] !== undefined) return m.values[key];
        if (key === 'val' && m.value !== undefined) return m.value;
        return 'N/A';
      };

      const httpReqs = getVal(metrics.http_reqs, 'count');
      const httpRate = typeof getVal(metrics.http_reqs, 'rate') === 'number' ? getVal(metrics.http_reqs, 'rate').toFixed(2) : 'N/A';
      const failMetric = metrics['http_req_failed{expected_fail:false}'] || metrics.http_req_failed;
      const failRate = typeof getVal(failMetric, 'val') === 'number'
        ? (getVal(failMetric, 'val') * 100).toFixed(2)
        : (typeof getVal(failMetric, 'rate') === 'number' ? (getVal(failMetric, 'rate') * 100).toFixed(2) : '0.00');
      const vusMax = getVal(metrics.vus_max, 'val') !== 'N/A' ? getVal(metrics.vus_max, 'val') : getVal(metrics.vus_max, 'max');

      console.log(`- Volume Total de Requisições: ${httpReqs}`);
      console.log(`- Throughput Médio: ${httpRate} req/s`);
      console.log(`- Pico de Usuários Virtuais Simultâneos (VUs): ${vusMax}`);
      console.log(`- Taxa de Falha HTTP: ${failRate}% (Meta: < 1.00%)`);

      if (metrics.voice_ttfb_ms) {
        console.log(`- Voice TTFB (Time-To-First-Audio): p50=${getVal(metrics.voice_ttfb_ms, 'p(50)')}ms | p95=${getVal(metrics.voice_ttfb_ms, 'p(95)')}ms (Meta: < 800ms)`);
      }
      if (metrics.voice_barge_in_ms) {
        console.log(`- Voice Barge-In (Interrupção Subsegundo): p50=${getVal(metrics.voice_barge_in_ms, 'p(50)')}ms | p95=${getVal(metrics.voice_barge_in_ms, 'p(95)')}ms (Meta: < 300ms)`);
      }
      if (metrics.ai_turn_duration_ms) {
        const p50 = typeof getVal(metrics.ai_turn_duration_ms, 'p(50)') === 'number' ? getVal(metrics.ai_turn_duration_ms, 'p(50)').toFixed(1) : getVal(metrics.ai_turn_duration_ms, 'p(50)');
        const p95 = typeof getVal(metrics.ai_turn_duration_ms, 'p(95)') === 'number' ? getVal(metrics.ai_turn_duration_ms, 'p(95)').toFixed(1) : getVal(metrics.ai_turn_duration_ms, 'p(95)');
        console.log(`- IA Roleplay Turn Latency: p50=${p50}ms | p95=${p95}ms`);
      }
      if (metrics.conversational_analysis_ms) {
        const p50 = typeof getVal(metrics.conversational_analysis_ms, 'p(50)') === 'number' ? getVal(metrics.conversational_analysis_ms, 'p(50)').toFixed(1) : getVal(metrics.conversational_analysis_ms, 'p(50)');
        const p95 = typeof getVal(metrics.conversational_analysis_ms, 'p(95)') === 'number' ? getVal(metrics.conversational_analysis_ms, 'p(95)').toFixed(1) : getVal(metrics.conversational_analysis_ms, 'p(95)');
        console.log(`- IA Conversational Coaching Analysis: p50=${p50}ms | p95=${p95}ms`);
      }
      if (metrics.ws_roundtrip_ms) {
        const p50 = typeof getVal(metrics.ws_roundtrip_ms, 'p(50)') === 'number' ? getVal(metrics.ws_roundtrip_ms, 'p(50)').toFixed(1) : getVal(metrics.ws_roundtrip_ms, 'p(50)');
        const p95 = typeof getVal(metrics.ws_roundtrip_ms, 'p(95)') === 'number' ? getVal(metrics.ws_roundtrip_ms, 'p(95)').toFixed(1) : getVal(metrics.ws_roundtrip_ms, 'p(95)');
        console.log(`- WebSocket Voice Duplex Roundtrip: p50=${p50}ms | p95=${p95}ms`);
      }
      if (metrics.tenant_isolation_success_rate) {
        const rateVal = getVal(metrics.tenant_isolation_success_rate, 'val') !== 'N/A'
          ? getVal(metrics.tenant_isolation_success_rate, 'val')
          : getVal(metrics.tenant_isolation_success_rate, 'rate');
        const isolationRate = typeof rateVal === 'number' ? (rateVal * 100).toFixed(2) : '100.00';
        console.log(`- Isolamento Multi-Tenant Sob Concorrência: ${isolationRate}% (Meta: 100%)`);
      }
      console.log('==============================================================================\n');
    }

    process.exit(k6ExitCode || 0);
  } finally {
    console.log('Finalizando servidor de benchmark...');
    try {
      serverProcess.kill('SIGTERM');
    } catch {}
  }
}

run();
