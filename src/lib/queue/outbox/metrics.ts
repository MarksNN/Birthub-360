import client from 'prom-client';

function counter(name: string, help: string) {
  return (
    (client.register.getSingleMetric(name) as client.Counter<'organization'> | undefined) ??
    new client.Counter({ name, help, labelNames: ['organization'] as const })
  );
}

export const outboxDeadLetterTotal = counter(
  'domain_event_outbox_dead_letter_total',
  'Eventos movidos para DEAD_LETTER.',
);
export const outboxRequeuedTotal = counter(
  'domain_event_outbox_requeued_total',
  'Eventos reenfileirados a partir da DLQ.',
);
export const outboxPurgedTotal = counter(
  'domain_event_outbox_purged_total',
  'Registros removidos pela retenção.',
);

/** Mascara PII óbvia (e-mail, telefones/documentos) e trunca mensagens de erro antes de persistir. */
export function sanitizeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return msg
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[num]')
    .slice(0, 2000);
}
