// scripts/security/credential-envelope.ts
//
// Envelope `enc:v1:<iv>:<authTag>:<ciphertext>` (AES-256-GCM) — mesmo formato de
// src/lib/crypto/secretFields.ts — com a chave passada EXPLICITAMENTE (sem src/config/env.ts, sem
// chave de dev). Puro: usado pelo reencrypt (rotação/--verify) e pelo backfill (--verify e checagem
// de legibilidade) para que os dois scripts classifiquem valores do mesmo jeito.

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
export const VERSION_PREFIX = 'enc:v1:';
/** Qualquer valor com este prefixo é tratado como cifrado (inclui versões futuras/desconhecidas). */
export const ENC_ANY_PREFIX = 'enc:';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export function decryptWithKey(stored: string, keyBuf: Buffer): string {
  if (!stored.startsWith(VERSION_PREFIX)) {
    return stored;
  }
  const parts = stored.slice(VERSION_PREFIX.length).split(':');
  if (parts.length !== 3) {
    throw new Error('Formato de envelope inválido.');
  }
  const [ivB64, authTagB64, ciphertextB64] = parts;
  const decipher = createDecipheriv(ALGORITHM, keyBuf, Buffer.from(ivB64, 'base64'), {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, 'base64')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}

export function encryptWithKey(plaintext: string, keyBuf: Buffer): string {
  // IV de CSPRNG (antes: Math.random — IV previsível/repetível quebra a garantia do GCM).
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, keyBuf, iv, { authTagLength: AUTH_TAG_LENGTH });
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${VERSION_PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`;
}

/**
 * Classificação de um valor armazenado frente a UMA chave:
 * - `readable`: `enc:v1:` que decifra com a chave;
 * - `unreadable`: começa com `enc:` mas não decifra com a chave (chave errada, envelope corrompido
 *   ou versão desconhecida);
 * - `plaintext`: string não vazia sem prefixo `enc:` (legado em claro);
 * - `empty`: null/undefined/'' ou não-string — nada a cifrar.
 */
export type ValueClass = 'readable' | 'unreadable' | 'plaintext' | 'empty';

export function classifyValue(value: unknown, keyBuf: Buffer): ValueClass {
  if (typeof value !== 'string' || value.length === 0) return 'empty';
  if (!value.startsWith(ENC_ANY_PREFIX)) return 'plaintext';
  if (!value.startsWith(VERSION_PREFIX)) return 'unreadable';
  try {
    decryptWithKey(value, keyBuf);
    return 'readable';
  } catch {
    return 'unreadable';
  }
}

export interface VerifyCounts {
  readable: number;
  unreadable: number;
  plaintext: number;
}

export function emptyCounts(): VerifyCounts {
  return { readable: 0, unreadable: 0, plaintext: 0 };
}

export function addClass(counts: VerifyCounts, cls: ValueClass): void {
  if (cls === 'readable') counts.readable++;
  else if (cls === 'unreadable') counts.unreadable++;
  else if (cls === 'plaintext') counts.plaintext++;
}

/** Código de saída quando os dados têm problema (ilegíveis, pendentes, conflitos). 1 = pré-condição/crash. */
export const EXIT_DATA_ISSUES = 2;
