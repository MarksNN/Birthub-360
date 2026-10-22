-- scripts/db/purge-expired-data.sql
-- Trigger e rotina de expurgo de dados para conformidade com retenção LGPD (Passo 15 / Agente 01A)

CREATE OR REPLACE FUNCTION purge_expired_lgpd_records()
RETURNS void AS $$
BEGIN
  -- Anonimiza leads e contatos com retenção expirada (> 2 anos sem interação comercial)
  UPDATE "Contact"
  SET 
    "name" = '[titular anonimizado — LGPD]',
    "email" = NULL,
    "phone" = NULL,
    "customFields" = '{}'::jsonb
  WHERE "updatedAt" < NOW() - INTERVAL '2 years'
    AND "name" != '[titular anonimizado — LGPD]';

  -- Remove mensagens de WhatsApp com mais de 1 ano
  DELETE FROM "WhatsAppMessage"
  WHERE "createdAt" < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;
