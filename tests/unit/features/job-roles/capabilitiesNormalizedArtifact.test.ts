import { describe, expect, it } from 'vitest';
import { CAPABILITY_CATALOG } from '../../../../src/config/capability-catalog';
import { getToolBinding } from '../../../../src/features/job-roles/config/tool-bindings';
import artifact from '../../../../src/features/job-roles/catalog/capabilities.normalized.json' with { type: 'json' };

// Guarda de deriva: o artefato gerado por scripts/capability-import/build-capability-catalog.ts
// precisa refletir capability-catalog.ts + tool-bindings.ts. Se falhar, rode o gerador.
describe('capabilities.normalized.json', () => {
  it('cobre exatamente o CAPABILITY_CATALOG', () => {
    expect(artifact.capabilities.map((c) => c.code)).toEqual(CAPABILITY_CATALOG.map((c) => c.code));
    expect(artifact.summary.total).toBe(CAPABILITY_CATALOG.length);
  });

  it('description e binding batem com capability-catalog.ts / tool-bindings.ts', () => {
    for (const c of CAPABILITY_CATALOG) {
      const entry = artifact.capabilities.find((a) => a.code === c.code);
      expect(entry?.description, c.code).toBe(c.description);
      const b = getToolBinding(c.code);
      const expected = b
        ? {
            toolCode: b.toolCode,
            available: b.available,
            reason: b.reason,
            verification: b.verification,
            evidencePath: b.evidencePath,
          }
        : null;
      expect(entry?.binding, c.code).toEqual(expected);
    }
  });
});
