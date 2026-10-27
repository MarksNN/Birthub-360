import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z
    .string()
    .trim()
    .transform((v) => (v === '' ? '3005' : v))
    .default('3005')
    .refine((v) => /^[1-9][0-9]{0,4}$/.test(v), { message: 'Invalid PORT format' })
    .transform((v) => parseInt(v, 10))
    .refine((v) => v >= 1 && v <= 65535, { message: 'Invalid PORT range' })
});

describe('env.PORT validation', () => {
  it('should default to 3005 when not provided', () => {
    const result = envSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.PORT).toBe(3005);
  });

  it('should fallback to 3005 when provided as empty string', () => {
    const result = envSchema.safeParse({ PORT: '' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.PORT).toBe(3005);
  });

  it('should parse valid port strings into numbers', () => {
    const result = envSchema.safeParse({ PORT: '8080' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.PORT).toBe(8080);
  });

  it('should reject alphanumeric strings', () => {
    const result = envSchema.safeParse({ PORT: '3005abc' });
    expect(result.success).toBe(false);
  });

  it('should reject ports starting with 0', () => {
    const result = envSchema.safeParse({ PORT: '0123' });
    expect(result.success).toBe(false);
  });

  it('should reject out-of-range ports (>65535)', () => {
    const result = envSchema.safeParse({ PORT: '65536' });
    expect(result.success).toBe(false);
  });

  it('should reject negative ports', () => {
    const result = envSchema.safeParse({ PORT: '-3000' });
    expect(result.success).toBe(false);
  });

  it('should reject spaces and decimals', () => {
    const result1 = envSchema.safeParse({ PORT: '3000.5' });
    const result2 = envSchema.safeParse({ PORT: '30 00' });
    expect(result1.success).toBe(false);
    expect(result2.success).toBe(false);
  });
});
