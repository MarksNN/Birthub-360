import { type Request, type Response, Router } from 'express';
import { chatWithLLaMA3, checkOllamaConnection } from '../ai.js';
import { requireAuth } from '../auth.js';
import { getDatabase, saveDatabase } from '../db.js';
import { rateLimit } from '../middleware/rateLimit.js';

const heavyAiLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  message: 'Muitas chamadas de IA/enriquecimento em 1 minuto. Aguarde um instante.',
});

export const chatRouter = Router();

// 6. Ollama Status Check
chatRouter.post('/ollama/status', async (req: Request, res: Response) => {
  const { url = 'http://localhost:11434', model = 'llama3' } = req.body;
  const status = await checkOllamaConnection(url, model);
  res.json(status);
});

// 7. Chat with LLaMA3 / Interactive Assistant
chatRouter.post('/chat', heavyAiLimiter, requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId, message, aiConfig } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Mensagem não informada.' });
    }

    const db = await getDatabase();
    const effectiveSessionId = sessionId || `session-${Date.now()}`;
    const now = new Date().toISOString();

    // Ensure session exists
    const sessCheck = await db.exec(`SELECT id FROM chat_sessions WHERE id = ?`, [
      effectiveSessionId,
    ]);
    if (sessCheck.length === 0 || sessCheck[0].values.length === 0) {
      const modelTitle =
        aiConfig?.provider === 'ollama'
          ? aiConfig.ollamaModel || 'llama3'
          : aiConfig?.groqModel || 'gemini-3.7';
      await db.run(
        `
        INSERT INTO chat_sessions (id, title, model, created_at)
        VALUES (?, ?, ?, ?)
      `,
        [
          effectiveSessionId,
          `Conversa ${modelTitle} (${new Date().toLocaleDateString('pt-BR')})`,
          modelTitle,
          now,
        ],
      );
    }

    // Save user message to SQLite
    const userMsgId = `cmsg-u-${Date.now()}`;
    await db.run(
      `
      INSERT INTO chat_messages (id, session_id, role, content, model, created_at)
      VALUES (?, ?, 'user', ?, ?, ?)
    `,
      [userMsgId, effectiveSessionId, message, aiConfig?.ollamaModel || 'llama3', now],
    );

    // Fetch conversation history from SQLite
    const histRes = await db.exec(
      `SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC`,
      [effectiveSessionId],
    );
    const history: { role: string; content: string }[] = [];
    if (histRes.length > 0) {
      histRes[0].values.forEach((row) => {
        history.push({ role: row[0] as string, content: row[1] as string });
      });
    }

    // Call AI Engine (LLaMA3 Ollama / Groq / Gemini)
    const result = await chatWithLLaMA3(
      history.slice(-8, -1),
      message,
      aiConfig || {
        provider: 'ollama',
        ollamaUrl: 'http://localhost:11434',
        ollamaModel: 'llama3',
      },
    );

    // Save assistant response to SQLite
    const botMsgId = `cmsg-a-${Date.now()}`;
    await db.run(
      `
      INSERT INTO chat_messages (id, session_id, role, content, model, tokens, created_at)
      VALUES (?, ?, 'assistant', ?, ?, ?, ?)
    `,
      [
        botMsgId,
        effectiveSessionId,
        result.text,
        result.modelUsed,
        result.tokensEstimated,
        new Date().toISOString(),
      ],
    );

    saveDatabase();

    res.json({
      sessionId: effectiveSessionId,
      reply: result.text,
      modelUsed: result.modelUsed,
      tokensEstimated: result.tokensEstimated,
      userMessageId: userMsgId,
      assistantMessageId: botMsgId,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Chat Sessions & Messages List
chatRouter.get('/chat/sessions', async (_req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const result = await db.exec(`
      SELECT s.*, 
        (SELECT COUNT(*) FROM chat_messages m WHERE m.session_id = s.id) as messages_count,
        (SELECT content FROM chat_messages m WHERE m.session_id = s.id ORDER BY m.created_at DESC LIMIT 1) as last_message
      FROM chat_sessions s
      ORDER BY s.created_at DESC
    `);

    if (result.length === 0) return res.json([]);
    const cols = result[0].columns;
    const sessions = result[0].values.map((row) => {
      const obj: any = {};
      cols.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });
    res.json(sessions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

chatRouter.get('/chat/sessions/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();
    const result = await db.exec(
      `SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC`,
      [id],
    );

    if (result.length === 0) return res.json([]);
    const cols = result[0].columns;
    const messages = result[0].values.map((row) => {
      const obj: any = {};
      cols.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });
    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
