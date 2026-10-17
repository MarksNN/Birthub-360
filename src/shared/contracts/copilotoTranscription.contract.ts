/**
 * Contrato de composição para enfileiramento de transcrição do Copiloto IA.
 * Permite que features externas (ex: mobileFieldMeeting.service) solicitem
 * transcrição sem importar jobs/workers de copiloto-ia diretamente
 * (proibido por .dependency-cruiser.cjs, regra no-cross-feature-imports).
 *
 * A implementação concreta (`enqueueTranscribeConversationJob`) é registrada
 * no container de DI em `src/shared/di/setup.ts` — a raiz de composição do sistema.
 */
export interface TranscribeConversationJobInput {
  conversationId: string;
  organizationId: string;
}

export interface CopilotoTranscriptionQueuePort {
  enqueueTranscribeConversationJob(data: TranscribeConversationJobInput): Promise<void>;
}
