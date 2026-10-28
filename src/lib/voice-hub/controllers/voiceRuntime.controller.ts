import type { Request, Response } from 'express';
import { sessionManager } from '../../voice-runtime/SessionManager.js';
import type { AgentRuntimeConfig } from '../../voice-runtime/types.js';
import {
  getVoiceRuntimeConfig,
  resetVoiceRuntimeConfig,
  saveVoiceRuntimeConfig,
} from '../services/settingService.js';
import { voiceRuntimeSchema } from '../validators/index.js';

const DEFAULT_RUNTIME_CONFIG: AgentRuntimeConfig = {
  providerStt: 'whisper',
  providerLlm: 'OpenAI',
  providerTts: 'Voicebox',
  model: 'gpt-4o',
  fallbacks: ['Anthropic', 'GoogleGemini'],
  timeoutMs: 15000,
  retryCount: 3,
  temperature: 0.2,
  silenceThresholdMs: 800,
  speed: 1.0,
  bargeInEnabled: true,
  streamingEnabled: true,
};

function requireOrganizationId(req: Request, res: Response): string | undefined {
  const organizationId = req.organizationId;

  if (!organizationId) {
    res.status(401).json({ error: 'Organization context is required.' });
    return undefined;
  }

  return organizationId;
}

export async function getVoiceRuntimeHandler(req: Request, res: Response) {
  const organizationId = requireOrganizationId(req, res);
  if (!organizationId) return;

  const config = await getVoiceRuntimeConfig(organizationId, req.voiceHubUser?.id);
  return res.json({ config });
}

export async function createVoiceRuntimeHandler(req: Request, res: Response) {
  const organizationId = requireOrganizationId(req, res);
  if (!organizationId) return;

  const parsed = voiceRuntimeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const config = await saveVoiceRuntimeConfig(
    organizationId,
    req.voiceHubUser?.id,
    parsed.data.config,
    false,
  );

  return res.json({ success: true, config });
}

export async function updateVoiceRuntimeHandler(req: Request, res: Response) {
  const organizationId = requireOrganizationId(req, res);
  if (!organizationId) return;

  const parsed = voiceRuntimeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const config = await saveVoiceRuntimeConfig(
    organizationId,
    req.voiceHubUser?.id,
    parsed.data.config,
    true,
  );

  return res.json({ success: true, config });
}

export async function resetVoiceRuntimeHandler(req: Request, res: Response) {
  const organizationId = requireOrganizationId(req, res);
  if (!organizationId) return;

  await resetVoiceRuntimeConfig(organizationId, req.voiceHubUser?.id);
  return res.json({
    success: true,
    message: 'Configurações de voz restauradas ao padrão.',
  });
}

export async function createVoiceSessionHandler(req: Request, res: Response) {
  const organizationId = requireOrganizationId(req, res);
  if (!organizationId) return;

  const { agentId = 'agent_default', callerId = 'caller_web', configOverrides } = req.body || {};
  const runtimeConfig: AgentRuntimeConfig = {
    ...DEFAULT_RUNTIME_CONFIG,
    ...(configOverrides || {}),
  };

  const session = sessionManager.createSession(agentId, callerId, runtimeConfig, organizationId);

  await sessionManager.startSession(session.sessionId);

  return res.json({
    success: true,
    session: {
      sessionId: session.sessionId,
      agentId: session.agentId,
      callerId: session.callerId,
      status: session.status,
    },
  });
}

export async function interactVoiceSessionHandler(req: Request, res: Response) {
  const organizationId = requireOrganizationId(req, res);
  if (!organizationId) return;

  const { sessionId } = req.params;
  const { text } = req.body || {};

  if (!sessionId || !text) {
    return res.status(400).json({ error: 'sessionId e text são obrigatórios.' });
  }

  const session = sessionManager.getSession(sessionId);
  if (!session || session.tenantId !== organizationId) {
    return res.status(404).json({ error: 'Sessão não encontrada para esta organização.' });
  }

  await sessionManager.handleUserText(sessionId, text);

  const updatedSession = sessionManager.getSession(sessionId);
  const detectedIntents = sessionManager.getSessionIntents(sessionId);

  return res.json({
    success: true,
    status: updatedSession?.status,
    history: updatedSession?.history,
    detectedIntents,
  });
}

export async function endVoiceSessionHandler(req: Request, res: Response) {
  const organizationId = requireOrganizationId(req, res);
  if (!organizationId) return;

  const { sessionId } = req.params;
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId é obrigatório.' });
  }

  const session = sessionManager.getSession(sessionId);
  if (!session || session.tenantId !== organizationId) {
    return res.status(404).json({ error: 'Sessão não encontrada para esta organização.' });
  }

  sessionManager.endSession(sessionId);

  return res.json({
    success: true,
    message: 'Sessão de voz finalizada e follow-ups processados com sucesso.',
  });
}
