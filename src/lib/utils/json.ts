import { z, ZodSchema } from 'zod';

/**
 * Safely parses a JSON string. Returns null on failure instead of throwing.
 */
export function safeJsonParse<T = unknown>(value: string | null | undefined): T | null {
  if (value === null || value === undefined || value === '') return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/**
 * Safely parses a JSON string and validates against a Zod schema.
 * Returns the validated result or null.
 */
export function safeJsonParseWithSchema<T>(
  value: string | null | undefined,
  schema: ZodSchema<T>
): T | null {
  const parsed = safeJsonParse(value);
  if (parsed === null) return null;
  const result = schema.safeParse(parsed);
  return result.success ? result.data : null;
}

/**
 * Safely stringifies a value to JSON. Returns null on failure.
 */
export function safeJsonStringify(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}
