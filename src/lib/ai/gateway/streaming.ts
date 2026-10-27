/**
 * Streaming real de tokens — com fallback entre provedores antes do primeiro chunk.
 *
 * Tenta Groq primeiro. Se falhar antes do primeiro chunk com erro recuperável (429, 5xx, timeout),
 * tenta o próximo provedor na cadeia (OpenAI, LiteLLM, etc.). Quando ocorre fallback, emite uma
 * mensagem "Mudando para provedor mais rápido..." para informar o usuário.
 *
 * Uma vez que o primeiro chunk foi entregue ao chamador, não há mais fallback no meio do stream:
 * trocar de provedor significaria reiniciar a resposta do zero de forma visível para quem já está
 * lendo o texto parcial.
 *
 * Se todos os provedores falharem ou não estiverem configurados, lança — o chamador deve cair para
 * `getAiModel(...).invoke()` (sem streaming) nesse caso.
 *
 * Usado só onde a saída é texto livre (Chatbook, Relatórios IA) — nunca para JSON estruturado
 * (`invokeStructured`), que depende de ler a resposta inteira para validar/reparar o formato.
 */
import type { BaseMessage } from '@langchain/core/messages';
import { streamChatCompletionWithFallback } from './streaming-fallback.js';
import type { AiStreamChunk, AiStreamResult } from './types.js';

export async function* streamChatCompletion(
  messages: BaseMessage[],
  modelName: string,
  temperature: number,
  agentContext: string,
): AsyncGenerator<AiStreamChunk, AiStreamResult> {
  // Usa a implementação com fallback entre provedores
  return yield* streamChatCompletionWithFallback(messages, modelName, temperature, agentContext);
}
