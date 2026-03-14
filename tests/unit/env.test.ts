/**
 * @file tests/unit/env.test.ts
 * @description Tests for environment detection utilities.
 */

import { isNode, isProduction, detectEnv } from '../../src/utils/env';

describe('isNode', () => {
  it('returns true in Node.js test environment', () => {
    expect(isNode()).toBe(true);
  });
});

describe('isProduction', () => {
  const originalEnv = process.env['NODE_ENV'];

  afterEach(() => {
    process.env['NODE_ENV'] = originalEnv;
    delete process.env['CI'];
  });

  it('returns false when NODE_ENV is development', () => {
    process.env['NODE_ENV'] = 'development';
    expect(isProduction()).toBe(false);
  });

  it('returns true when NODE_ENV is production', () => {
    process.env['NODE_ENV'] = 'production';
    expect(isProduction()).toBe(true);
  });

  it('returns true when CI env var is set', () => {
    process.env['NODE_ENV'] = 'test';
    process.env['CI'] = 'true';
    expect(isProduction()).toBe(true);
  });
});

describe('detectEnv', () => {
  it('returns "node" in a Node.js environment', () => {
    expect(detectEnv()).toBe('node');
  });
});
