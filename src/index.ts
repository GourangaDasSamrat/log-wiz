/**
 * @file src/index.ts
 * @description Public API surface for log-wiz.
 *
 * Tree-shakable exports — import only what you need:
 *   import { wiz } from 'log-wiz';            // default singleton
 *   import { Wiz } from 'log-wiz';            // class for multi-instance
 *   import { wiz.error } from 'log-wiz';      // individual level
 */

export { Wiz } from './core/wiz.js';
export type {
  IWiz,
  WizConfig,
  LogLevel,
  LogEntry,
  LogCallOptions,
  Transport,
  FileTransportOptions,
  ParsedError,
  StackFrame,
} from './types/index.js';
export { LOG_LEVEL_SEVERITY } from './types/index.js';
export { DEFAULT_MASKED_KEYS, maskSensitiveData, buildMaskedKeySet } from './utils/masker.js';
export { parseError } from './utils/error-parser.js';

// ─── Default singleton instance ───────────────────────────────────────────────

import { Wiz } from './core/wiz.js';

/**
 * The default log-wiz singleton.
 * Auto-detects the environment and applies sensible defaults.
 *
 * @example
 * import { wiz } from 'log-wiz';
 * wiz.info('Server started', { meta: { port: 3000 } });
 */
export const wiz = new Wiz();
