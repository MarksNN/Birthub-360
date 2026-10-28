import { type Request, type Response, Router } from 'express';
import { getDatabase } from '../db.js';
import { formatLeadRow } from '../utils/formatLead.js';

export const campaignsRouter = Router();

// 4. Campaigns API
// Paginado (limit/offset opcionais) para não carregar a tabela inteira conforme a
// base cresce; sem os parâmetros, mantém um teto razoável em vez de "tudo".
campaignsRouter.get('/campaigns', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 50), 200);
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const result = await db.exec(
      `
      SELECT c.*,
        (SELECT COUNT(*) FROM leads l WHERE l.campaign_id = c.id) as leads_count,
        (SELECT COUNT(*) FROM messages m WHERE m.campaign_id = c.id) as messages_count
      FROM campaigns c
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `,
      [limit, offset],
    );

    if (result.length === 0) {
      return res.json([]);
    }

    const cols = result[0].columns;
    const campaigns = result[0].values.map((row) => {
      const obj: any = {};
      cols.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });

    res.json(campaigns);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Leads assigned to a specific user (limit/offset opcionais; teto alto por
// padrão porque a tela do vendedor precisa da carteira inteira dele para o Kanban)
campaignsRouter.get('/users/:userId/leads', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const db = await getDatabase();
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 500), 2000);
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const leadsRes = await db.exec(
      `SELECT * FROM leads WHERE assigned_to = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset],
    );
    const leads: any[] = [];
    if (leadsRes.length > 0) {
      const lCols = leadsRes[0].columns;
      for (const row of leadsRes[0].values) {
        const leadObj: any = {};
        lCols.forEach((col, idx) => {
          leadObj[col] = row[idx];
        });

        const msgRes = await db.exec(
          `SELECT * FROM messages WHERE lead_id = ? ORDER BY created_at ASC`,
          [leadObj.id],
        );
        const messages: any[] = [];
        if (msgRes.length > 0) {
          const mCols = msgRes[0].columns;
          msgRes[0].values.forEach((mRow) => {
            const msgObj: any = {};
            mCols.forEach((col, idx) => {
              msgObj[col] = mRow[idx];
            });
            messages.push(msgObj);
          });
        }

        leads.push(formatLeadRow(leadObj, messages));
      }
    }
    res.json(leads);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Distribuição: leads atribuídos, agrupados por vendedor (para o painel do admin)
campaignsRouter.get('/leads/distribution', async (_req: Request, res: Response) => {
  try {
    const db = await getDatabase();

    // 'gestor' não é vendedor (não entra no rodízio de leads em /api/prospect) — só
    // role='user' representa um vendedor de verdade nessa visão de distribuição.
    const usersRes = await db.exec(
      `SELECT id, email, name, role, company FROM users WHERE role = 'user' ORDER BY name ASC`,
    );
    const sellers: any[] = (usersRes[0]?.values || []).map((row) => ({
      id: row[0],
      email: row[1],
      name: row[2],
      role: row[3],
      company: row[4] || 'birthhub360',
    }));

    const groups: Record<string, { sellers: any[]; totalLeads: number }> = {
      birthhub360: { sellers: [], totalLeads: 0 },
    };

    // Lista limitada a 200 por vendedor (renderização), mas totalLeads vem de um
    // COUNT(*) à parte — nunca subestimar o total mostrado ao gestor por causa do limite.
    for (const seller of sellers) {
      const countRes = await db.exec(`SELECT COUNT(*) FROM leads WHERE assigned_to = ?`, [
        seller.id,
      ]);
      const totalLeadsForSeller = Number(countRes[0]?.values[0]?.[0]) || 0;

      const leadsRes = await db.exec(
        `SELECT id, name, segment, company_type, stage, domain, created_at FROM leads WHERE assigned_to = ? ORDER BY created_at DESC LIMIT 200`,
        [seller.id],
      );
      const leads: any[] = [];
      if (leadsRes.length > 0) {
        const cols = leadsRes[0].columns;
        leadsRes[0].values.forEach((row) => {
          const obj: any = {};
          cols.forEach((col, idx) => {
            obj[col] = row[idx];
          });
          obj.stage = obj.stage || 'prospecto';
          leads.push(obj);
        });
      }
      const groupKey = seller.company || 'birthhub360';
      if (!groups[groupKey]) {
        groups[groupKey] = { sellers: [], totalLeads: 0 };
      }
      groups[groupKey].sellers.push({ user: seller, leads, totalLeads: totalLeadsForSeller });
      groups[groupKey].totalLeads += totalLeadsForSeller;
    }

    res.json(groups);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

campaignsRouter.get('/campaigns/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();

    const campRes = await db.exec(`SELECT * FROM campaigns WHERE id = ?`, [id]);
    if (campRes.length === 0 || campRes[0].values.length === 0) {
      return res.status(404).json({ error: 'Campanha não encontrada.' });
    }

    const campCols = campRes[0].columns;
    const campObj: any = {};
    campCols.forEach((col, idx) => {
      campObj[col] = campRes[0].values[0][idx];
    });

    // Get leads
    const leadsRes = await db.exec(
      `SELECT * FROM leads WHERE campaign_id = ? ORDER BY created_at ASC`,
      [id],
    );
    const leads: any[] = [];
    if (leadsRes.length > 0) {
      const lCols = leadsRes[0].columns;
      for (const row of leadsRes[0].values) {
        const leadObj: any = {};
        lCols.forEach((col, idx) => {
          leadObj[col] = row[idx];
        });

        // Get messages for this lead
        const msgRes = await db.exec(
          `SELECT * FROM messages WHERE lead_id = ? ORDER BY created_at ASC`,
          [leadObj.id],
        );
        const messages: any[] = [];
        if (msgRes.length > 0) {
          const mCols = msgRes[0].columns;
          msgRes[0].values.forEach((mRow) => {
            const msgObj: any = {};
            mCols.forEach((col, idx) => {
              msgObj[col] = mRow[idx];
            });
            messages.push(msgObj);
          });
        }

        leads.push(formatLeadRow(leadObj, messages));
      }
    }

    campObj.leads = leads;
    res.json(campObj);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
