/**
 * Canonicalização determinística para hashing da cadeia de consentimento (Agente 15, F6).
 * - chaves de objeto ordenadas recursivamente; `undefined` omitido em objetos e `null` em arrays;
 * - strings normalizadas em Unicode NFC;
 * - `Date` serializado como ISO-8601 UTC (precisão de ms, compatível com timestamptz(3));
 * - `Map`, `Set`, funções, símbolos, bigint e números não finitos são rejeitados.
 */
export class CanonicalJsonError extends Error {}

export function canonicalJson(value: unknown): string {
  if (value === null) return 'null';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new CanonicalJsonError('Date inválida');
    return JSON.stringify(value.toISOString());
  }
  if (value instanceof Map || value instanceof Set) {
    throw new CanonicalJsonError('Map/Set não são permitidos no payload canônico');
  }
  switch (typeof value) {
    case 'string':
      return JSON.stringify(value.normalize('NFC'));
    case 'boolean':
      return JSON.stringify(value);
    case 'number':
      if (!Number.isFinite(value)) throw new CanonicalJsonError('Número não finito');
      return JSON.stringify(value);
    case 'object':
      break;
    default:
      throw new CanonicalJsonError(`Tipo não suportado: ${typeof value}`);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalJson(v === undefined ? null : v)).join(',')}]`;
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    throw new CanonicalJsonError('Somente objetos simples são permitidos');
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .map((k) => [k.normalize('NFC'), k] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  for (let i = 1; i < keys.length; i++) {
    if (keys[i][0] === keys[i - 1][0]) {
      throw new CanonicalJsonError('Colisão de chaves após normalização NFC');
    }
  }
  return `{${keys.map(([nk, k]) => `${JSON.stringify(nk)}:${canonicalJson(obj[k])}`).join(',')}}`;
}
