import { type Request, type Response, Router } from 'express';
import { requireAdmin } from '../auth.js';
import { fetchCnpjPublicData } from '../cnpj.js';
import {
  checkExplorerSqlSafety,
  executeQuery,
  getDatabase,
  getStats,
  saveDatabase,
} from '../db.js';
import {
  buildFeedbackSummary,
  type FeedbackLeadRecord,
  type FeedbackMessageRecord,
} from '../feedbackLoop.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { getObservabilitySummary, getSearchRun } from '../observability.js';
import { providerRegistry } from '../providerRegistry.js';

export const systemRouter = Router();

const errorReportLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  message: 'Muitos reportes em 1 minuto. Aguarde um instante.',
});

// 1. Health check & DB Stats
systemRouter.get('/health', async (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Wave 4 (CPI) - Provider Registry: expõe o catálogo real de providers, suas
// capacidades declaradas e status de configuração/saúde - nenhum provider
// "some" do catálogo, incluindo os ainda não migrados a adapter formal.
systemRouter.get('/providers/health', async (_req: Request, res: Response) => {
  try {
    const snapshot = await Promise.all(
      providerRegistry.map(async (p) => ({
        name: p.name,
        capabilities: p.capabilities,
        configured: p.configured(),
        health: await p.health(),
      })),
    );
    res.json({ providers: snapshot });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Wave 10 (CPI) - Observabilidade: "por que esta empresa apareceu (ou não
// apareceu) NESTA busca?" - devolve o SearchRun completo (pedido original,
// SearchIntent, SearchPlan, passos do pipeline, chamadas a provider e a
// decisão registrada para cada candidato). Armazenamento em memória por
// processo (ver server/observability.ts) - um Search-ID de uma busca antiga
// ou de outra instância do servidor pode não estar mais disponível.
systemRouter.get('/search-runs/:searchId', async (req: Request, res: Response) => {
  const { searchId } = req.params;
  const run = getSearchRun(searchId);
  if (!run) {
    return res.status(404).json({
      error:
        'Search-ID não encontrado. Buscas são retidas em memória por processo (últimas 200) - pode ter expirado, ter sido de outra instância do servidor, ou nunca ter existido.',
      searchId,
    });
  }
  res.json(run);
});

// Wave 10 (CPI) - Observabilidade: painel agregado - buscas executadas, taxa
// de sucesso, providers mais chamados, taxa de erro por provider e motivos
// de descarte mais comuns. Calculado só a partir do que foi de fato
// registrado nesta instância do processo desde que ela subiu - nunca uma
// métrica estimada (custo/cache ficam `null`: dependem da Wave 9).
systemRouter.get('/observability/summary', async (_req: Request, res: Response) => {
  res.json(getObservabilitySummary());
});

systemRouter.get('/db/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Botão "Reportar problema" (presente em toda tela, inclusive login): grava o
// relato para revisão posterior. Nunca deve travar o uso do app por causa de
// um erro ao registrar o próprio erro — por isso segue com sucesso genérico
// para o usuário mesmo que o log em si falhe, só reportando no servidor.
systemRouter.post('/error-reports', errorReportLimiter, async (req: Request, res: Response) => {
  const { message, page, userId, userEmail, userAgent } = req.body;
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Descreva o problema antes de enviar.' });
  }
  console.error(
    `[REPORTE DE ERRO] página=${page || 'desconhecida'} usuário=${userEmail || userId || 'anônimo'}: ${message}`,
  );
  try {
    const db = await getDatabase();
    await db.run(
      `INSERT INTO error_reports (user_id, user_email, page, message, user_agent) VALUES (?, ?, ?, ?, ?)`,
      [userId || null, userEmail || null, page || null, message.trim(), userAgent || null],
    );
    saveDatabase();
  } catch (err: any) {
    console.error('Falha ao persistir error_report (log acima já registrou o relato):', err);
  }
  res.json({ success: true });
});

// Lista os reportes para revisão (mais recentes primeiro) — sem isso, a única forma
// de ver o que foi reportado seria consultar o Postgres diretamente.
systemRouter.get('/error-reports', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 50), 200);
    const result = await db.exec(`SELECT * FROM error_reports ORDER BY created_at DESC LIMIT ?`, [
      limit,
    ]);
    if (result.length === 0) return res.json([]);
    const cols = result[0].columns;
    const reports = result[0].values.map((row) => {
      const obj: any = {};
      cols.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });
    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Raw SQL Execution for Explorer
systemRouter.post('/db/query', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { sql } = req.body;
    if (!sql || typeof sql !== 'string') {
      return res.status(400).json({ error: 'SQL query é obrigatória.' });
    }
    const safety = checkExplorerSqlSafety(sql);
    if (!safety.allowed) {
      return res.status(403).json({ error: safety.reason });
    }
    const result = await executeQuery(sql);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dedicated Public CNPJ Lookup (BrasilAPI / Minha Receita)
systemRouter.get('/cnpj/:cnpj', async (req: Request, res: Response) => {
  try {
    const { cnpj } = req.params;
    const data = await fetchCnpjPublicData(cnpj);
    if (!data) {
      return res.status(404).json({ error: 'CNPJ não localizado na base pública ou inválido.' });
    }
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Wave 13 (CPI) - Feedback Loop: agregados honestos e determinísticos
systemRouter.get('/feedback/summary', async (_req: Request, res: Response) => {
  try {
    const db = await getDatabase();

    const messagesRes = await db.exec(`SELECT channel, feedback FROM messages`);
    const messages: FeedbackMessageRecord[] =
      messagesRes.length > 0
        ? messagesRes[0].values.map((row) => ({
            channel: row[0] as string | null,
            feedback: row[1] as string | null,
          }))
        : [];

    const leadsRes = await db.exec(
      `SELECT stage, loss_reason, win_reason, segment, company FROM leads`,
    );
    const leads: FeedbackLeadRecord[] =
      leadsRes.length > 0
        ? leadsRes[0].values.map((row) => ({
            stage: row[0] as string | null,
            loss_reason: row[1] as string | null,
            win_reason: row[2] as string | null,
            segment: row[3] as string | null,
            company: row[4] as string | null,
          }))
        : [];

    const summary = buildFeedbackSummary(messages, leads);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Falha ao calcular resumo de feedback.' });
  }
});
