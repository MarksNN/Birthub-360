import { type Request, type Response, Router } from 'express';
import { z } from 'zod';
import type { DecisionMaker, Lead } from '../../types.js';
import { enrichLeadWithPublicNewsAndScripts, generateCopiesWithEngine } from '../ai.js';
import { requireAuth } from '../auth.js';
import { type CnpjData, resolveAndEnrichCnpjForLead } from '../cnpj.js';
import { getDatabase, logActivity, saveDatabase } from '../db.js';
import { buildCompanyKey, type CompanyKey, findDuplicate } from '../entityResolution.js';
import {
  buildCnpjEvidence,
  buildDecisionMakerEvidence,
  getFieldEvidence,
  saveFieldEvidence,
} from '../evidence.js';
import { rateLimit } from '../middleware/rateLimit.js';
import {
  attachSearchPlan,
  finishSearchRun,
  recordCandidateDecision,
  recordProviderCall,
  recordStep,
  startSearchRun,
} from '../observability.js';
import { buildFunnelSummary } from '../progressiveSearch.js';
import { planSearch } from '../queryPlanner.js';
import { buildRequirementsFromSearchIntent, evaluateRequirements } from '../requirementEngine.js';
import {
  CACHE_TTL_MS,
  createBudgetTracker,
  getCircuitState,
  hasEnrichmentBudget,
  hasFreshCacheEntry,
  isBudgetExhausted,
  parseSearchBudget,
  recordApiCall,
  recordEnrichment,
  withCache,
} from '../resilience.js';
import { computeLeadScores } from '../scoring.js';
import { complementDecisionMakerEmail as complementDecisionMakerEmailWithHunter } from '../search/providers/hunter.provider.js';
import { parseSearchIntent, validateSearchIntent } from '../searchIntent.js';
import { checkBitrixDuplicate, resolveBitrixWebhookForCompany } from '../services/bitrix.js';
import {
  buildCnpjCacheKey,
  cleanDomainForCache,
  enrichLeadWithApollo,
  findLeads,
  resolveCnpjWithResilience,
} from '../services/leadSearch.service.js';
import { detectSignalsForLead } from '../signals.js';
import { upsertMessageWithVersioning, validateChangedLeadFields } from '../utils/formatLead.js';

const heavyAiLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  message: 'Muitas chamadas de IA/enriquecimento em 1 minuto. Aguarde um instante.',
});

const updateStageSchema = z.object({
  stage: z.string().min(1, 'Stage é obrigatório'),
  userId: z.string().optional(),
  lossReason: z.string().optional(),
  winReason: z.string().optional(),
});

const updateTagsSchema = z.object({
  tags: z.array(z.string()),
  userId: z.string().optional(),
});

export const leadsRouter = Router();

// Update Lead Stage directly
leadsRouter.put('/leads/:id/stage', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = updateStageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message || 'Stage é obrigatório' });
    }
    const { stage, userId, lossReason, winReason } = parsed.data;
    const db = await getDatabase();
    const beforeRes = await db.exec(`SELECT stage FROM leads WHERE id = ?`, [id]);
    const previousStage = beforeRes[0]?.values[0]?.[0] ?? null;

    if (lossReason !== undefined && winReason !== undefined) {
      await db.run(`UPDATE leads SET stage = ?, loss_reason = ?, win_reason = ? WHERE id = ?`, [
        stage,
        lossReason,
        winReason,
        id,
      ]);
    } else if (lossReason !== undefined) {
      await db.run(`UPDATE leads SET stage = ?, loss_reason = ? WHERE id = ?`, [
        stage,
        lossReason,
        id,
      ]);
    } else if (winReason !== undefined) {
      await db.run(`UPDATE leads SET stage = ?, win_reason = ? WHERE id = ?`, [
        stage,
        winReason,
        id,
      ]);
    } else {
      await db.run(`UPDATE leads SET stage = ? WHERE id = ?`, [stage, id]);
    }
    if (previousStage !== stage) {
      const reasonNote = lossReason
        ? ` (motivo: ${lossReason})`
        : winReason
          ? ` (motivo: ${winReason})`
          : '';
      await logActivity(db, {
        leadId: id,
        userId,
        action: 'stage_changed',
        fromValue: previousStage,
        toValue: `${stage}${reasonNote}`,
      });
    }
    saveDatabase();
    res.json({ success: true, stage, leadId: id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Lead Tags directly
leadsRouter.put('/leads/:id/tags', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tags, userId } = req.body;
    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: 'Tags deve ser um array de strings' });
    }
    const db = await getDatabase();
    const beforeRes = await db.exec(`SELECT tags FROM leads WHERE id = ?`, [id]);
    const previousTags = beforeRes[0]?.values[0]?.[0] ?? null;
    const tagsJson = JSON.stringify(tags);

    await db.run(`UPDATE leads SET tags = ? WHERE id = ?`, [tagsJson, id]);
    if (previousTags !== tagsJson) {
      await logActivity(db, {
        leadId: id,
        userId,
        action: 'tags_changed',
        fromValue: previousTags,
        toValue: tagsJson,
      });
    }
    saveDatabase();
    res.json({ success: true, tags, leadId: id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Lead General Info
leadsRouter.put('/leads/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      stage,
      tags,
      decision_maker_name,
      decision_maker_title,
      decision_maker_email,
      decision_maker_linkedin,
      cnpj,
      phone,
      corporate_email,
      website,
      address,
      userId,
    } = req.body;

    const db = await getDatabase();

    const currentRes = await db.exec(
      `SELECT cnpj, phone, corporate_email, decision_maker_email FROM leads WHERE id = ?`,
      [id],
    );
    const currentRow = currentRes[0]?.values[0] || [];
    const validationErrors = validateChangedLeadFields(
      { cnpj, phone, corporate_email, decision_maker_email },
      {
        cnpj: currentRow[0],
        phone: currentRow[1],
        corporate_email: currentRow[2],
        decision_maker_email: currentRow[3],
      },
    );
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors.join(' ') });
    }

    if (stage !== undefined) {
      const beforeRes = await db.exec(`SELECT stage FROM leads WHERE id = ?`, [id]);
      const previousStage = beforeRes[0]?.values[0]?.[0] ?? null;
      await db.run(`UPDATE leads SET stage = ? WHERE id = ?`, [stage, id]);
      if (previousStage !== stage) {
        await logActivity(db, {
          leadId: id,
          userId,
          action: 'stage_changed',
          fromValue: previousStage,
          toValue: stage,
        });
      }
    }
    if (tags !== undefined) {
      await db.run(`UPDATE leads SET tags = ? WHERE id = ?`, [JSON.stringify(tags), id]);
    }
    if (decision_maker_name !== undefined) {
      await db.run(`UPDATE leads SET decision_maker_name = ? WHERE id = ?`, [
        decision_maker_name,
        id,
      ]);
    }
    if (decision_maker_title !== undefined) {
      await db.run(`UPDATE leads SET decision_maker_title = ? WHERE id = ?`, [
        decision_maker_title,
        id,
      ]);
    }
    if (decision_maker_email !== undefined) {
      await db.run(`UPDATE leads SET decision_maker_email = ? WHERE id = ?`, [
        decision_maker_email,
        id,
      ]);
    }
    if (decision_maker_linkedin !== undefined) {
      await db.run(`UPDATE leads SET decision_maker_linkedin = ? WHERE id = ?`, [
        decision_maker_linkedin,
        id,
      ]);
    }
    if (cnpj !== undefined) {
      await db.run(`UPDATE leads SET cnpj = ? WHERE id = ?`, [cnpj, id]);
    }
    if (phone !== undefined) {
      await db.run(`UPDATE leads SET phone = ? WHERE id = ?`, [phone, id]);
    }
    if (corporate_email !== undefined) {
      await db.run(`UPDATE leads SET corporate_email = ? WHERE id = ?`, [corporate_email, id]);
    }
    if (website !== undefined) {
      await db.run(`UPDATE leads SET website = ? WHERE id = ?`, [website, id]);
    }
    if (address !== undefined) {
      await db.run(`UPDATE leads SET address = ? WHERE id = ?`, [address, id]);
    }
    saveDatabase();
    res.json({ success: true, leadId: id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Save Lead Comprehensive Edits directly
leadsRouter.post('/leads/:id/save', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const leadData = req.body;

    const db = await getDatabase();

    const currentRes = await db.exec(
      `SELECT cnpj, phone, corporate_email, decision_maker_email FROM leads WHERE id = ?`,
      [id],
    );
    const currentRow = currentRes[0]?.values[0] || [];
    const validationErrors = validateChangedLeadFields(
      {
        cnpj: leadData.cnpj,
        phone: leadData.phone,
        corporate_email: leadData.corporate_email,
        decision_maker_email: leadData.decision_maker_email,
      },
      {
        cnpj: currentRow[0],
        phone: currentRow[1],
        corporate_email: currentRow[2],
        decision_maker_email: currentRow[3],
      },
    );
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors.join(' ') });
    }

    const userId = leadData.userId;

    if (leadData.stage) {
      const beforeRes = await db.exec(`SELECT stage FROM leads WHERE id = ?`, [id]);
      const previousStage = beforeRes[0]?.values[0]?.[0] ?? null;
      if (leadData.lossReason !== undefined && leadData.winReason !== undefined) {
        await db.run(`UPDATE leads SET stage = ?, loss_reason = ?, win_reason = ? WHERE id = ?`, [
          leadData.stage,
          leadData.lossReason,
          leadData.winReason,
          id,
        ]);
      } else if (leadData.lossReason !== undefined) {
        await db.run(`UPDATE leads SET stage = ?, loss_reason = ? WHERE id = ?`, [
          leadData.stage,
          leadData.lossReason,
          id,
        ]);
      } else if (leadData.winReason !== undefined) {
        await db.run(`UPDATE leads SET stage = ?, win_reason = ? WHERE id = ?`, [
          leadData.stage,
          leadData.winReason,
          id,
        ]);
      } else {
        await db.run(`UPDATE leads SET stage = ? WHERE id = ?`, [leadData.stage, id]);
      }
      if (previousStage !== leadData.stage) {
        const reasonNote = leadData.lossReason
          ? ` (motivo: ${leadData.lossReason})`
          : leadData.winReason
            ? ` (motivo: ${leadData.winReason})`
            : '';
        await logActivity(db, {
          leadId: id,
          userId,
          action: 'stage_changed',
          fromValue: previousStage,
          toValue: `${leadData.stage}${reasonNote}`,
        });
      }
    }
    if (leadData.tags) {
      await db.run(`UPDATE leads SET tags = ? WHERE id = ?`, [JSON.stringify(leadData.tags), id]);
    }
    if (leadData.cnpj) {
      await db.run(`UPDATE leads SET cnpj = ? WHERE id = ?`, [leadData.cnpj, id]);
    }
    if (leadData.phone) {
      await db.run(`UPDATE leads SET phone = ? WHERE id = ?`, [leadData.phone, id]);
    }
    if (leadData.corporate_email) {
      await db.run(`UPDATE leads SET corporate_email = ? WHERE id = ?`, [
        leadData.corporate_email,
        id,
      ]);
    }
    if (leadData.website) {
      await db.run(`UPDATE leads SET website = ? WHERE id = ?`, [leadData.website, id]);
    }
    if (leadData.address) {
      await db.run(`UPDATE leads SET address = ? WHERE id = ?`, [leadData.address, id]);
    }
    if (leadData.decision_maker_name) {
      await db.run(`UPDATE leads SET decision_maker_name = ? WHERE id = ?`, [
        leadData.decision_maker_name,
        id,
      ]);
    }
    if (leadData.decision_maker_title) {
      await db.run(`UPDATE leads SET decision_maker_title = ? WHERE id = ?`, [
        leadData.decision_maker_title,
        id,
      ]);
    }
    if (leadData.decision_maker_email) {
      await db.run(`UPDATE leads SET decision_maker_email = ? WHERE id = ?`, [
        leadData.decision_maker_email,
        id,
      ]);
    }
    if (leadData.decision_maker_linkedin) {
      await db.run(`UPDATE leads SET decision_maker_linkedin = ? WHERE id = ?`, [
        leadData.decision_maker_linkedin,
        id,
      ]);
    }
    if (leadData.company_linkedin !== undefined) {
      await db.run(`UPDATE leads SET company_linkedin = ? WHERE id = ?`, [
        leadData.company_linkedin,
        id,
      ]);
    }
    if (leadData.assigned_to !== undefined) {
      const beforeRes = await db.exec(`SELECT assigned_to FROM leads WHERE id = ?`, [id]);
      const previousAssignee = beforeRes[0]?.values[0]?.[0] ?? null;
      await db.run(`UPDATE leads SET assigned_to = ? WHERE id = ?`, [leadData.assigned_to, id]);
      if (previousAssignee !== leadData.assigned_to) {
        await logActivity(db, {
          leadId: id,
          userId,
          action: 'reassigned',
          fromValue: previousAssignee,
          toValue: leadData.assigned_to,
        });
      }
    }
    if (leadData.activity_notes !== undefined) {
      await db.run(`UPDATE leads SET activity_notes = ? WHERE id = ?`, [
        leadData.activity_notes,
        id,
      ]);
    }
    if (leadData.activity_context !== undefined) {
      await db.run(`UPDATE leads SET activity_context = ? WHERE id = ?`, [
        leadData.activity_context,
        id,
      ]);
    }

    if (leadData.copies) {
      const channels = [
        'cold_call',
        'cold_email',
        'whatsapp',
        'linkedin',
        'objection_matrix',
        'qualification_matrix',
        'ice_breaker',
      ] as const;
      for (const ch of channels) {
        if (leadData.copies[ch]) {
          const msgId = `msg-${id}-${ch}`;
          try {
            await db.run(`UPDATE messages SET content = ? WHERE id = ?`, [
              leadData.copies[ch],
              msgId,
            ]);
          } catch (_e: any) {}
        }
      }
    }

    saveDatabase();
    res.json({ success: true, message: 'Dados do lead salvos com sucesso!' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Second Stage: News & Public Sources Enrichment with Script Generation
leadsRouter.post(
  '/leads/:id/enrich-news',
  heavyAiLimiter,
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { pitch, aiConfig, tone, force } = req.body;
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

      let dmEmails: string[] = [];
      try {
        if (rawLead.decision_maker_emails) {
          dmEmails = JSON.parse(rawLead.decision_maker_emails);
        }
      } catch (_e: any) {
        dmEmails = [rawLead.decision_maker_email];
      }
      if (dmEmails.length === 0 && rawLead.decision_maker_email) {
        dmEmails = [rawLead.decision_maker_email];
      }

      let dmPhones: string[] = [];
      try {
        if (rawLead.decision_maker_phones) {
          dmPhones = JSON.parse(rawLead.decision_maker_phones);
        }
      } catch (_e: any) {
        dmPhones = [rawLead.decision_maker_phone || rawLead.phone].filter(Boolean);
      }
      if (dmPhones.length === 0 && (rawLead.decision_maker_phone || rawLead.phone)) {
        dmPhones = [rawLead.decision_maker_phone || rawLead.phone];
      }

      const lead: Lead = {
        ...rawLead,
        decision_makers: rawLead.decision_maker_name
          ? [
              {
                name: rawLead.decision_maker_name,
                title: rawLead.decision_maker_title || '',
                email: rawLead.decision_maker_email || dmEmails[0] || '',
                emails: dmEmails,
                phone: rawLead.decision_maker_phone || dmPhones[0] || '',
                phones: dmPhones,
                linkedin: rawLead.decision_maker_linkedin || '',
              },
            ]
          : [],
      };

      const defaultPitch =
        pitch ||
        'A Atlas conecta pessoas e tecnologia gerando valores com segurança e inteligência logística.';
      const storedEvidence = await getFieldEvidence(db, 'lead', id);
      const enrichedData = await enrichLeadWithPublicNewsAndScripts(
        lead,
        defaultPitch,
        aiConfig || {
          provider: 'ollama',
          ollamaUrl: 'http://localhost:11434',
          ollamaModel: 'llama3',
        },
        tone,
        storedEvidence,
      );

      const newsDossierJson = JSON.stringify(enrichedData.news_dossier);
      await db.run(`UPDATE leads SET news_dossier = ?, is_enriched = 1 WHERE id = ?`, [
        newsDossierJson,
        id,
      ]);

      const channels = [
        'cold_call',
        'cold_email',
        'whatsapp',
        'linkedin',
        'objection_matrix',
        'qualification_matrix',
        'ice_breaker',
      ] as const;
      const finalCopies: Record<string, string> = {};
      let anySkipped = false;
      for (const ch of channels) {
        const msgId = `msg-${id}-${ch}`;
        const { content, skipped } = await upsertMessageWithVersioning(db, {
          msgId,
          campaignId: rawLead.campaign_id || 'camp-default',
          leadId: id,
          channel: ch,
          content: enrichedData.copies[ch] || '',
          engineUsed: enrichedData.engineUsed,
          force: Boolean(force),
        });
        finalCopies[ch] = content;
        if (skipped) anySkipped = true;
      }

      saveDatabase();

      res.json({
        success: true,
        leadId: id,
        news_dossier: enrichedData.news_dossier,
        copies: finalCopies,
        engineUsed: enrichedData.engineUsed,
        personalization_level: enrichedData.personalization_level,
        skippedSentMessages: anySkipped,
        message: anySkipped
          ? `Lead "${lead.name}" enriquecido — algum roteiro já marcado como "enviado" foi preservado (use force para sobrescrever).`
          : `Lead "${lead.name}" enriquecido com sucesso com notícias públicas e novos roteiros!`,
      });
    } catch (err: any) {
      console.error('Erro no enriquecimento de notícias:', err);
      res.status(500).json({ error: err.message || 'Falha ao enriquecer lead com notícias.' });
    }
  },
);

// Dedicated On-Demand AI Copy Generation (Runs only when user requests)
leadsRouter.post(
  '/leads/:id/generate-copies',
  heavyAiLimiter,
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { pitch, aiConfig, force } = req.body;
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

      let dmEmails: string[] = [];
      try {
        if (rawLead.decision_maker_emails) {
          dmEmails = JSON.parse(rawLead.decision_maker_emails);
        }
      } catch (_e: any) {
        dmEmails = [rawLead.decision_maker_email];
      }

      let dmPhones: string[] = [];
      try {
        if (rawLead.decision_maker_phones) {
          dmPhones = JSON.parse(rawLead.decision_maker_phones);
        }
      } catch (_e: any) {
        dmPhones = [rawLead.decision_maker_phone || rawLead.phone].filter(Boolean);
      }

      const mainDm: DecisionMaker = {
        name: rawLead.decision_maker_name || '',
        title: rawLead.decision_maker_title || '',
        email: rawLead.decision_maker_email || dmEmails[0] || '',
        emails: dmEmails,
        phone: rawLead.decision_maker_phone || dmPhones[0] || rawLead.phone || '',
        phones: dmPhones,
        linkedin: rawLead.decision_maker_linkedin || '',
      };

      const lead: Lead = {
        ...rawLead,
        decision_makers: [mainDm],
      };

      const defaultPitch =
        pitch ||
        'A Atlas conecta pessoas e tecnologia gerando valores com segurança e inteligência logística.';
      const storedEvidence = await getFieldEvidence(db, 'lead', id);
      const { copies, engineUsed, personalization_level } = await generateCopiesWithEngine(
        lead,
        defaultPitch,
        aiConfig || {
          provider: 'ollama',
          ollamaUrl: 'http://localhost:11434',
          ollamaModel: 'llama3',
        },
        mainDm,
        storedEvidence,
      );

      const channels = [
        'cold_call',
        'cold_email',
        'whatsapp',
        'linkedin',
        'objection_matrix',
        'qualification_matrix',
        'ice_breaker',
      ] as const;
      const finalCopies: Record<string, string> = {};
      let anySkipped = false;
      for (const ch of channels) {
        const msgId = `msg-${id}-${ch}`;
        const result = await upsertMessageWithVersioning(db, {
          msgId,
          campaignId: rawLead.campaign_id || 'camp-default',
          leadId: id,
          channel: ch,
          content: copies[ch] || '',
          engineUsed,
          force: Boolean(force),
        });
        finalCopies[ch] = result.content;
        if (result.skipped) anySkipped = true;
      }

      saveDatabase();

      res.json({
        success: true,
        leadId: id,
        copies: finalCopies,
        engineUsed,
        personalization_level,
        skippedSentMessages: anySkipped,
        message: anySkipped
          ? `Roteiros gerados — algum já marcado como "enviado" foi preservado (use force para sobrescrever).`
          : `Roteiros comerciais gerados com sucesso para ${rawLead.name}!`,
      });
    } catch (err: any) {
      console.error('Erro na geração de copys sob demanda:', err);
      res.status(500).json({ error: err.message || 'Falha ao gerar roteiros comerciais.' });
    }
  },
);

// Aprendizado contínuo
const VALID_COPY_FEEDBACK = ['used_as_is', 'edited', 'not_used'] as const;
leadsRouter.post(
  '/leads/:id/copies/:channel/feedback',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { id, channel } = req.params;
      const { feedback } = req.body;
      if (!VALID_COPY_FEEDBACK.includes(feedback)) {
        return res
          .status(400)
          .json({ error: `feedback deve ser um de: ${VALID_COPY_FEEDBACK.join(', ')}` });
      }
      const db = await getDatabase();
      const msgId = `msg-${id}-${channel}`;
      await db.run(`UPDATE messages SET feedback = ? WHERE id = ?`, [feedback, msgId]);
      saveDatabase();
      res.json({ success: true, leadId: id, channel, feedback });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Falha ao registrar feedback do roteiro.' });
    }
  },
);

// Refresh / Update CNPJ for a Lead
leadsRouter.post('/leads/:id/cnpj-refresh', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { cnpj } = req.body;
    const db = await getDatabase();

    const leadRes = await db.exec(`SELECT * FROM leads WHERE id = ?`, [id]);
    if (leadRes.length === 0 || leadRes[0].values.length === 0) {
      return res.status(404).json({ error: 'Lead não encontrado.' });
    }

    const cols = leadRes[0].columns;
    const currentLead: any = {};
    cols.forEach((col, idx) => {
      currentLead[col] = leadRes[0].values[0][idx];
    });

    const targetCnpj = cnpj || currentLead.cnpj;
    const cnpjData = await resolveAndEnrichCnpjForLead({
      name: currentLead.name,
      domain: currentLead.domain,
      cnpj: targetCnpj,
      address: currentLead.address,
    });

    await db.run(
      `
      UPDATE leads 
      SET cnpj = ?, razao_social = ?, situacao_cadastral = ?, cnae_fiscal = ?, cnae_fiscal_descricao = ?, capital_social = ?, qsa = ?
      WHERE id = ?
    `,
      [
        cnpjData.cnpj,
        cnpjData.razao_social,
        cnpjData.situacao_cadastral,
        cnpjData.cnae_fiscal,
        cnpjData.cnae_fiscal_descricao,
        cnpjData.capital_social,
        JSON.stringify(cnpjData.qsa || []),
        id,
      ],
    );

    saveDatabase();

    res.json({
      success: true,
      leadId: id,
      cnpjData,
      message: `CNPJ ${cnpjData.cnpj} atualizado com dados oficiais da Receita Federal!`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Evidence & Provenance
leadsRouter.get('/leads/:id/evidence', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();
    const evidence = await getFieldEvidence(db, 'lead', id);
    res.json({ leadId: id, evidence });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Prospecting Pipeline
leadsRouter.post('/prospect', heavyAiLimiter, requireAuth, async (req: Request, res: Response) => {
  let searchId: string = '';
  try {
    const {
      pitch,
      aiConfig,
      googleApiKey,
      apolloApiKey,
      hunterApiKey,
      company: bodyCompany,
      bitrixWebhook,
    } = req.body;

    const company =
      (req as any).outboundUser &&
      (req as any).outboundUser.role !== 'admin' &&
      (req as any).outboundUser.company
        ? (req as any).outboundUser.company
        : bodyCompany;

    const budgetTracker = createBudgetTracker(parseSearchBudget(req.body.budget));
    const searchIntent = parseSearchIntent(req.body);

    const searchRun = startSearchRun({
      request: {
        query: req.body?.query,
        segment: searchIntent.segment,
        region: searchIntent.location.state,
        city: searchIntent.location.city,
        companyType: searchIntent.companyType,
        employeeCount: searchIntent.employeeCount,
        annualRevenue: searchIntent.annualRevenue,
        decisionMakerRole: searchIntent.decisionMakerRole,
        company: company || 'birthhub360',
        limit: searchIntent.targetCount,
      },
      searchIntent,
    });
    searchId = searchRun.searchId;
    const finishIntentStep = recordStep(searchId, 'search_intent_validated');

    const validation = validateSearchIntent(searchIntent);
    if (!validation.valid) {
      finishIntentStep({ status: 'error', detail: validation.errors.join(' ') });
      finishSearchRun(searchId, 'failed', validation.errors.join(' '));
      return res.status(400).json({
        error: validation.errors.join(' '),
        searchIntentErrors: validation.errors,
        searchId,
      });
    }
    finishIntentStep({ status: 'ok' });

    const { segment, decisionMakerRole, decisionMakerTitles } = searchIntent;

    const effectiveCompany = company || 'birthhub360';
    const effectiveGoogleKey = (googleApiKey || process.env.GOOGLE_PLACES_API_KEY || '').trim();
    const effectiveApolloKey = (apolloApiKey || process.env.APOLLO_API_KEY || '').trim();
    const effectiveHunterKey = (hunterApiKey || process.env.HUNTER_API_KEY || '').trim();

    const searchQuery = searchIntent.freeTextQuery;
    const effectiveLimit = searchIntent.targetCount;
    const campaignId = `camp-${Date.now()}`;
    const now = new Date().toISOString();
    const db = await getDatabase();

    const existingLeadsRes = await db.exec(`SELECT id, domain, name, cnpj FROM leads`);
    const existingCompanyKeys: Array<{
      key: CompanyKey;
      entry: { id: string; domain: string; name: string };
    }> = [];
    const excludeDomains = new Set<string>();
    const excludeNames = new Set<string>();
    if (existingLeadsRes.length > 0 && existingLeadsRes[0].values) {
      for (const row of existingLeadsRes[0].values) {
        const id = row[0] as string;
        const domain = (row[1] as string) || '';
        const name = (row[2] as string) || '';
        const cnpj = (row[3] as string) || '';
        const key = buildCompanyKey({ cnpj, domain, name });
        existingCompanyKeys.push({ key, entry: { id, domain, name } });
        if (key.domain) excludeDomains.add(key.domain);
        if (key.normalizedName) excludeNames.add(key.normalizedName);
      }
    }

    const finishDiscoveryStep = recordStep(searchId, 'discovery');
    const rawLeads = await findLeads({
      query: searchQuery,
      limit: effectiveLimit,
      googleApiKey: effectiveGoogleKey,
      excludeDomains,
      excludeNames,
      onProviderCall: (log) => recordProviderCall(searchId, log as any),
      onCandidateDiscarded: (log) =>
        recordCandidateDecision(searchId, {
          name: log.name,
          domain: log.domain,
          decision: 'discarded',
          reasonCode: log.reasonCode,
          reason: log.reason,
        }),
    });
    finishDiscoveryStep({
      status: 'ok',
      detail: `${rawLeads.length} candidato(s) novo(s) após pré-filtro de duplicidade.`,
    });

    if (rawLeads.length === 0) {
      finishSearchRun(searchId, 'completed');
      if (!effectiveGoogleKey) {
        return res.status(503).json({
          error:
            'Provedor de descoberta de empresas (Google Places) não está configurado. Configure a API key para buscar leads reais.',
          provider: 'google_places',
          providerConfigured: false,
          searchId,
        });
      }
      return res.status(404).json({
        error:
          'Nenhum lead novo encontrado para os critérios informados (empresas já prospectadas foram excluídas). Tente outros filtros.',
        searchId,
      });
    }

    const defaultPitch =
      pitch ||
      'A Atlas conecta pessoas e tecnologia gerando valores com segurança, inteligência logística e gestão de risco rodoviário.';
    const providerName = aiConfig?.provider || 'ollama';
    const modelName =
      providerName === 'ollama'
        ? aiConfig?.ollamaModel || 'llama3'
        : providerName === 'groq'
          ? aiConfig?.groqModel || 'llama-3.3-70b-versatile'
          : 'gemini-3.7-flash';

    await db.run(
      `
      INSERT INTO campaigns (id, title, segment, pitch, provider, model, leads_count, company, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        campaignId,
        `Prospecção: ${searchQuery}`,
        segment || searchQuery,
        defaultPitch,
        providerName,
        modelName,
        rawLeads.length,
        effectiveCompany,
        now,
      ],
    );

    const enrichedLeads: Lead[] = [];
    const requirements = buildRequirementsFromSearchIntent(searchIntent);
    const searchPlan = planSearch(requirements, {
      googlePlacesConfigured: Boolean(effectiveGoogleKey),
      apolloConfigured: Boolean(effectiveApolloKey),
    });
    attachSearchPlan(searchId, searchPlan);
    recordStep(
      searchId,
      'query_planned',
    )({
      status: 'ok',
      detail: `${searchPlan.steps.length} etapa(s) planejada(s), ${searchPlan.unsupportedCriteria.length} critério(s) sem provider capaz nesta execução.`,
    });

    const sellersRes = await db.exec(
      `SELECT id FROM users WHERE role = 'user' AND company = ? AND active IS DISTINCT FROM false`,
      [effectiveCompany],
    );
    const sellerIds: string[] = (sellersRes[0]?.values || []).map((row: any) => row[0] as string);

    const sdrLoads: Record<string, number> = {};
    sellerIds.forEach((id) => {
      sdrLoads[id] = 0;
    });

    if (sellerIds.length > 0) {
      const placeholders = sellerIds.map(() => '?').join(',');
      const activeLeadsRes = await db.exec(
        `SELECT assigned_to, COUNT(*) as count FROM leads WHERE assigned_to IN (${placeholders}) AND stage IN ('prospecto', 'contatado', 'negociacao') GROUP BY assigned_to`,
        sellerIds,
      );
      (activeLeadsRes[0]?.values || []).forEach((row: any) => {
        if (row[0] && sdrLoads[row[0] as string] !== undefined) {
          sdrLoads[row[0] as string] = Number(row[1]) || 0;
        }
      });
    } else {
      console.warn(
        `Nenhum vendedor ativo cadastrado para a marca "${effectiveCompany}" — leads serão salvos sem atribuição automática.`,
      );
    }

    function pickSeller(): string | null {
      if (sellerIds.length === 0) return null;
      return sellerIds.reduce(
        (best, id) => (sdrLoads[id] < sdrLoads[best] ? id : best),
        sellerIds[0],
      );
    }

    const effectiveBitrixWebhook = (
      bitrixWebhook || resolveBitrixWebhookForCompany(effectiveCompany)
    ).replace(/\/$/, '');

    const duplicatesSkipped: Array<{ name: string; matchedBy: string; existingLeadId: string }> =
      [];
    const finishEnrichmentStep = recordStep(searchId, 'enrichment_loop');

    for (let i = 0; i < rawLeads.length; i++) {
      const leadItem = rawLeads[i];
      const leadId = `lead-${Date.now()}-${i}`;

      let cnpjInfo: CnpjData;
      if (budgetTracker.used.apiCalls < budgetTracker.budget.maxApiCalls) {
        const cnpjCacheKey = buildCnpjCacheKey({
          name: leadItem.name,
          domain: leadItem.domain,
          cnpj: leadItem.cnpj,
        });
        const cnpjWasCached = hasFreshCacheEntry(cnpjCacheKey);
        cnpjInfo = await resolveCnpjWithResilience(
          {
            name: leadItem.name,
            domain: leadItem.domain,
            cnpj: leadItem.cnpj,
            address: leadItem.address,
          },
          cnpjCacheKey,
          (info) =>
            recordProviderCall(searchId, {
              provider: 'cnpj_receita_federal',
              operation: 'lookup_cnpj',
              status: info.status,
              latencyMs: info.latencyMs,
              source: info.source,
              leadName: leadItem.name,
            }),
        );
        if (!cnpjWasCached) recordApiCall(budgetTracker);
      } else {
        cnpjInfo = {};
      }

      let candidateKey: CompanyKey | null = null;
      if (cnpjInfo.cnpj) {
        candidateKey = buildCompanyKey({
          cnpj: cnpjInfo.cnpj,
          domain: leadItem.domain,
          name: leadItem.name,
        });
        const duplicate = findDuplicate(candidateKey, existingCompanyKeys);
        if (duplicate && duplicate.matchedBy === 'cnpj') {
          duplicatesSkipped.push({
            name: leadItem.name,
            matchedBy: duplicate.matchedBy,
            existingLeadId: duplicate.entry.id,
          });
          console.info(
            `CNPJ ${cnpjInfo.cnpj} já existe na base — "${leadItem.name}" não foi duplicado.`,
          );
          recordCandidateDecision(searchId, {
            name: leadItem.name,
            domain: leadItem.domain,
            cnpj: cnpjInfo.cnpj,
            decision: 'discarded',
            reasonCode: 'duplicate_cnpj',
            reason: `Mesmo CNPJ oficial (${cnpjInfo.cnpj}) de um lead já existente na base (id ${duplicate.entry.id}), mesmo com nome/domínio diferentes.`,
            matchedExistingLeadId: duplicate.entry.id,
          });
          continue;
        }
        existingCompanyKeys.push({
          key: candidateKey,
          entry: { id: leadId, domain: leadItem.domain || '', name: leadItem.name },
        });
      }

      const assignedSdr = pickSeller();
      if (assignedSdr) sdrLoads[assignedSdr]++;

      let apolloResult: { decisionMakers: DecisionMaker[]; companyLinkedin?: string };
      if (hasEnrichmentBudget(budgetTracker)) {
        const apolloTitlesKeyPart =
          decisionMakerTitles && decisionMakerTitles.length > 0
            ? [...decisionMakerTitles].sort().join(',')
            : '';
        const apolloCacheKey = `apollo:${cleanDomainForCache(leadItem.domain) || leadItem.name.toLowerCase()}:${decisionMakerRole || ''}:${apolloTitlesKeyPart}`;
        const apolloWasCached = hasFreshCacheEntry(apolloCacheKey);
        apolloResult = await withCache(
          apolloCacheKey,
          (r: { decisionMakers: DecisionMaker[]; companyLinkedin?: string }) =>
            r.decisionMakers.length > 0 ? CACHE_TTL_MS.MEDIUM_CONTACT : CACHE_TTL_MS.SHORT_SIGNAL,
          () =>
            enrichLeadWithApollo(
              leadItem.domain,
              leadItem.name,
              effectiveApolloKey,
              decisionMakerRole,
              decisionMakerTitles,
              (log) => recordProviderCall(searchId, { ...log, leadName: leadItem.name } as any),
            ),
        );
        if (!apolloWasCached) recordEnrichment(budgetTracker, { apiCalls: 2, paidCredits: 2 });
      } else {
        apolloResult = { decisionMakers: [], companyLinkedin: leadItem.company_linkedin || '' };
      }
      const decisionMakers = apolloResult.decisionMakers;
      const companyLinkedin = apolloResult.companyLinkedin || leadItem.company_linkedin || '';

      let mainDm: DecisionMaker | undefined = decisionMakers[0];

      if (effectiveHunterKey && leadItem.domain) {
        if (mainDm && !mainDm.email) {
          const foundEmail = await complementDecisionMakerEmailWithHunter(
            mainDm,
            leadItem.domain,
            effectiveHunterKey,
          );
          if (foundEmail) {
            mainDm = {
              ...mainDm,
              email: foundEmail,
              emails: [...(mainDm.emails || []), foundEmail],
            };
            decisionMakers[0] = mainDm;
          }
        } else if (!mainDm && cnpjInfo.qsa && cnpjInfo.qsa.length > 0) {
          const socio = cnpjInfo.qsa[0];
          const foundEmail = await complementDecisionMakerEmailWithHunter(
            { name: socio.nome_socio },
            leadItem.domain,
            effectiveHunterKey,
          );
          if (foundEmail) {
            mainDm = {
              name: socio.nome_socio,
              title: socio.qualificacao_socio || '',
              email: foundEmail,
              emails: [foundEmail],
              linkedin: '',
            };
            decisionMakers.push(mainDm);
          }
        }
      }

      const requirementEvaluations = evaluateRequirements(
        requirements,
        {
          segment: cnpjInfo.cnae_fiscal_descricao,
          region: cnpjInfo.uf,
          city: cnpjInfo.municipio,
          companyType: undefined,
          employeeCount: undefined,
          annualRevenue: undefined,
          decisionMakerRole: mainDm?.title,
        },
        {
          segment: 'cnpj_receita_federal',
          region: 'cnpj_receita_federal',
          city: 'cnpj_receita_federal',
          decisionMakerRole: 'apollo',
        },
      );

      const evidences = [
        ...buildCnpjEvidence(cnpjInfo),
        ...(mainDm ? buildDecisionMakerEvidence(mainDm, 'apollo') : []),
      ];

      const signals = detectSignalsForLead({ name: leadItem.name }, { cnpjData: cnpjInfo });

      const leadScores = computeLeadScores({
        requirementEvaluations,
        evidences,
        signals,
        company: effectiveCompany,
      });

      const situacaoAtiva = (cnpjInfo.situacao_cadastral || '').toUpperCase() === 'ATIVA';
      const tags = [
        segment ? `Busca: ${segment}` : undefined,
        'Novo Lead',
        situacaoAtiva ? 'CNPJ Ativo' : undefined,
      ].filter((t): t is string => Boolean(t));

      const bitrixCheck = await checkBitrixDuplicate(effectiveBitrixWebhook, {
        phone: leadItem.phone,
        email: mainDm?.email,
      });

      const completeLead: Lead = {
        ...leadItem,
        id: leadId,
        campaign_id: campaignId,
        search_id: searchId,
        cnpj: cnpjInfo.cnpj,
        razao_social: cnpjInfo.razao_social,
        nome_fantasia: cnpjInfo.nome_fantasia || leadItem.name,
        situacao_cadastral: cnpjInfo.situacao_cadastral,
        cnae_fiscal: cnpjInfo.cnae_fiscal,
        cnae_fiscal_descricao: cnpjInfo.cnae_fiscal_descricao,
        capital_social: cnpjInfo.capital_social,
        natureza_juridica: cnpjInfo.natureza_juridica,
        porte: cnpjInfo.porte,
        qsa: cnpjInfo.qsa,
        cnpj_consultado: true,
        company_linkedin: companyLinkedin,
        decision_makers: decisionMakers,
        decision_maker_name: mainDm?.name,
        decision_maker_title: mainDm?.title,
        decision_maker_email: mainDm?.email,
        decision_maker_emails: mainDm?.emails,
        decision_maker_phone: mainDm?.phone,
        decision_maker_phones: mainDm?.phones,
        decision_maker_linkedin: mainDm?.linkedin,
        stage: 'prospecto',
        tags,
        requirement_evaluations: requirementEvaluations,
        scores: leadScores,
        copies: {
          cold_call: '',
          cold_email: '',
          whatsapp: '',
          linkedin: '',
        },
        copies_generated: false,
        created_at: now,
      };
      (completeLead as any).company = effectiveCompany;
      (completeLead as any).bitrix_check_status = bitrixCheck.status;
      (completeLead as any).bitrix_check_detail = bitrixCheck.detail;

      const isEstimated =
        !cnpjInfo.situacao_cadastral || !cnpjInfo.cnae_fiscal || !cnpjInfo.capital_social;
      (completeLead as any).is_estimated = isEstimated;

      await db.run(
        `
        INSERT INTO leads (
          id, campaign_id, name, cnpj, razao_social, situacao_cadastral, cnae_fiscal, cnae_fiscal_descricao, capital_social, qsa,
          address, phone, corporate_email, website, domain, company_linkedin,
          rating, total_ratings, segment, company_type, employee_count, annual_revenue,
          decision_maker_name, decision_maker_title, decision_maker_email, decision_maker_emails,
          decision_maker_phone, decision_maker_phones, decision_maker_linkedin, stage, tags, assigned_to,
          company, bitrix_check_status, bitrix_check_detail, bitrix_checked_at, is_estimated, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          leadId,
          campaignId,
          completeLead.name,
          completeLead.cnpj || '',
          completeLead.razao_social || '',
          completeLead.situacao_cadastral || '',
          completeLead.cnae_fiscal || '',
          completeLead.cnae_fiscal_descricao || '',
          completeLead.capital_social || '',
          JSON.stringify(completeLead.qsa || []),
          completeLead.address || '',
          completeLead.phone || '',
          completeLead.corporate_email || '',
          completeLead.website || '',
          completeLead.domain,
          completeLead.company_linkedin || '',
          Number(completeLead.rating) || 0,
          completeLead.total_ratings || 0,
          completeLead.segment || '',
          completeLead.company_type || '',
          completeLead.employee_count || '',
          completeLead.annual_revenue || '',
          mainDm?.name || '',
          mainDm?.title || '',
          mainDm?.email || '',
          JSON.stringify(mainDm?.emails || []),
          mainDm?.phone || '',
          JSON.stringify(mainDm?.phones || []),
          mainDm?.linkedin || '',
          'prospecto',
          JSON.stringify(completeLead.tags || []),
          assignedSdr,
          effectiveCompany,
          bitrixCheck.status,
          bitrixCheck.detail,
          bitrixCheck.status === 'unchecked' ? null : now,
          isEstimated,
          now,
        ],
      );

      if (evidences.length > 0) {
        try {
          await saveFieldEvidence(db, 'lead', leadId, evidences);
        } catch (err: any) {
          console.warn(`[field_evidence] Falha ao salvar evidências do lead ${leadId}:`, err);
        }
      }

      enrichedLeads.push(completeLead);

      const unmatchedHardFilters = requirementEvaluations
        .filter((e) => e.type === 'HARD_FILTER' && e.status === 'unmatched')
        .map((e) => e.criterion);
      recordCandidateDecision(searchId, {
        name: leadItem.name,
        domain: leadItem.domain,
        cnpj: cnpjInfo.cnpj,
        decision: 'included',
        reasonCode: 'included',
        reason: 'Passou pela checagem de duplicidade (Wave 5) e foi incluído no resultado final.',
        leadId,
        unmatchedHardFilters: unmatchedHardFilters.length > 0 ? unmatchedHardFilters : undefined,
      });
    }
    finishEnrichmentStep({
      status: 'ok',
      detail: `${enrichedLeads.length} lead(s) enriquecido(s) e incluído(s).`,
    });

    const finishPersistenceStep = recordStep(searchId, 'persistence');
    saveDatabase();
    finishPersistenceStep({ status: 'ok' });

    const duplicateNote =
      duplicatesSkipped.length > 0
        ? ` (${duplicatesSkipped.length} ${duplicatesSkipped.length === 1 ? 'empresa já estava' : 'empresas já estavam'} na base pelo CNPJ e não ${duplicatesSkipped.length === 1 ? 'foi duplicada' : 'foram duplicadas'})`
        : '';

    const decisionMakersConfirmedCount = enrichedLeads.filter((l) =>
      Boolean(l.decision_maker_name),
    ).length;
    const funnelSummary = buildFunnelSummary({
      targetCount: effectiveLimit,
      discoveryProviderConfigured: Boolean(effectiveGoogleKey),
      discoveredCount: rawLeads.length,
      duplicatesSkippedCount: duplicatesSkipped.length,
      finalCount: enrichedLeads.length,
      decisionMakersConfirmedCount,
    });

    finishSearchRun(searchId, 'completed');

    res.json({
      success: true,
      campaignId,
      searchId,
      leads: enrichedLeads,
      searchPlan,
      duplicatesSkipped,
      skippedDuplicateCnpjCount: duplicatesSkipped.length,
      funnelSummary,
      stopReason: funnelSummary.stopReason,
      rankingApplied: false,
      rankingNote:
        'Resultados na ordem de descoberta, não há ranking por adequação ainda (ver Wave 8 - Scoring).',
      budget: {
        limits: budgetTracker.budget,
        used: budgetTracker.used,
      },
      budgetExhausted: isBudgetExhausted(budgetTracker),
      callsUsed: budgetTracker.used.apiCalls,
      providerCircuits: {
        cnpj_receita_federal: getCircuitState('cnpj_receita_federal'),
        apollo: getCircuitState('apollo'),
      },
      message: `${enrichedLeads.length} empresas prospectadas com Places, CNPJ Oficial e Decisores Apollo salvos com sucesso no SQLite!${duplicateNote}`,
    });
  } catch (err: any) {
    console.error('Erro na prospecção:', err);
    if (searchId)
      finishSearchRun(searchId, 'failed', err.message || 'Falha no processamento da prospecção.');
    res.status(500).json({
      error: err.message || 'Falha no processamento da prospecção.',
      searchId: searchId || undefined,
    });
  }
});
