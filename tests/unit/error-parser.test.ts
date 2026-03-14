import { parseError } from '../../src/utils/error-parser';

describe('parseError', () => {
  it('extracts name and message', () => {
    const err = new Error('something went wrong');
    const parsed = parseError(err);
    expect(parsed.name).toBe('Error');
    expect(parsed.message).toBe('something went wrong');
  });

  it('extracts name from custom error subclasses', () => {
    class DatabaseError extends Error {
      constructor(msg: string) {
        super(msg);
        this.name = 'DatabaseError';
      }
    }
    const parsed = parseError(new DatabaseError('conn refused'));
    expect(parsed.name).toBe('DatabaseError');
  });

  it('parses stack frames', () => {
    const err = new Error('test');
    const parsed = parseError(err);
    expect(Array.isArray(parsed.stack)).toBe(true);
    expect(parsed.stack!.length).toBeGreaterThan(0);
    expect(parsed.stack![0]).toHaveProperty('raw');
  });

  it('handles errors without stack gracefully', () => {
    // Construct an error-like object with no stack
    const err = Object.create(Error.prototype) as Error;
    err.name = 'Error';
    err.message = 'no stack';
    // stack is simply absent (never set)
    const parsed = parseError(err);
    expect(parsed.stack).toBeUndefined();
  });

  it('preserves original error message in output', () => {
    const err = new TypeError('expected string');
    const parsed = parseError(err);
    expect(parsed.message).toBe('expected string');
    expect(parsed.name).toBe('TypeError');
  });
});
