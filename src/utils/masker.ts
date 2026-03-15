/**
 * @file src/utils/masker.ts
 * @description PII & sensitive-data masking utility with circular-reference protection.
 */

/** Keys that are masked in all output by default. */
export const DEFAULT_MASKED_KEYS: ReadonlySet<string> = new Set([
  'password',
  'passwd',
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
  'authorization',
  'cookie',
  'card_number',
  'cardnumber',
  'cvv',
  'ssn',
  'apikey',
  'api_key',
  'privatekey',
  'private_key',
]);

const MASK_VALUE = '[MASKED]';

/**
 * Deep-clones a value, replacing any key in `maskedKeys` with `'[MASKED]'`.
 * Uses a WeakSet to detect and break circular references safely.
 */
export function maskSensitiveData(
  value: unknown,
  maskedKeys: ReadonlySet<string>,
  seen: WeakSet<object> = new WeakSet(),
): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  // value is narrowed to object — assign once to avoid repeated casts
  const obj = value as Record<string, unknown>;

  // Circular reference guard
  if (seen.has(obj)) {
    return '[Circular]';
  }
  seen.add(obj);

  if (Array.isArray(obj)) {
    const result = (obj as unknown[]).map((item) => maskSensitiveData(item, maskedKeys, seen));
    seen.delete(obj);
    return result;
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    const normalizedKey = key.toLowerCase().replace(/[-_\s]/g, '');
    if (maskedKeys.has(normalizedKey) || maskedKeys.has(key.toLowerCase())) {
      result[key] = MASK_VALUE;
    } else {
      result[key] = maskSensitiveData(val, maskedKeys, seen);
    }
  }
  seen.delete(obj);
  return result;
}

/**
 * Builds the effective set of masked keys from config.
 */
export function buildMaskedKeySet(
  customKeys: readonly string[] = [],
  replaceDefaults = false,
): ReadonlySet<string> {
  const base = replaceDefaults ? new Set<string>() : new Set(DEFAULT_MASKED_KEYS);
  for (const k of customKeys) {
    base.add(k.toLowerCase().replace(/[-_\s]/g, ''));
    base.add(k.toLowerCase());
  }
  return base;
}
