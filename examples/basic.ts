/**
 * @file examples/basic.ts
 * @description Basic usage of the log-wiz singleton.
 * Run: npx ts-node examples/basic.ts
 */
import { wiz } from '../src/index.js';

// ── Simple messages at various levels ───────────────────────────────────────
wiz.info('Application started');
wiz.debug('Loaded config', { meta: { env: 'development', pid: process.pid } });
wiz.warn('High memory usage', { meta: { usedMB: 512, thresholdMB: 400 } });

// ── Correlation ID (pass-through per call) ───────────────────────────────────
wiz.info('Processing request', {
  correlationId: 'req-abc-123',
  meta: { method: 'POST', path: '/api/users', ip: '127.0.0.1' },
});

// ── Automatic PII masking ────────────────────────────────────────────────────
wiz.info('User login attempt', {
  meta: {
    username: 'alice',
    password: 'hunter2',      // → [MASKED]
    token: 'bearer-xyz',      // → [MASKED]
    authorization: 'Basic …', // → [MASKED]
    email: 'alice@example.com',
  },
});

// ── Error logging with stack-trace parsing ────────────────────────────────────
try {
  const obj = null as unknown as { prop: string };
  console.log(obj.prop); // throws TypeError
} catch (err) {
  wiz.error('Unexpected runtime error', { error: err as Error });
}
