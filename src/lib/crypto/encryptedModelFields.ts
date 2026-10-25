// src/lib/crypto/encryptedModelFields.ts
//
// Fonte ÚNICA da verdade de quais campos de quais models Prisma são cifrados em repouso
// (AES-256-GCM, envelope `enc:v1:` de secretFields.ts) pela extensão do Prisma em src/lib/prisma.ts
// (via piiFields.ts, que re-exporta este mapa). Módulo PURO, sem nenhum import, de propósito:
// scripts/security/reencrypt-credentials.ts deriva daqui a lista de models que a rotação da
// CREDENTIALS_ENCRYPTION_KEY percorre — e não pode importar piiFields.ts/secretFields.ts, que
// carregam src/config/env.ts (validação de env da app inteira + chave de dev fora de produção).
// Model novo aqui entra AUTOMATICAMENTE na rotação e no --verify (PR #107, B2 do Agente 24: a
// lista copiada à mão no script tinha esquecido CopilotoTranscriptSegment.text).
//
// Contexto de cada entrada (por que Contact tem índice cego, por que VoiceCallLog não etc.): ver o
// comentário de cabeçalho de piiFields.ts.
export const ENCRYPTED_MODEL_FIELDS: Readonly<Record<string, readonly string[]>> = {
  GoogleWorkspaceConnection: ['accessToken', 'refreshToken'],
  BitrixConnection: ['webhookUrl', 'webhookSecret'],
  // Credencial de PABX 3CX (Call Control API) — mesmo tratamento das duas linhas acima. Ver
  // .agents/handoffs/onda-5/01-para-06-persistencia-3cx-implementada.md.
  ThreeCXConnection: ['apiKey', 'apiSecret'],
  // Credencial do Birth Voices Hub (SDR de voz por IA) por organização — mesmo tratamento de
  // ThreeCXConnection acima. `webhookSecret` (ACH-06-01, isolamento de tenant do webhook —
  // birthVoice.webhook.ts) entrou aqui junto de `apiKey`: mesma classe de segredo, mesmo
  // tratamento — o comentário do campo no schema já dizia "cifrado em repouso" antes de o
  // campo existir de fato nesta lista.
  VoiceHubConnection: ['apiKey', 'webhookSecret'],
  // Credenciais de conectores externos (Slack, Stripe, Omie) — mesmo tratamento das demais
  // credenciais de integração acima.
  SlackConnection: ['webhookUrl', 'botToken'],
  StripeConnection: ['secretKey', 'webhookSecret'],
  OmieConnection: ['appKey', 'appSecret'],
  ExternalCrmConnection: ['config'],
  // Tokens OAuth de login social (Google/Microsoft via Better Auth, gravados por
  // prismaAdapter em src/lib/auth.ts) — mesma classe de credencial de terceiro das linhas
  // acima. Ver .agents/handoffs/roadmap-v2-onda-1/01-para-00-account-oauth-tokens-sem-cifra.md.
  Account: ['accessToken', 'refreshToken', 'idToken'],
  // PII direta de contato — ver comentário grande acima.
  Contact: ['email', 'phone', 'whatsapp'],
  // Conteúdo de chamada de voz (transcrição/resumo/URL de gravação) — mesma classe de sensibilidade
  // de Contact.email/phone/whatsapp (ACH-VOICE-004): um dump/leak de Postgres expunha em texto puro
  // o que foi dito numa ligação de vendas com um lead nomeado, enquanto o telefone/e-mail dessa
  // mesma pessoa já saía cifrado. Sem índice cego aqui: ao contrário de Contact, nenhum código deste
  // repositório faz WHERE de igualdade/contains sobre `transcript`/`summary`/`recordingUrl`
  // (confirmado por grep antes desta mudança) — só leitura direta por id/organizationId/leadId, que
  // continua funcionando normalmente porque a extensão do Prisma decifra na leitura como qualquer
  // outro campo desta lista.
  VoiceCallLog: ['transcript', 'summary', 'recordingUrl'],
  // Segmento de transcrição do Copiloto Comercial IA — mesmo raciocínio de VoiceCallLog acima,
  // mesma ausência de necessidade de índice cego (`text` só é lido por `conversationId`/id, nunca
  // filtrado por igualdade/substring). `CopilotoInsight.valueJson` fica FORA deste mapa de
  // propósito: é `Json`, não `String`, e o mecanismo genérico de `encryptSensitiveFields`/
  // `decryptSensitiveRecord` abaixo só cifra campos `string` — cifrar um Json exigiria serializar/
  // desserializar antes/depois da cifra, uma mudança de mecanismo maior que o escopo desta correção
  // (ACH-VOICE-004 pede só `VoiceCallLog`/`CopilotoTranscriptSegment`); a redação desse campo no
  // exercício de direito de exclusão (ver dataSubjectErasure.service.ts) já cobre o caso onde o
  // titular pede para os dados dele saírem do sistema, o que é diferente do risco de "backup vazou"
  // que a cifra em repouso mitiga.
  CopilotoTranscriptSegment: ['text'],
};
