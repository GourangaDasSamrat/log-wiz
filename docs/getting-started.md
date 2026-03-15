# Getting Started

## Installation

```bash
npm install @gouranga_samrat/log-wiz
# or
yarn add @gouranga_samrat/log-wiz
# or
pnpm add @gouranga_samrat/log-wiz
```

**Requirements:** Node.js ≥ 18 or any modern browser. Zero runtime dependencies.

---

## Your First Log

```typescript
import { wiz } from '@gouranga_samrat/log-wiz';

wiz.info('Server started', { meta: { port: 3000 } });
wiz.warn('Memory usage high', { meta: { usedMB: 480, limitMB: 512 } });
wiz.error('Request failed', { error: new Error('ECONNREFUSED') });
```

**Development output (pretty):**
```
█ INF  2024-05-15 14:32:01.123 Server started
  meta: { "port": 3000 }

█ WRN  2024-05-15 14:32:01.456 Memory usage high
  meta: { "usedMB": 480, "limitMB": 512 }

█ ERR  2024-05-15 14:32:01.789 Request failed
  Error: ECONNREFUSED
    at connect (src/db/client.ts:22:9)
```

**Production output (JSON, auto-selected when `NODE_ENV=production`):**
```json
{"timestamp":"2024-05-15T14:32:01.123Z","level":"info","env":"node","message":"Server started","meta":{"port":3000}}
```

---

## Using the Default Singleton

`wiz` is a pre-built instance with sensible defaults — no configuration required.

```typescript
import { wiz } from '@gouranga_samrat/log-wiz';

wiz.trace('entering function');
wiz.debug('parsed config', { meta: { entries: 12 } });
wiz.info('user signed in', { meta: { userId: 42 } });
wiz.warn('token expiring soon', { meta: { expiresIn: '5m' } });
wiz.error('upload failed', { error: new Error('413 Too Large') });
wiz.fatal('out of disk space — shutting down');
```

---

## Creating a Named Instance

For larger applications, create scoped instances per subsystem:

```typescript
import { Wiz } from '@gouranga_samrat/log-wiz';

const logger = new Wiz({
  scope: 'payment-service',
  level: 'debug',
  correlationId: 'worker-1',
});

logger.info('Processing charge', { meta: { amount: 9900, currency: 'USD' } });
// → ... [payment-service] {worker-1} Processing charge
```

---

## Log Levels

| Level   | When to use |
|---------|-------------|
| `trace` | Step-by-step debugging, very high volume |
| `debug` | Development diagnostics |
| `info`  | Normal operational events *(default minimum)* |
| `warn`  | Unexpected but recoverable conditions |
| `error` | An operation failed |
| `fatal` | Process-level failure, exit imminent |
| `none`  | Silence all output (no-op mode, zero overhead) |

```typescript
const logger = new Wiz({ level: 'warn' }); // drops trace/debug/info
```

---

## Automatic PII Masking

Sensitive fields are masked automatically — no extra code needed:

```typescript
wiz.info('Login attempt', {
  meta: {
    username: 'alice',
    password: 'hunter2',       // → [MASKED]
    token: 'eyJhbGci…',        // → [MASKED]
    email: 'alice@example.com' // visible — not a default masked key
  },
});
```

See [pii-masking.md](./pii-masking.md) for the full list of masked keys and customisation options.

---

## No-Op Mode (Silence All Logs)

```typescript
const logger = new Wiz({
  level: process.env.NODE_ENV === 'test' ? 'none' : 'info',
});
```

When `level: 'none'`, every log call returns immediately — no string formatting,
no masking, no I/O, true zero overhead.

---

## Graceful Shutdown

Always flush and close before your process exits to avoid losing buffered file logs:

```typescript
process.on('SIGTERM', async () => {
  await logger.close(); // flushes buffer, closes WriteStream
  process.exit(0);
});
```

---

## Next Steps

- [Configuration reference →](./configuration.md)
- [PII masking →](./pii-masking.md)
- [Transports →](./transports.md)
- [Architecture →](./architecture.md)
