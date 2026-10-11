import { Router, type Request, type Response } from 'express';
import { getDatabase, saveDatabase } from '../db.js';
import { requireAuth } from '../auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { exportLead } from '../search/providers/bitrix.provider.js';
import {
  checkBitrixDuplicate,
  resolveBitrixWebhookForCompany,
  generateExportIdempotencyKey,
} from '../services/bitrix.js';
import { checkExportEligibility, type ExportPolicy } from '../exportEligibility.js';
import {
  domainSearch as hunterDomainSearch,
  verifyEmail as hunterVerifyEmail,
} from '../search/providers/hunter.provider.js';
import { isUrlSafeForOutboundWebhook, isWithinMaxLength, maskWebhookUrl } from '../validators.js';

export const integrationsRouter = Router();

const integrationLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  message: 'Muitas chamadas a integrações externas em 1 minuto. Aguarde um instante.',
});

// Wave 12 (CPI) — política de elegibilidade padrão desta instalação. 'lenient'
// (avisa mas não bloqueia CNPJ/e-mail não confirmados) é o default operacional
// atual porque nem a verificação de e-mail (Hunter) nem a Wave 0 (remoção do
// fallback determinístico de CNPJ em server/cnpj.ts) estão totalmente integradas
// neste branch ainda — travar tudo em 'strict' hoje bloquearia praticamente
// qualquer exportação legítima. Duplicidade de Cliente/Contato (existing_client)
// bloqueia sempre, independente desta variável — ver server/exportEligibility.ts.
function getBitrixExportPolicy(): ExportPolicy {
  return process.env.BITRIX_EXPORT_POLICY === 'strict' ? 'strict' : 'lenient';
}

// Wave 12 (CPI) — resume, a partir dos campos já presentes no lead, de onde vieram
// os dados e quando foram confirmados pela última vez. Nunca inventa uma fonte:
// quando o pipeline não sabe, devolve 'Não confirmada'/null explicitamente.
function summarizeVerification(lead: any): {
  primarySource: string;
  lastVerifiedAt: string | null;
} {
  if (lead.cnpj_consultado === true && lead.is_estimated !== true) {
    return {
      primarySource: 'Receita Federal (consulta pública de CNPJ)',
      lastVerifiedAt: lead.created_at || null,
    };
  }
  if (lead.cnpj_consultado === true && lead.is_estimated === true) {
    return {
      primarySource: 'Consulta de CNPJ sem confirmação completa (dados fiscais estimados)',
      lastVerifiedAt: lead.created_at || null,
    };
  }
  return { primarySource: 'Não confirmada (CNPJ não consultado)', lastVerifiedAt: null };
}

// Wave 12 (CPI) — Scores (Wave 8) e Search-ID (Wave 10) ainda podem não existir
// neste lead se aquelas waves não tiverem sido mescladas ainda: todo acesso abaixo
// é opcional/defensivo, nunca assume presença nem inventa um valor no lugar.
function extractScoresAndSearchContext(lead: any): {
  fitScore?: number | string;
  intentScore?: number | string;
  dataQualityScore?: number | string;
  adherenceReason: string;
  searchId?: string;
} {
  const scores = lead.scores || {};
  const fitScore = scores.fit ?? scores.fitScore ?? lead.fit_score;
  const intentScore = scores.intent ?? scores.intentScore ?? lead.intent_score;
  const dataQualityScore = scores.dataQuality ?? scores.data_quality ?? lead.data_quality_score;

  const requirementEvaluations = lead.requirement_evaluations;
  let adherenceReason = '';
  if (Array.isArray(requirementEvaluations) && requirementEvaluations.length > 0) {
    adherenceReason = requirementEvaluations
      .map((r: any) => (typeof r === 'string' ? r : r?.reason || r?.description || r?.label || ''))
      .filter(Boolean)
      .join('; ');
  } else if (typeof lead.adherence_reason === 'string' && lead.adherence_reason) {
    adherenceReason = lead.adherence_reason;
  }

  const searchId = lead.search_id || lead.searchId;

  return { fitScore, intentScore, dataQualityScore, adherenceReason, searchId };
}

// 9. Integration: Bitrix24 CRM Lead/Deal Export
integrationsRouter.post(
  '/integrations/bitrix24/send-lead',
  integrationLimiter,
  requireAuth,
  async (req: Request, res: Response) => {
    const db = await getDatabase();
    const { webhookUrl, lead, customComments, force } = req.body || {};

    try {
      const effectiveWebhook = (
        webhookUrl ||
        resolveBitrixWebhookForCompany(lead?.company) ||
        process.env.BITRIX_BIRTHHUB360_WEBHOOK ||
        ''
      ).replace(/\/$/, '');

      if (!lead?.name) {
        return res.status(400).json({ error: 'Dados do lead são obrigatórios.' });
      }

      // Wave 11 (CPI) - SSRF: o webhook pode vir direto do body da requisição
      const webhookSafety = isUrlSafeForOutboundWebhook(effectiveWebhook);
      if (!webhookSafety.safe) {
        return res
          .status(400)
          .json({ error: `Webhook do Bitrix24 rejeitado: ${webhookSafety.reason}` });
      }

      if (customComments !== undefined && !isWithinMaxLength(String(customComments))) {
        return res
          .status(400)
          .json({ error: 'Notas adicionais excedem o tamanho máximo permitido.' });
      }

      const policy = getBitrixExportPolicy();
      const eligibility = checkExportEligibility(lead, policy);
      if (!eligibility.eligible) {
        if (lead.id) {
          await db
            .run(
              `UPDATE leads SET bitrix_export_status = ?, bitrix_export_error = ? WHERE id = ?`,
              ['blocked', eligibility.reasons.join(' | '), lead.id],
            )
            .catch((e: any) => console.error('Falha ao gravar bitrix_export_status=blocked:', e));
        }
        return res.status(409).json({
          success: false,
          blocked: true,
          error: 'Lead não elegível para exportação ao Bitrix24.',
          reasons: eligibility.reasons,
          warnings: eligibility.warnings,
        });
      }

      const idempotencyKey = generateExportIdempotencyKey(lead.id || '', effectiveWebhook);
      if (!force && lead.id) {
        try {
          const prior = await db.exec(
            `SELECT bitrix_lead_id, created_at FROM bitrix_export_log WHERE idempotency_key = ? AND status = 'success' ORDER BY created_at DESC LIMIT 1`,
            [idempotencyKey],
          );
          if (prior.length > 0 && prior[0].values.length > 0) {
            const [priorBitrixLeadId, priorCreatedAt] = prior[0].values[0];
            return res.json({
              success: true,
              idempotent: true,
              leadId: priorBitrixLeadId,
              message: `Lead "${lead.name}" já havia sido exportado para o Bitrix24 (Lead #${priorBitrixLeadId}, em ${priorCreatedAt}). Envie novamente com "force" para reprocessar de propósito.`,
              target: 'Birthub 360',
              warnings: eligibility.warnings,
            });
          }
        } catch (err: any) {
          console.error(
            'Falha ao checar idempotência de exportação Bitrix24 (seguindo com o envio):',
            err,
          );
        }
      }

      const verification = summarizeVerification(lead);
      const scoresAndContext = extractScoresAndSearchContext(lead);

      const exportResult = await exportLead({
        webhookUrl: effectiveWebhook,
        lead,
        customComments,
        source: 'Leads-Outbound System (Birth Hub 360)',
        verification,
        fitScore: scoresAndContext.fitScore,
        intentScore: scoresAndContext.intentScore,
        dataQualityScore: scoresAndContext.dataQualityScore,
        adherenceReason: scoresAndContext.adherenceReason,
        searchId: scoresAndContext.searchId,
      });

      if (exportResult.status === 'ok' && exportResult.data) {
        const bitrixLeadId = String(exportResult.data.leadId);
        if (lead.id) {
          await db
            .run(
              `INSERT INTO bitrix_export_log (lead_id, bitrix_lead_id, idempotency_key, status) VALUES (?, ?, ?, 'success')`,
              [lead.id, bitrixLeadId, idempotencyKey],
            )
            .catch((e: any) => console.error('Falha ao gravar bitrix_export_log:', e));
          await db
            .run(
              `UPDATE leads SET bitrix_export_status = 'exported', bitrix_export_error = NULL WHERE id = ?`,
              [lead.id],
            )
            .catch((e: any) => console.error('Falha ao gravar bitrix_export_status=exported:', e));
        }
        saveDatabase();
        return res.json({
          success: true,
          leadId: bitrixLeadId,
          message: `Lead "${lead.name}" exportado com sucesso para o Bitrix24! (Lead #${bitrixLeadId})`,
          target: 'Birthub 360',
          warnings: eligibility.warnings,
        });
      }

      const errMsg = exportResult.errorMessage || 'Erro retornado pela API do Bitrix24.';
      if (lead.id) {
        await db
          .run(
            `INSERT INTO bitrix_export_log (lead_id, idempotency_key, status, error) VALUES (?, ?, 'error', ?)`,
            [lead.id, idempotencyKey, errMsg],
          )
          .catch((e: any) => console.error('Falha ao gravar bitrix_export_log:', e));
        await db
          .run(
            `UPDATE leads SET bitrix_export_status = 'error', bitrix_export_error = ? WHERE id = ?`,
            [errMsg, lead.id],
          )
          .catch((e: any) => console.error('Falha ao gravar bitrix_export_status=error:', e));
      }
      saveDatabase();
      const httpStatus =
        exportResult.status === 'rate_limited'
          ? 429
          : exportResult.status === 'timeout' ||
              (exportResult.httpStatus !== undefined && exportResult.httpStatus >= 500)
            ? 502
            : 400;
      return res.status(httpStatus).json({
        success: false,
        error: errMsg,
        providerStatus: exportResult.status,
      });
    } catch (err: any) {
      console.error(
        'Erro na integração Bitrix24:',
        err.message || err,
        '| webhook:',
        maskWebhookUrl(req.body?.webhookUrl),
      );
      if (lead?.id) {
        await db
          .run(
            `UPDATE leads SET bitrix_export_status = 'error', bitrix_export_error = ? WHERE id = ?`,
            [err.message || 'Falha ao conectar com o Bitrix24.', lead.id],
          )
          .catch((e: any) => console.error('Falha ao gravar bitrix_export_status=error:', e));
      }
      res
        .status(500)
        .json({ success: false, error: err.message || 'Falha ao conectar com o Bitrix24.' });
    }
  },
);

// 9b. Bitrix24: conferir manualmente se um lead específico já é cliente/já está na base
integrationsRouter.post(
  '/leads/:id/bitrix-check',
  integrationLimiter,
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { webhookUrl } = req.body;
      const db = await getDatabase();

      const leadRes = await db.exec(`SELECT * FROM leads WHERE id = ?`, [id]);
      if (leadRes.length === 0 || leadRes[0].values.length === 0) {
        return res.status(404).json({ error: 'Lead não encontrado.' });
      }
      const cols = leadRes[0].columns;
      const rawLead: any = {};
      cols.forEach((col, idx) => {
        rawLead[col] = leadRes[0].values[0][idx];
      });

      const effectiveWebhook = (
        webhookUrl || resolveBitrixWebhookForCompany(rawLead.company)
      ).replace(/\/$/, '');
      if (effectiveWebhook) {
        const webhookSafety = isUrlSafeForOutboundWebhook(effectiveWebhook);
        if (!webhookSafety.safe) {
          return res
            .status(400)
            .json({ error: `Webhook do Bitrix24 rejeitado: ${webhookSafety.reason}` });
        }
      }
      const result = await checkBitrixDuplicate(effectiveWebhook, {
        phone: rawLead.phone,
        email: rawLead.decision_maker_email || rawLead.corporate_email,
      });

      await db.run(
        `UPDATE leads SET bitrix_check_status = ?, bitrix_check_detail = ?, bitrix_checked_at = ? WHERE id = ?`,
        [
          result.status,
          result.detail,
          result.status === 'unchecked' ? null : new Date().toISOString(),
          id,
        ],
      );
      saveDatabase();

      res.json({ success: true, leadId: id, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Falha ao consultar o Bitrix24.' });
    }
  },
);

// 10. Integration: Hunter.io Email Verification & Domain Search
integrationsRouter.post(
  '/integrations/hunter/verify',
  integrationLimiter,
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { email, apiKey } = req.body;
      const effectiveKey = (apiKey || process.env.HUNTER_API_KEY || '').trim();

      if (!email) {
        return res.status(400).json({ error: 'E-mail para verificação é obrigatório.' });
      }

      const result = await hunterVerifyEmail(email, effectiveKey);

      if (result.status === 'ok' && result.data) {
        res.json({
          success: true,
          email: result.data.email,
          status: result.data.status,
          score: result.data.score,
          domain: result.data.domain,
          sources_count: result.data.sourcesCount,
          result: result.data.result,
          message: `E-mail verificado via Hunter.io: status ${result.data.status} (Score ${result.data.score}/100)`,
        });
      } else {
        res.json({
          success: false,
          email,
          status: 'unknown',
          score: 0,
          domain: email.split('@')[1] || '',
          message:
            'Verificação via Hunter.io indisponível (chave não configurada ou serviço fora do ar). Nenhuma verificação real foi realizada.',
          isSimulated: true,
          providerStatus: result.status,
        });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

integrationsRouter.post(
  '/integrations/hunter/domain-search',
  integrationLimiter,
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { domain, apiKey } = req.body;
      const effectiveKey = (apiKey || process.env.HUNTER_API_KEY || '').trim();

      if (!domain) {
        return res.status(400).json({ error: 'Domínio é obrigatório.' });
      }

      const result = await hunterDomainSearch(domain, effectiveKey);

      if (result.status === 'ok' && result.data) {
        res.json({
          success: true,
          domain,
          organization: result.data.organization,
          emails: result.data.emails.map((e) => ({
            value: e.email,
            type: e.type,
            confidence: e.confidence,
            first_name: e.firstName,
            last_name: e.lastName,
            position: e.position,
          })),
        });
      } else {
        res.json({
          success: false,
          domain,
          emails: [],
          message:
            'Busca de e-mails via Hunter.io indisponível (chave não configurada ou serviço fora do ar).',
          providerStatus: result.status,
        });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// 11. Integration: Bland AI Conversational Voice Call
integrationsRouter.post(
  '/integrations/bland/call',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { phoneNumber, script, companyName, decisionMakerName, apiKey } = req.body;
      const effectiveKey = (apiKey || process.env.BLAND_AI_API_KEY || '').trim();

      if (!phoneNumber) {
        return res
          .status(400)
          .json({ error: 'Número de telefone é obrigatório para disparo da chamada.' });
      }

      if (script !== undefined && !isWithinMaxLength(String(script))) {
        return res
          .status(400)
          .json({ error: 'Roteiro de chamada excede o tamanho máximo permitido.' });
      }

      const promptTask = `Você é a assistente de voz IA da Birth Hub 360.
Você está ligando para ${decisionMakerName || 'o decisor'} na empresa ${companyName || 'alvo'}.
Objetivo da chamada: Apresentar de forma cordial e objetiva a solução Birth Hub 360 para inteligência comercial e solicitar 10 minutos de reunião com nosso consultor sênior.
Roteiro base: "${script || 'Olá, estou entrando em contato em nome da Birth Hub 360 para compartilhar nossos avanços em inteligência comercial.'}"
Fale com voz natural, cordial, em Português Brasileiro (PT-BR), aguarde a resposta do interlocutor e trate objeções com profissionalismo.`;

      const response = await fetch('https://api.bland.ai/v1/calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: effectiveKey,
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
          task: promptTask,
          voice: 'maya',
          reduce_latency: true,
          record: true,
          wait_for_greeting: true,
          language: 'pt',
        }),
      });

      const data = (await response.json()) as any;

      if (response.ok && data.status === 'success') {
        res.json({
          success: true,
          call_id: data.call_id,
          status: 'queued',
          message: `Chamada de voz IA agendada para ${phoneNumber} com sucesso via Bland AI! (Call ID: ${data.call_id})`,
          phone_number: phoneNumber,
        });
      } else {
        res.status(502).json({
          success: false,
          status: 'error',
          error:
            data.message ||
            data.error ||
            'Falha ao disparar a chamada via Bland AI (chave não configurada ou serviço indisponível).',
          phone_number: phoneNumber,
        });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);
