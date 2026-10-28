import { type Request, type Response, Router } from 'express';
import { requireAuth, requireManager } from '../auth.js';
import { getDatabase, logActivity, saveDatabase } from '../db.js';
import { isWithinMaxLength } from '../validators.js';

export const tasksRouter = Router();

// --- Tarefas por lead --------------------------------------------------------
// Compromisso que o próprio vendedor cria (data + descrição livre), diferente de
// next_action (recomendação automática recalculada a cada leitura, nunca persistida).
const VALID_TASK_STATUS = ['pending', 'done', 'cancelled'] as const;

function mapRows(result: { columns: string[]; values: any[][] }[]): any[] {
  if (result.length === 0) return [];
  const cols = result[0].columns;
  return result[0].values.map((row) => {
    const obj: any = {};
    cols.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj;
  });
}

// Criar tarefa para um lead
tasksRouter.post('/leads/:id/tasks', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { description, dueDate, userId } = req.body;
    if (typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'Descrição da tarefa é obrigatória.' });
    }
    if (!isWithinMaxLength(description, 500)) {
      return res
        .status(400)
        .json({ error: 'Descrição da tarefa é longa demais (máx. 500 caracteres).' });
    }
    const db = await getDatabase();
    const leadRes = await db.exec(`SELECT id FROM leads WHERE id = ?`, [id]);
    if (leadRes.length === 0 || leadRes[0].values.length === 0) {
      return res.status(404).json({ error: 'Lead não encontrado.' });
    }
    const insertRes = await db.exec(
      `INSERT INTO tasks (lead_id, user_id, description, due_date, status) VALUES (?, ?, ?, ?, 'pending') RETURNING *`,
      [id, userId || null, description.trim(), dueDate || null],
    );
    const task = mapRows(insertRes)[0];
    await logActivity(db, {
      leadId: id,
      userId,
      action: 'task_created',
      toValue: description.trim(),
    });
    saveDatabase();
    res.status(201).json(task);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Falha ao criar tarefa.' });
  }
});

// Listar tarefas de um lead (mais recentes / pendentes primeiro)
tasksRouter.get('/leads/:id/tasks', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();
    const result = await db.exec(
      `SELECT * FROM tasks WHERE lead_id = ?
       ORDER BY (status = 'pending') DESC, due_date ASC NULLS LAST, created_at DESC`,
      [id],
    );
    res.json(mapRows(result));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar tarefa (status, descrição ou data) — nunca DELETE: histórico de tarefas
// fica preservado mesmo quando canceladas, mesma filosofia usada para os leads.
tasksRouter.put('/tasks/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, description, dueDate, userId } = req.body;

    const sets: string[] = [];
    const params: any[] = [];

    if (status !== undefined) {
      if (!VALID_TASK_STATUS.includes(status)) {
        return res
          .status(400)
          .json({ error: `status deve ser um de: ${VALID_TASK_STATUS.join(', ')}` });
      }
      sets.push('status = ?');
      params.push(status);
      sets.push('completed_at = ?');
      params.push(status === 'done' ? new Date().toISOString() : null);
    }
    if (description !== undefined) {
      if (typeof description !== 'string' || !description.trim()) {
        return res.status(400).json({ error: 'Descrição da tarefa não pode ficar vazia.' });
      }
      if (!isWithinMaxLength(description, 500)) {
        return res
          .status(400)
          .json({ error: 'Descrição da tarefa é longa demais (máx. 500 caracteres).' });
      }
      sets.push('description = ?');
      params.push(description.trim());
    }
    if (dueDate !== undefined) {
      sets.push('due_date = ?');
      params.push(dueDate || null);
    }
    if (sets.length === 0) {
      return res.status(400).json({ error: 'Nada para atualizar.' });
    }

    const db = await getDatabase();
    const beforeRes = await db.exec(`SELECT lead_id, status FROM tasks WHERE id = ?`, [id]);
    if (beforeRes.length === 0 || beforeRes[0].values.length === 0) {
      return res.status(404).json({ error: 'Tarefa não encontrada.' });
    }
    const [leadId, previousStatus] = beforeRes[0].values[0];

    params.push(id);
    await db.run(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, params);
    if (status !== undefined && status !== previousStatus) {
      await logActivity(db, {
        leadId,
        userId,
        action: 'task_status_changed',
        fromValue: previousStatus,
        toValue: status,
      });
    }
    saveDatabase();

    const afterRes = await db.exec(`SELECT * FROM tasks WHERE id = ?`, [id]);
    res.json(mapRows(afterRes)[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Falha ao atualizar tarefa.' });
  }
});

// Painel do vendedor: todas as suas tarefas, de todos os leads, consolidadas
// (para a tela de acompanhamento — atrasadas, de hoje, próximas, concluídas).
tasksRouter.get('/users/:userId/tasks', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const db = await getDatabase();
    const result = await db.exec(
      `SELECT t.*, l.name AS lead_name, l.company AS lead_company
       FROM tasks t
       JOIN leads l ON l.id = t.lead_id
       WHERE t.user_id = ?
       ORDER BY (t.status = 'pending') DESC, t.due_date ASC NULLS LAST, t.created_at DESC`,
      [userId],
    );
    res.json(mapRows(result));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Painel gerencial: tarefas de TODOS os vendedores, agrupáveis por vendedor no
// front — restrito a admin/gestor (um vendedor comum só vê as próprias em /users/:userId/tasks).
tasksRouter.get('/tasks', requireManager, async (_req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const result = await db.exec(
      `SELECT t.*, l.name AS lead_name, l.company AS lead_company, u.name AS user_name
       FROM tasks t
       JOIN leads l ON l.id = t.lead_id
       LEFT JOIN users u ON u.id = t.user_id
       WHERE t.status != 'cancelled'
       ORDER BY (t.status = 'pending') DESC, t.due_date ASC NULLS LAST, t.created_at DESC`,
    );
    res.json(mapRows(result));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
