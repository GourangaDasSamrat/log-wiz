/**
 * @file examples/file-rotation.ts
 * @description Daily file rotation with custom retention and async buffer.
 * Run: npx ts-node examples/file-rotation.ts
 */
import { Wiz } from '../src/index.js';

const logger = new Wiz({
  scope: 'api-server',
  level: 'info',
  format: 'json', // structured JSON lines in the file
  file: {
    dir: './logs',
    maxFiles: 7,          // keep one week of logs
    asyncBuffer: true,
    bufferSize: 50,       // flush every 50 entries …
    flushIntervalMs: 500, // … or every 500 ms, whichever comes first
  },
});

// Simulate a burst of 200 log entries
for (let i = 0; i < 200; i++) {
  logger.info(`Request processed`, {
    meta: { requestId: `r-${i}`, latencyMs: Math.floor(Math.random() * 100) },
  });
}

logger.warn('Rate limit approaching', { meta: { current: 980, limit: 1000 } });
logger.error('Upstream timeout', {
  error: Object.assign(new Error('ETIMEDOUT'), { code: 'ETIMEDOUT' }),
  meta: { upstream: 'payments-service' },
});

// Graceful shutdown — flush buffer before exit
process.on('SIGINT', async () => {
  console.log('\nFlushing logs…');
  await logger.close();
  process.exit(0);
});

console.log('Writing 200 entries. Press Ctrl+C to flush & exit.');
