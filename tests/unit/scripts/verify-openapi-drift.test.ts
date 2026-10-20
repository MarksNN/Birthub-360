import { describe, expect, it } from 'vitest';
import { resolveRouterLocalVarName } from '../../../scripts/verify-openapi-drift';

describe('resolveRouterLocalVarName', () => {
  it('resolve alias `export const nome = router;`', () => {
    const src = `const router = Router();\nrouter.get('/a', h);\nexport const fooRoutes = router;\n`;
    expect(resolveRouterLocalVarName(src, 'fooRoutes')).toBe('router');
  });

  it('resolve export direto `export const nome = Router();`', () => {
    const src = `export const fooRouter = Router();\nfooRouter.get('/a', h);\n`;
    expect(resolveRouterLocalVarName(src, 'fooRouter')).toBe('fooRouter');
  });

  it('resolve factory no mesmo arquivo (export function + deps tipados)', () => {
    const src = [
      'export function createPredictiveRoutes(deps?: {',
      '  oracle?: Oracle;',
      '}): Router {',
      '  const router = Router();',
      "  router.get('/cockpit', h);",
      '  return router;',
      '}',
      '',
      'export const predictiveRoutes = createPredictiveRoutes();',
    ].join('\n');
    expect(resolveRouterLocalVarName(src, 'predictiveRoutes')).toBe('router');
  });

  it('resolve factory no formato createXRouter() (ex.: createAccountIntelligenceRouter)', () => {
    const src = [
      'export function createAccountIntelligenceRouter(',
      '  service: AccountIntelligenceService = defaultService,',
      '): Router {',
      '  const router = Router();',
      "  router.get('/:id/intelligence', h);",
      '  return router;',
      '}',
      '',
      'export const accountIntelligenceRoutes = createAccountIntelligenceRouter();',
    ].join('\n');
    expect(resolveRouterLocalVarName(src, 'accountIntelligenceRoutes')).toBe('router');
  });

  it('resolve factory com express.Router() e nome de variável diferente', () => {
    const src = [
      'function createX() {',
      '  const r = express.Router();',
      "  r.post('/y', h);",
      '  return r;',
      '}',
      'export const xRoutes = createX();',
    ].join('\n');
    expect(resolveRouterLocalVarName(src, 'xRoutes')).toBe('r');
  });

  it('factory importada de outro arquivo → null (sem falso positivo)', () => {
    const src = `import { createX } from './x.js';\nexport const xRoutes = createX();\n`;
    expect(resolveRouterLocalVarName(src, 'xRoutes')).toBeNull();
  });

  it('factory com dois Router() → null (ambíguo)', () => {
    const src = [
      'function createX() {',
      '  const a = Router();',
      '  const b = Router();',
      '  return a;',
      '}',
      'export const xRoutes = createX();',
    ].join('\n');
    expect(resolveRouterLocalVarName(src, 'xRoutes')).toBeNull();
  });

  it('factory que não retorna o Router declarado → null', () => {
    const src = [
      'function createX() {',
      '  const r = Router();',
      '  return wrap(r);',
      '}',
      'export const xRoutes = createX();',
    ].join('\n');
    expect(resolveRouterLocalVarName(src, 'xRoutes')).toBeNull();
  });

  it('não confunde com Router() de outra função top-level declarada depois', () => {
    const src = [
      'function createX() {',
      '  return buildSomething();',
      '}',
      'function other() {',
      '  const r = Router();',
      '  return r;',
      '}',
      'export const xRoutes = createX();',
    ].join('\n');
    expect(resolveRouterLocalVarName(src, 'xRoutes')).toBeNull();
  });

  it('export desconhecido → null', () => {
    expect(resolveRouterLocalVarName('export const a = 1 + 2;', 'a')).toBeNull();
    expect(resolveRouterLocalVarName('const r = Router();', 'missing')).toBeNull();
  });
});
