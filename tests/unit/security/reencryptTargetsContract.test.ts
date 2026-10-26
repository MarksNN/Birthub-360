// @vitest-environment node
/**
 * Agente 15 — CONTRATO (B2 do parecer do 24 no PR #107): o alvo da rotação de chave não pode
 * divergir do que a app cifra. Antes, TARGET_MODELS era cópia à mão e esqueceu
 * CopilotoTranscriptSegment.text; e usava o nome do MODEL como tabela, então Account
 * (`@@map("account")`) saía "[PULADO]" e os tokens OAuth nunca eram rotacionados.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BYPASS_SCOPE_MODELS,
  TARGET_MODELS,
  tableTargetFor,
} from '../../../scripts/security/reencrypt-credentials.js';
import { ENCRYPTED_MODEL_FIELDS as FROM_SOURCE } from '../../../src/lib/crypto/encryptedModelFields.js';
import { ENCRYPTED_MODEL_FIELDS as FROM_EXTENSION } from '../../../src/lib/crypto/piiFields.js';

const ROOT = join(__dirname, '../../..');
const schema = readFileSync(join(ROOT, 'prisma/schema.prisma'), 'utf8');

function modelBlock(name: string): string | null {
  const m = new RegExp(`^model ${name} \\{([\\s\\S]*?)^\\}`, 'm').exec(schema);
  return m ? m[1] : null;
}

describe('TARGET_MODELS = o que a extensão do Prisma cifra', () => {
  it('é exatamente ENCRYPTED_MODEL_FIELDS (mesmo objeto da extensão, não uma cópia)', () => {
    expect(TARGET_MODELS).toBe(FROM_SOURCE);
    expect(FROM_EXTENSION).toBe(FROM_SOURCE);
  });

  it('inclui CopilotoTranscriptSegment.text (o campo que faltava)', () => {
    expect(TARGET_MODELS.CopilotoTranscriptSegment).toEqual(['text']);
  });
});

describe('TARGET_MODELS × prisma/schema.prisma', () => {
  for (const [model, fields] of Object.entries(TARGET_MODELS)) {
    it(`${model}: tabela (@@map), colunas e escopo de tenant conferem`, () => {
      const block = modelBlock(model);
      expect(block, `model ${model} no schema`).not.toBeNull();
      const map = /@@map\("([^"]+)"\)/.exec(block as string)?.[1] ?? model;
      const target = tableTargetFor(model);
      expect(target.table).toBe(map);
      for (const f of fields) {
        const line = new RegExp(`^\\s+${f}\\s+String\\??(\\s.*)?$`, 'm').exec(block as string);
        expect(line, `${model}.${f} é String no schema`).not.toBeNull();
        // Script grava pelo nome do campo: um @map na coluna quebraria o UPDATE.
        expect(line?.[0] ?? '').not.toContain('@map(');
      }
      const hasOrg = /^\s+organizationId\s+String\b/m.test(block as string);
      expect(target.scope).toBe(hasOrg ? 'org' : 'bypass');
      expect(BYPASS_SCOPE_MODELS.includes(model)).toBe(!hasOrg);
    });
  }

  it('Setting tem organizationId (processado por tenant)', () => {
    expect(modelBlock('Setting')).toMatch(/^\s+organizationId\s+String\??/m);
  });
});

describe('quem cifra em src/ está coberto por algum alvo da rotação', () => {
  // Arquivo → alvo que a rotação cobre. Novo chamador = revisar a rotação e esta lista.
  const KNOWN: Record<string, string> = {
    'src/lib/crypto/secretFields.ts': 'definição de encryptField',
    'src/lib/crypto/piiFields.ts': 'ENCRYPTED_MODEL_FIELDS → TARGET_MODELS',
    'src/lib/prisma.ts': 'extensão do Prisma (encryptSensitiveFields) → TARGET_MODELS',
    'src/lib/integrations/integrationSettings.repository.ts': 'Setting (integration.* + legado bitrix)',
    'src/features/integrations/whatsapp/useRedisAuthState.ts': '--target=redis-wa-auth',
    'src/lib/security/credentialCrypto.ts': 'definição de encryptCredential (sem chamadores em src/)',
  };
  const CALL = /\b(encryptField|encryptCredential|encryptCredentialSync|encryptSensitiveFields)\(/;

  function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        if (name === '__tests__' || name === 'node_modules') continue;
        walk(p, out);
      } else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name)) out.push(p);
    }
    return out;
  }

  it('nenhum chamador desconhecido', () => {
    const callers = walk(join(ROOT, 'src'))
      .filter((f) => CALL.test(readFileSync(f, 'utf8')))
      .map((f) => relative(ROOT, f).split('\\').join('/'))
      .sort();
    expect(callers.filter((f) => !(f in KNOWN))).toEqual([]);
  });
});
