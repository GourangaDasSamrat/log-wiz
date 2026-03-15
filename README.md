<div align="center">

# 🧙 log-wiz

**The ultra-lightweight, high-performance logger for Node.js and Browser**  
*with automatic PII masking and zero dependencies.*

[![npm version](https://img.shields.io/npm/v/@gouranga_samrat/log-wiz?style=flat-square&color=crimson)](https://www.npmjs.com/package/@gouranga_samrat/log-wiz)
[![CI](https://img.shields.io/github/actions/workflow/status/GourangaDasSamrat/log-wiz/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/GourangaDasSamrat/log-wiz/actions)
[![Coverage](https://img.shields.io/badge/coverage-80%25%2B-brightgreen?style=flat-square)](https://github.com/GourangaDasSamrat/log-wiz)
[![Bundle size](https://img.shields.io/badge/gzipped-%3C1.5KB-blue?style=flat-square)](https://github.com/GourangaDasSamrat/log-wiz)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Zero dependencies](https://img.shields.io/badge/dependencies-0-success?style=flat-square)](package.json)

</div>

---

## Why log-wiz?

| Feature | log-wiz | winston | pino |
|---|:---:|:---:|:---:|
| Zero runtime dependencies | ✅ | ❌ | ❌ |
| Automatic PII masking | ✅ | ❌ | ❌ |
| Browser-native (< 1.5 KB gz) | ✅ | ❌ | ⚠️ |
| Circular-reference safe | ✅ | ⚠️ | ✅ |
| Structured stack-trace parsing | ✅ | ❌ | ⚠️ |
| Multi-instance + scoped loggers | ✅ | ✅ | ✅ |
| Daily file rotation built-in | ✅ | plugin | ✅ |
| No-op mode (zero overhead) | ✅ | ⚠️ | ⚠️ |
| Tree-shakable exports | ✅ | ❌ | ❌ |

---

## Installation

```bash
npm install @gouranga_samrat/log-wiz
# or
yarn add @gouranga_samrat/log-wiz
# or
pnpm add @gouranga_samrat/log-wiz
```

---

## Quick Start

```typescript
import { wiz } from '@gouranga_samrat/log-wiz';

wiz.info('Server started', { meta: { port: 3000 } });
wiz.warn('Rate limit approaching', { meta: { current: 980, limit: 1000 } });
wiz.error('DB connection failed', { error: new Error('ECONNREFUSED') });
```

**Output (development — pretty):**

```
█ INF  2024-05-15 14:32:01.123 Server started
  meta: { "port": 3000 }
```

**Output (production — JSON):**

```json
{"timestamp":"2024-05-15T14:32:01.123Z","level":"info","env":"node","message":"Server started","meta":{"port":3000}}
```

---

## Log Levels

Levels are ordered by severity. Setting a level filters out everything below it.

| Level   | Severity | Use case |
|---------|:--------:|----------|
| `trace` | 10 | Extremely verbose, step-by-step debugging |
| `debug` | 20 | Development diagnostics |
| `info`  | 30 | Normal operational events (default minimum) |
| `warn`  | 40 | Something unexpected but recoverable |
| `error` | 50 | An operation failed |
| `fatal` | 60 | Process-level failure, exit imminent |
| `none`  | ∞  | **No-op mode** — zero output, zero overhead |

```typescript
import { Wiz } from '@gouranga_samrat/log-wiz';

const logger = new Wiz({ level: 'warn' });

logger.debug('ignored');   // dropped — below threshold
logger.info('ignored');    // dropped
logger.warn('logged ✓');
logger.error('logged ✓');
```

---

## Configuration

```typescript
import { Wiz } from '@gouranga_samrat/log-wiz';

const logger = new Wiz({
  // Minimum level to output. 'none' = silence everything.
  level: 'info',

  // Named scope attached to every entry (useful for multi-instance setups).
  scope: 'payment-service',

  // Static correlation / request ID for this instance.
  correlationId: 'worker-1',

  // Force a specific output format (auto-detected if omitted).
  // 'pretty'  → coloured multi-line (default in dev)
  // 'json'    → single-line JSON    (default in production / CI)
  // 'browser' → grouped DevTools    (default in browser)
  format: 'pretty',

  // Extra keys to mask (merged with built-in defaults).
  maskedKeys: ['nationalId', 'internalToken'],

  // Set true to REPLACE the built-in defaults rather than extend them.
  replaceDefaultMaskedKeys: false,

  // File transport options (Node.js only). Pass false to disable.
  file: {
    dir: './logs',           // log directory
    maxFiles: 7,             // retain 7 daily files
    asyncBuffer: true,       // batch writes (non-blocking)
    bufferSize: 100,         // flush every 100 entries …
    flushIntervalMs: 1000,   // … or every 1 s
  },

  // Omit timestamps (handy for deterministic test output).
  omitTimestamp: false,
});
```

### Runtime reconfiguration

```typescript
// Dynamically change the level without creating a new instance
logger.setConfig({ level: 'debug' });
```

---

## Automatic PII Masking

log-wiz **recursively** scans every metadata object and replaces sensitive values with `[MASKED]`. It uses a `WeakSet` internally to detect and safely break circular references.

### Built-in masked keys

`password` · `passwd` · `token` · `accesstoken` · `refreshtoken` · `secret` · `authorization` · `cookie` · `card_number` · `cardnumber` · `cvv` · `ssn` · `apikey` · `api_key` · `privatekey` · `private_key`

Key matching is **case-insensitive** and ignores `-`, `_`, and spaces, so `API_KEY`, `apiKey`, and `api-key` all match.

### Example

```typescript
wiz.info('User authenticated', {
  meta: {
    userId: 42,
    username: 'alice',
    password: 'hunter2',          // → [MASKED]
    token: 'eyJhbGciOi…',         // → [MASKED]
    session: {
      cookie: 'sid=abc123',       // → [MASKED] (nested)
      expiresAt: '2024-12-31',
    },
  },
});
```

### Adding custom keys

```typescript
const logger = new Wiz({
  maskedKeys: ['nationalId', 'medicalRecordNumber'],
  // replaceDefaultMaskedKeys: true  ← use this to replace defaults entirely
});
```

---

## Error Logging & Stack Trace Parsing

Pass an `Error` object and log-wiz automatically parses the stack into readable, structured frames.

```typescript
try {
  await db.query('SELECT …');
} catch (err) {
  logger.error('Query failed', {
    error: err as Error,
    meta: { query: 'SELECT …', params: [userId] },
  });
}
```

**Pretty output:**

```
█ ERR  2024-05-15 14:32:01.123 Query failed
  TypeError: Cannot read properties of null
    at executeQuery  (src/db/client.ts:42:12)
    at UserService   (src/services/user.ts:18:5)
```

---

## Correlation IDs

Attach a correlation / request ID to link related log entries across services.

```typescript
// Instance-level (every entry from this logger carries the same ID)
const logger = new Wiz({ correlationId: 'worker-3' });

// Per-call override (takes precedence over the instance default)
logger.info('Processing request', { correlationId: req.headers['x-request-id'] });
```

---

## Multi-Instance / Scoped Loggers

```typescript
import { Wiz } from '@gouranga_samrat/log-wiz';

const dbLogger   = new Wiz({ scope: 'database', level: 'debug' });
const httpLogger = new Wiz({ scope: 'http',     level: 'info'  });
const authLogger = new Wiz({ scope: 'auth',     level: 'trace' });

// Each instance is fully independent — different levels, scopes, transports.
dbLogger.debug('Connection pool ready', { meta: { poolSize: 10 } });
httpLogger.info('GET /healthz → 200', { meta: { latencyMs: 2 } });
authLogger.warn('Failed login attempt', { meta: { ip: '1.2.3.4', attempts: 3 } });
```

---

## File Rotation (Node.js)

log-wiz writes to **daily log files** using `fs.createWriteStream` for non-blocking I/O.

```
logs/
├── 2024-05-13.log   (auto-pruned after maxFiles days)
├── 2024-05-14.log
└── 2024-05-15.log   ← today
```

```typescript
const logger = new Wiz({
  file: {
    dir: './logs',
    maxFiles: 14,          // keep two weeks
    asyncBuffer: true,
    bufferSize: 200,
    flushIntervalMs: 500,
  },
});

// Flush & close gracefully before process exit
process.on('SIGTERM', async () => {
  await logger.close();
  process.exit(0);
});
```

Disable file output entirely with `file: false`.

---

## Browser Support

In a browser environment log-wiz automatically:

1. Switches to `ConsoleBrowserTransport` (grouped DevTools output).
2. Strips all `fs`/`path` imports — the browser bundle is **< 1.5 KB gzipped**.
3. Uses `console.groupCollapsed` for entries with metadata, keeping the console clean.

```typescript
// Works identically in React, Vue, Svelte, etc.
import { wiz } from '@gouranga_samrat/log-wiz';
wiz.info('Component mounted', { meta: { component: 'UserProfile' } });
```

---

## No-Op Mode

Set `level: 'none'` to completely silence all output **without removing logger calls from your code**. The logger returns immediately on every call — zero string formatting, zero I/O.

```typescript
const logger = new Wiz({
  level: process.env.NODE_ENV === 'test' ? 'none' : 'info',
});
```

---

## Tree-Shaking

Import only the level methods you use — bundlers (Rollup, esbuild, webpack) will drop the rest.

```typescript
// Only ships the error-related code path
import { Wiz } from '@gouranga_samrat/log-wiz/core';
const logger = new Wiz({ level: 'error' });
export const logError = logger.error.bind(logger);
```

---

## TypeScript

log-wiz is written **entirely in TypeScript** and ships complete type declarations.

```typescript
import type { WizConfig, LogEntry, IWiz, LogLevel } from '@gouranga_samrat/log-wiz';

// Full IntelliSense on config
const config: WizConfig = { level: 'debug', scope: 'payments' };

// Typed log entries (useful for custom transports)
import type { Transport } from '@gouranga_samrat/log-wiz';
class MyTransport implements Transport {
  write(entry: LogEntry): void {
    sendToMyService(entry);
  }
}
```

---

## Custom Transports

```typescript
import { Wiz } from '@gouranga_samrat/log-wiz';
import type { Transport, LogEntry } from '@gouranga_samrat/log-wiz';

class DatadogTransport implements Transport {
  write(entry: LogEntry): void {
    fetch('https://http-intake.logs.datadoghq.com/api/v2/logs', {
      method: 'POST',
      headers: { 'DD-API-KEY': process.env.DD_API_KEY! },
      body: JSON.stringify(entry),
    });
  }
  flush(): void { /* no-op for HTTP */ }
}

// Inject by accessing the internal transports (advanced usage)
const logger = new Wiz({ file: false, format: 'json' });
(logger as any).transports.push(new DatadogTransport());
```

---

## API Reference

### `new Wiz(config?)`

Creates a new logger instance. See [Configuration](#configuration) for all options.

### `wiz.{level}(message, options?)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `message` | `string` | Primary log message |
| `options.correlationId` | `string` | Overrides instance `correlationId` for this call |
| `options.meta` | `Record<string, unknown>` | Structured metadata (deep-masked) |
| `options.error` | `Error` | Error object to parse and attach |

### `wiz.setConfig(partial)`

Merges `partial` into the current config at runtime. Rebuilds transports when `format` or `file` changes.

### `wiz.flush()`

Flushes all transport buffers synchronously. Call before `process.exit()`.

### `async wiz.close()`

Flushes buffers and releases all transport resources (file handles, timers). Await before exit.

---

## Contributing

```bash
git clone https://github.com/GourangaDasSamrat/log-wiz.git
cd log-wiz
npm install
npm test              # run all tests
npm run test:coverage # with coverage report
npm run build         # compile all targets
```

Please open an issue before submitting a pull request for large changes.

---

## License

MIT © [GourangaDasSamrat](https://github.com/GourangaDasSamrat)
