#!/usr/bin/env python3
"""Exercita as linhas novas de MONTAR_CONTEXT.py para o Cobertura do Sonar.

O teste Vitest prova o comportamento via spawn, mas o LCOV de JavaScript não
marca arquivo Python. Este script roda no mesmo processo do coverage:

    python -m coverage run --branch --source=src/features/intelligence/commercial-v3/assets/07_RUNTIME scripts/ci/cover-montar-context.py
    python -m coverage xml -o coverage/python/coverage.xml
"""
import importlib.util
import json
import os
import runpy
import shutil
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / 'src/features/intelligence/commercial-v3/assets/07_RUNTIME/MONTAR_CONTEXT.py'
ASSETS = ROOT / 'src/features/intelligence/commercial-v3/assets'


def load():
    spec = importlib.util.spec_from_file_location('montar_context_under_test', SCRIPT)
    if spec is None or spec.loader is None:
        raise SystemExit(f'não foi possível carregar {SCRIPT}')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def expect_value_error(fn, raw):
    try:
        fn(raw)
    except ValueError:
        return
    raise SystemExit(f'aceitou saída inválida: {raw!r}')


def cover_escape(module, confined, cwd: Path):
    """O nome passa na allowlist, mas resolve() sai de commercial-v3-out."""
    link = cwd / 'commercial-v3-out' / 'escape.txt'
    outside = cwd / 'outside-target'
    outside.mkdir(exist_ok=True)
    original = None
    try:
        link.symlink_to(outside / 'gone.txt')
    except OSError:
        original = module.Path.resolve

        def fake_resolve(self, *args, **kwargs):
            if getattr(self, 'name', '') == 'escape.txt':
                return outside / 'escape.txt'
            return original(self, *args, **kwargs)

        module.Path.resolve = fake_resolve
    try:
        expect_value_error(confined, 'escape.txt')
    finally:
        if original is not None:
            module.Path.resolve = original


def main():
    module = load()
    confined = module.confined_output
    for raw in (
        None,
        12,
        ' ctx.txt',
        'ctx.txt ',
        'a\x00b',
        '../ctx.txt',
        '/tmp/ctx.txt',
        'nested/ctx.txt',
        '.',
        '..',
        'ctx txt',
        '',
    ):
        expect_value_error(confined, raw)

    cwd = Path(tempfile.mkdtemp(prefix='montar-cov-'))
    previous = Path.cwd()
    os.chdir(cwd)
    try:
        target = confined('ctx.txt')
        if target.name != 'ctx.txt' or target.parent != (cwd / 'commercial-v3-out').resolve():
            raise SystemExit(f'saída inesperada: {target}')
        cover_escape(module, confined, cwd)

        catalog = json.loads((ASSETS / '03_CATALOGO/INDICE_GERAL_463.json').read_text(encoding='utf-8'))
        agent = catalog['agents'][0]
        agent_index = json.loads((ASSETS / agent['index']).read_text(encoding='utf-8'))
        skill_id = agent_index['skills'][0]['id']
        sys.argv = [str(SCRIPT), '--agent', agent['id'], '--skill-id', skill_id, '--output', 'cli.txt']
        runpy.run_path(str(SCRIPT), run_name='__main__')
        written = cwd / 'commercial-v3-out' / 'cli.txt'
        schema = cwd / 'commercial-v3-out' / 'cli.schema.json'
        if not written.is_file() or not schema.is_file():
            raise SystemExit('CLI não gravou cli.txt e o schema ao lado')
        if agent['id'] not in written.read_text(encoding='utf-8') and 'ÍNDICE OBRIGATÓRIO' not in written.read_text(encoding='utf-8'):
            raise SystemExit('CLI gravou contexto vazio')
    finally:
        os.chdir(previous)
        shutil.rmtree(cwd, ignore_errors=True)


if __name__ == '__main__':
    main()
