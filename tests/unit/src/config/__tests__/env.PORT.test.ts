import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z
    .string()
    .trim()
    .transform((v) => (v === '' ? '3005' : v))
    .default('3005')
    .refine((v) => /^[1-9][0-9]{0,4}$/.test(v), { message: 'Invalid PORT format' })
    .transform((v) => Number(v))
    .refine((v) => v >= 1 && v <= 65535, { message: 'Invalid PORT range' })
});

describe('env.PORT validation', () => {
  const checkSuccess = (input: any, expected: number) => {
    const result = envSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.PORT).toBe(expected);
  };

  const checkFailure = (input: any) => {
    const result = envSchema.safeParse(input);
    expect(result.success).toBe(false);
  };

  it('should default to 3005 when not provided', () => checkSuccess({}, 3005));
  it('should fallback to 3005 when provided as empty string', () => checkSuccess({ PORT: '' }, 3005));
  it('should parse valid port strings into numbers', () => checkSuccess({ PORT: '8080' }, 8080));

  it('should reject alphanumeric strings', () => checkFailure({ PORT: '3005abc' }));
  it('should reject ports starting with 0', () => checkFailure({ PORT: '0123' }));
  it('should reject out-of-range ports (>65535)', () => checkFailure({ PORT: '65536' }));
  it('should reject negative ports', () => checkFailure({ PORT: '-3000' }));

  it('should reject spaces and decimals', () => {
    checkFailure({ PORT: '3000.5' });
    checkFailure({ PORT: '30 00' });
  });
});
