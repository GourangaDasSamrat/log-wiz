/**
 * @file src/utils/env.ts
 * @description Runtime environment detection helpers.
 */

/** Returns true when running in a browser context. */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}

/** Returns true when running in Node.js. */
export function isNode(): boolean {
  return typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
}

/** Returns true when NODE_ENV is 'production' or CI is set. */
export function isProduction(): boolean {
  if (isNode()) {
    return process.env['NODE_ENV'] === 'production' || Boolean(process.env['CI']);
  }
  return false;
}

/** Detects the current execution environment. */
export function detectEnv(): 'node' | 'browser' {
  return isBrowser() ? 'browser' : 'node';
}
