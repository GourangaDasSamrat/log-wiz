import { maskSensitiveData, buildMaskedKeySet, DEFAULT_MASKED_KEYS } from '../../src/utils/masker';

describe('maskSensitiveData', () => {
  const keys = buildMaskedKeySet();

  it('masks top-level sensitive keys', () => {
    const input = { username: 'alice', password: 's3cr3t' };
    const result = maskSensitiveData(input, keys) as typeof input;
    expect(result.username).toBe('alice');
    expect(result.password).toBe('[MASKED]');
  });

  it('masks nested sensitive keys', () => {
    const input = { user: { token: 'abc123', name: 'Bob' } };
    const result = maskSensitiveData(input, keys) as typeof input;
    expect((result.user as Record<string,unknown>).token).toBe('[MASKED]');
    expect((result.user as Record<string,unknown>).name).toBe('Bob');
  });

  it('handles arrays containing objects', () => {
    const input = [{ secret: 'x' }, { name: 'y' }];
    const result = maskSensitiveData(input, keys) as typeof input;
    expect((result[0] as Record<string,unknown>).secret).toBe('[MASKED]');
    expect((result[1] as Record<string,unknown>).name).toBe('y');
  });

  it('handles circular references without throwing', () => {
    const obj: Record<string, unknown> = { a: 1 };
    obj['self'] = obj;
    expect(() => maskSensitiveData(obj, keys)).not.toThrow();
    const result = maskSensitiveData(obj, keys) as Record<string, unknown>;
    expect(result['self']).toBe('[Circular]');
  });

  it('passes through primitives unchanged', () => {
    expect(maskSensitiveData(42, keys)).toBe(42);
    expect(maskSensitiveData('hello', keys)).toBe('hello');
    expect(maskSensitiveData(null, keys)).toBeNull();
    expect(maskSensitiveData(true, keys)).toBe(true);
  });

  it('does not mutate the original object', () => {
    const input = { password: 'secret' };
    maskSensitiveData(input, keys);
    expect(input.password).toBe('secret');
  });
});

describe('buildMaskedKeySet', () => {
  it('includes defaults by default', () => {
    const set = buildMaskedKeySet();
    expect(set.has('password')).toBe(true);
    expect(set.has('token')).toBe(true);
  });

  it('merges custom keys with defaults', () => {
    const set = buildMaskedKeySet(['mySecret']);
    expect(set.has('password')).toBe(true);
    expect(set.has('mysecret')).toBe(true);
  });

  it('replaces defaults when replaceDefaults=true', () => {
    const set = buildMaskedKeySet(['onlyThis'], true);
    expect(set.has('password')).toBe(false);
    expect(set.has('onlythis')).toBe(true);
  });

  it('exposes DEFAULT_MASKED_KEYS', () => {
    expect(DEFAULT_MASKED_KEYS.has('password')).toBe(true);
    expect(DEFAULT_MASKED_KEYS.has('token')).toBe(true);
    expect(DEFAULT_MASKED_KEYS.has('secret')).toBe(true);
  });
});
