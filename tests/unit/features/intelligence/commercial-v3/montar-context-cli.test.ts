import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const script = path.resolve(
  'src/features/intelligence/commercial-v3/assets/07_RUNTIME/MONTAR_CONTEXT.py',
);
const catalog = path.resolve(
  'src/features/intelligence/commercial-v3/assets/03_CATALOGO/INDICE_GERAL_463.json',
);

function pythonBin(): string | null {
  for (const bin of ['python', 'py', 'python3']) {
    const probe = spawnSync(bin, ['-c', 'print(1)'], { encoding: 'utf8' });
    if (probe.status === 0) return bin;
  }
  return null;
}

describe('MONTAR_CONTEXT.py — saída confinada', () => {
  const bin = pythonBin();

  it('grava só um nome de arquivo dentro de commercial-v3-out e rejeita travessia', () => {
    expect(bin, 'Python ausente no ambiente').toBeTruthy();
    const index = JSON.parse(readFileSync(catalog, 'utf8')) as {
      agents: Array<{ id: string; index: string }>;
    };
    const agent = index.agents[0];
    const agentIndex = JSON.parse(
      readFileSync(
        path.resolve('src/features/intelligence/commercial-v3/assets', agent.index),
        'utf8',
      ),
    ) as { skills: Array<{ id: string }> };
    const skillId = agentIndex.skills[0].id;
    const cwd = mkdtempSync(path.join(tmpdir(), 'montar-context-'));
    try {
      const ok = spawnSync(
        bin as string,
        [script, '--agent', agent.id, '--skill-id', skillId, '--output', 'ctx.txt'],
        { cwd, encoding: 'utf8' },
      );
      expect(ok.status).toBe(0);
      expect(ok.stdout).toContain(agent.id);
      const written = readFileSync(path.join(cwd, 'commercial-v3-out', 'ctx.txt'), 'utf8');
      expect(written).toContain('ÍNDICE OBRIGATÓRIO DE SKILLS');
      expect(readFileSync(path.join(cwd, 'commercial-v3-out', 'ctx.schema.json'), 'utf8')).toContain(
        'schemaVersion',
      );

      for (const unsafe of ['../ctx.txt', '/tmp/ctx.txt', 'nested/ctx.txt', '..', 'ctx txt']) {
        const rejected = spawnSync(
          bin as string,
          [script, '--agent', agent.id, '--skill-id', skillId, '--output', unsafe],
          { cwd, encoding: 'utf8' },
        );
        expect(rejected.status, unsafe).not.toBe(0);
      }
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
