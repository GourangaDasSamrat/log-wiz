/**
 * @file examples/multi-instance.ts
 * @description Multi-instance usage with named scopes and correlation IDs.
 * Run: npx ts-node examples/multi-instance.ts
 */
import { Wiz } from '../src/index.js';

// ── One instance per sub-system ───────────────────────────────────────────────
const dbLogger   = new Wiz({ scope: 'database', level: 'debug', file: false });
const httpLogger = new Wiz({ scope: 'http',     level: 'info',  file: false });
const authLogger = new Wiz({ scope: 'auth',     level: 'trace', file: false });

// ── Simulate an incoming HTTP request ────────────────────────────────────────
const requestId = `req-${Date.now()}`;

httpLogger.info('Incoming request', {
  correlationId: requestId,
  meta: { method: 'POST', path: '/login', userAgent: 'Mozilla/5.0' },
});

authLogger.debug('Validating credentials', {
  correlationId: requestId,
  meta: {
    username: 'bob',
    password: 's3cr3t',  // → [MASKED]
  },
});

dbLogger.debug('Executing query', {
  correlationId: requestId,
  meta: { query: 'SELECT id FROM users WHERE username = ?', params: ['bob'] },
});

authLogger.info('Login successful', {
  correlationId: requestId,
  meta: { userId: 42, sessionToken: 'tok-xyz' }, // token → [MASKED]
});

httpLogger.info('Response sent', {
  correlationId: requestId,
  meta: { statusCode: 200, durationMs: 12 },
});
