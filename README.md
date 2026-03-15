<div align="center">
  
# 🧙 log-wiz

**The ultra-lightweight, high-performance logger for Node.js and Browser**
**with automatic PII masking and zero dependencies.**

<br/>

[![npm version](https://img.shields.io/npm/v/@gouranga_samrat/log-wiz?style=flat-square&color=7c3aed&logo=npm&logoColor=white)](https://www.npmjs.com/package/@gouranga_samrat/log-wiz)
[![npm downloads](https://img.shields.io/npm/dm/@gouranga_samrat/log-wiz?style=flat-square&color=7c3aed&logo=npm&logoColor=white)](https://www.npmjs.com/package/@gouranga_samrat/log-wiz)
[![CI](https://img.shields.io/github/actions/workflow/status/GourangaDasSamrat/log-wiz/ci.yml?branch=main&style=flat-square&label=CI&logo=github-actions&logoColor=white)](https://github.com/GourangaDasSamrat/log-wiz/actions)
[![Coverage](https://img.shields.io/badge/coverage-80%25%2B-22c55e?style=flat-square&logo=jest&logoColor=white)](https://github.com/GourangaDasSamrat/log-wiz)
[![Bundle size](https://img.shields.io/badge/gzipped-%3C1.5KB-3b82f6?style=flat-square)](https://bundlephobia.com/package/@gouranga_samrat/log-wiz)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Zero dependencies](https://img.shields.io/badge/dependencies-0-22c55e?style=flat-square)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-f59e0b?style=flat-square)](LICENSE)

<br/>

**[📖 Full Documentation](https://GourangaDasSamrat.github.io/log-wiz-docs/)** &nbsp;·&nbsp;
**[🚀 Getting Started](https://GourangaDasSamrat.github.io/log-wiz-docs/guides/getting-started/)** &nbsp;·&nbsp;
**[📦 npm Package](https://www.npmjs.com/package/@gouranga_samrat/log-wiz)** &nbsp;·&nbsp;
**[🐛 Report a Bug](https://github.com/GourangaDasSamrat/log-wiz/issues)**

</div>

---

> [!TIP]
> **New here?** The [documentation site](https://GourangaDasSamrat.github.io/log-wiz-docs/) covers every feature in detail with interactive examples, a full API reference, and architecture diagrams. This README is a quick-reference summary.

---

## Table of Contents

- [Why log-wiz?](#why-log-wiz)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Log Levels](#log-levels)
- [Automatic PII Masking](#automatic-pii-masking)
- [Configuration](#configuration)
- [Transports](#transports)
- [Multi-Instance Loggers](#multi-instance-loggers)
- [File Rotation](#file-rotation)
- [Error Logging](#error-logging)
- [Correlation IDs](#correlation-ids)
- [Browser Support](#browser-support)
- [No-Op Mode](#no-op-mode)
- [TypeScript](#typescript)
- [Custom Transports](#custom-transports)
- [API Reference](#api-reference)
- [Contributing](#contributing)
- [License](#license)

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
| Built-in daily file rotation | ✅ | plugin | ✅ |
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

**Requirements:** Node.js ≥ 18 · TypeScript ≥ 4.7 (optional) · Any modern browser · **0 runtime dependencies**

---

## Quick Start

```typescript
import { wiz } from '@gouranga_samrat/log-wiz';

// Zero config — auto-detects environment
wiz.info('Server started', { meta: { port: 3000 } });
wiz.warn('Rate limit approaching', { meta: { current: 980, limit: 1000 } });
wiz.error('DB connection failed', { error: new Error('ECONNREFUSED') });
```

**Development output (pretty, coloured):**

```
█ INF  2024-05-15 14:32:01.123 Server started
  meta: { "port": 3000 }

█ ERR  2024-05-15 14:32:02.456 DB connection failed
  Error: ECONNREFUSED
    at connect (src/db/client.ts:22:9)
```

**Production output (compact JSON, auto-selected when `NODE_ENV=production`):**

```json
{"timestamp":"2024-05-15T14:32:01.123Z","level":"info","env":"node","message":"Server started","meta":{"port":3000}}
```

> [!NOTE]
> For full output examples, transport screenshots, and framework integrations (Express, Fastify, Next.js), see the **[Getting Started guide →](https://GourangaDasSamrat.github.io/log-wiz-docs/guides/getting-started/)**

---

## Log Levels

Levels are ordered by severity. Entries below the configured level are silently dropped with zero overhead.

| Level | Severity | Use case |
|-------|:--------:|----------|
| `trace` | 10 | Step-by-step debugging, very high volume |
| `debug` | 20 | Development diagnostics |
| `info` | 30 | Normal operational events *(default)* |
| `warn` | 40 | Unexpected but recoverable |
| `error` | 50 | An operation failed |
| `fatal` | 60 | Process-level failure, exit imminent |
| `none` | ∞ | **No-op mode** — zero output, zero overhead |

```typescript
const logger = new Wiz({ level: 'warn' }); // drops trace / debug / info
```

> [!NOTE]
> Full level reference with filtering examples → **[Log Levels →](https://GourangaDasSamrat.github.io/log-wiz-docs/guides/log-levels/)**

---

## Automatic PII Masking

The most painful part of logging is accidentally leaking secrets. log-wiz solves this natively — **no extra code required.**

```typescript
wiz.info('User login', {
  meta: {
    username:      'alice',
    password:      'hunter2',       // → [MASKED] automatically
    token:         'eyJhbGci...',   // → [MASKED] automatically
    authorization: 'Bearer xyz',    // → [MASKED] automatically
    email:         'alice@acme.com' // visible — not a default masked key
  },
});
```

**Built-in masked keys:** `password` · `token` · `secret` · `authorization` · `cookie` · `card_number` · `cvv` · `ssn` · `apikey` · `privatekey` — and their common variants (`snake_case`, `camelCase`, `UPPER_CASE`).

Masking is **recursive** (works on nested objects and arrays), **non-mutating** (original object untouched), and **circular-reference safe** (uses a `WeakSet` — never throws `RangeError`).

**Add custom keys:**

```typescript
const logger = new Wiz({
  maskedKeys: ['nationalId', 'medicalRecordNumber'],
});
```

> [!NOTE]
> Deep dive into masking behaviour, key normalisation, and replacing defaults → **[PII Masking →](https://GourangaDasSamrat.github.io/log-wiz-docs/guides/pii-masking/)**

---

## Configuration

```typescript
import { Wiz } from '@gouranga_samrat/log-wiz';

const logger = new Wiz({
  level:                    'info',         // minimum severity to output
  scope:                    'api',          // label shown on every entry
  correlationId:            'worker-1',     // static ID for this instance
  format:                   'pretty',       // 'pretty' | 'json' | 'browser' (auto-detected)
  maskedKeys:               ['nationalId'], // extra keys to mask
  replaceDefaultMaskedKeys: false,          // true = replace defaults, not extend
  omitTimestamp:            false,          // useful for deterministic tests
  file: {
    dir:             './logs',  // log directory (created automatically)
    maxFiles:        7,         // retain this many daily files
    asyncBuffer:     true,      // batch writes — non-blocking
    bufferSize:      100,       // flush every 100 entries...
    flushIntervalMs: 1000,      // ...or every 1 second
  },
});

// Reconfigure at runtime — no restart needed
logger.setConfig({ level: 'debug' });
```

> [!NOTE]
> Every option documented with types, defaults, and examples → **[Configuration Reference →](https://GourangaDasSamrat.github.io/log-wiz-docs/reference/configuration/)**

---

## Transports

log-wiz auto-detects your environment and picks the right transport:

| Environment | Auto-selected transport | Output style |
|---|---|---|
| Development (Node.js) | `ConsolePrettyTransport` | Rich ANSI colours, multi-line |
| Production / CI | `ConsoleJsonTransport` | Single-line NDJSON |
| Browser | `ConsoleBrowserTransport` | Grouped DevTools output |
| Node.js (any) | `FileTransport` | Daily rotating NDJSON files |

Override with `format: 'pretty' | 'json' | 'browser'`.

> [!NOTE]
> Transport details, custom transport API, and sink examples (Datadog, Splunk, Slack) → **[Transports →](https://GourangaDasSamrat.github.io/log-wiz-docs/guides/transports/)**

---

## Multi-Instance Loggers

Create fully independent loggers per subsystem — each with its own level, scope, masked keys, and transports:

```typescript
import { Wiz } from '@gouranga_samrat/log-wiz';

const dbLogger   = new Wiz({ scope: 'database', level: 'debug' });
const httpLogger = new Wiz({ scope: 'http',     level: 'info'  });
const authLogger = new Wiz({ scope: 'auth',     level: 'trace' });

dbLogger.debug('Connection pool ready', { meta: { poolSize: 10 } });
// → █ DBG  ... [database] Connection pool ready

httpLogger.info('GET /healthz → 200', { meta: { latencyMs: 2 } });
// → █ INF  ... [http] GET /healthz → 200
```

> [!NOTE]
> Scoped loggers, per-module pattern, and correlation across instances → **[Multi-Instance →](https://GourangaDasSamrat.github.io/log-wiz-docs/guides/multi-instance/)**

---

## File Rotation

Stream-based daily log rotation using `fs.createWriteStream` — non-blocking, no missed entries at rollover:

```
logs/
├── 2024-05-13.log   ← auto-pruned after maxFiles exceeded
├── 2024-05-14.log
└── 2024-05-15.log   ← active WriteStream (append mode)
```

```typescript
const logger = new Wiz({
  file: { dir: './logs', maxFiles: 7, asyncBuffer: true },
});

// Always flush before exit
process.on('SIGTERM', async () => {
  await logger.close();
  process.exit(0);
});
```

> [!NOTE]
> Async buffer, retention policy, graceful shutdown, and multi-directory setups → **[File Rotation →](https://GourangaDasSamrat.github.io/log-wiz-docs/guides/file-rotation/)**

---

## Error Logging

Pass an `Error` object and log-wiz automatically parses the stack trace into structured, readable frames:

```typescript
try {
  await db.query('SELECT ...');
} catch (err) {
  logger.error('Query failed', {
    error: err as Error,
    meta: { table: 'users', operation: 'SELECT' },
  });
}
```

**Output:**
```
█ ERR  2024-05-15 14:32:01.123 Query failed
  TypeError: Cannot read properties of null (reading 'rows')
    at executeQuery   (src/db/client.ts:42:12)
    at UserRepository (src/repos/user.ts:18:5)
```

---

## Correlation IDs

Trace a single request across all loggers and services:

```typescript
// Instance-level — every entry carries this ID
const logger = new Wiz({ correlationId: 'worker-3' });

// Per-call override
logger.info('Processing', { correlationId: req.headers['x-request-id'] });
```

---

## Browser Support

log-wiz works natively in the browser. The browser bundle is **< 1.5 KB gzipped** — all Node.js file-system code is excluded at the bundler level via the `browser` export condition.

```typescript
// React, Vue, Svelte, or vanilla — identical API
import { wiz } from '@gouranga_samrat/log-wiz';
wiz.info('Component mounted', { meta: { component: 'UserProfile' } });
```

> [!NOTE]
> SSR setup, global error handlers, and per-framework examples → **[Browser Usage →](https://GourangaDasSamrat.github.io/log-wiz-docs/guides/browser/)**

---

## No-Op Mode

Set `level: 'none'` to silence all output without removing any code. Every call returns immediately — zero allocations, zero I/O, true zero overhead.

```typescript
const logger = new Wiz({
  level: process.env.NODE_ENV === 'test' ? 'none' : 'info',
});
```

---

## TypeScript

log-wiz is written entirely in TypeScript and ships exhaustive type declarations. No `@types/` package needed.

```typescript
import type { WizConfig, LogEntry, IWiz, LogLevel, Transport } from '@gouranga_samrat/log-wiz';

// Full IntelliSense on config
const config: WizConfig = { level: 'debug', scope: 'payments' };

// Type your dependency injection
class PaymentService {
  constructor(private readonly logger: IWiz) {}
}

// Typed custom transport
class MyTransport implements Transport {
  write(entry: LogEntry): void { /* ... */ }
}
```

> [!NOTE]
> Full interface reference for every exported type → **[TypeScript Types →](https://GourangaDasSamrat.github.io/log-wiz-docs/reference/types/)**

---

## Custom Transports

Any object implementing the `Transport` interface works:

```typescript
import { Wiz } from '@gouranga_samrat/log-wiz';
import type { Transport, LogEntry } from '@gouranga_samrat/log-wiz';

class DatadogTransport implements Transport {
  private queue: LogEntry[] = [];

  write(entry: LogEntry): void {
    this.queue.push(entry);
    if (this.queue.length >= 25) this.flush();
  }

  flush(): void {
    if (!this.queue.length) return;
    fetch('https://http-intake.logs.datadoghq.com/api/v2/logs', {
      method: 'POST',
      headers: { 'DD-API-KEY': process.env['DD_API_KEY']! },
      body: JSON.stringify(this.queue.splice(0)),
    });
  }

  async close(): Promise<void> { this.flush(); }
}

const logger = new Wiz({ file: false });
(logger as any).transports.push(new DatadogTransport());
```

> [!NOTE]
> Sink examples for Datadog, Splunk, Slack, and in-memory testing → **[Custom Transports →](https://GourangaDasSamrat.github.io/log-wiz-docs/guides/custom-transports/)**

---

## API Reference

### `new Wiz(config?)`

Creates a new independent logger instance.

### `wiz.trace / .debug / .info / .warn / .error / .fatal(message, options?)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `message` | `string` | Primary human-readable message |
| `options.meta` | `Record<string, unknown>` | Structured metadata — deep-cloned and PII-masked |
| `options.error` | `Error` | Error object — stack parsed into `StackFrame[]` |
| `options.correlationId` | `string` | Overrides the instance `correlationId` for this call |

### `logger.setConfig(partial)`

Merges updates into the running instance. Rebuilds transports when `format` or `file` changes.

### `logger.flush()`

Synchronously drains all transport write buffers.

### `async logger.close()`

Flushes buffers and releases all resources (file handles, timers). Always `await` before `process.exit()`.

> [!NOTE]
> Complete API documentation with all parameter types, return values, and examples → **[API Reference →](https://GourangaDasSamrat.github.io/log-wiz-docs/reference/api/)**

---

## Contributing

Contributions, bug reports, and feature requests are welcome.

```bash
git clone https://github.com/GourangaDasSamrat/log-wiz.git
cd log-wiz
npm install
npm test              # 76 tests across 9 suites
npm run test:coverage # with coverage report
npm run build         # compiles ESM + CJS + browser + types
```

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request — it covers the commit convention, coding standards, and the zero-runtime-dependencies rule.

For security vulnerabilities, see [SECURITY.md](SECURITY.md) and use private reporting rather than opening a public issue.

---

## Documentation

The full documentation site is built with Astro + Starlight and hosted on GitHub Pages:

**[https://GourangaDasSamrat.github.io/log-wiz-docs/](https://GourangaDasSamrat.github.io/log-wiz-docs/)**

| Section | Description |
|---------|-------------|
| [Getting Started](https://GourangaDasSamrat.github.io/log-wiz-docs/guides/getting-started/) | Install and write your first log |
| [PII Masking](https://GourangaDasSamrat.github.io/log-wiz-docs/guides/pii-masking/) | How automatic masking works |
| [Transports](https://GourangaDasSamrat.github.io/log-wiz-docs/guides/transports/) | Built-in and custom transports |
| [Configuration](https://GourangaDasSamrat.github.io/log-wiz-docs/reference/configuration/) | Every option documented |
| [API Reference](https://GourangaDasSamrat.github.io/log-wiz-docs/reference/api/) | Complete method signatures |
| [TypeScript Types](https://GourangaDasSamrat.github.io/log-wiz-docs/reference/types/) | All exported interfaces |
| [Architecture](https://GourangaDasSamrat.github.io/log-wiz-docs/guides/architecture/) | How log-wiz works internally |

---

## License

MIT © 2025 [GourangaDasSamrat](https://github.com/GourangaDasSamrat)

---

<div align="center">

Made with ❤️ · [Documentation](https://GourangaDasSamrat.github.io/log-wiz-docs/) · [npm](https://www.npmjs.com/package/@gouranga_samrat/log-wiz) · [Issues](https://github.com/GourangaDasSamrat/log-wiz/issues)

</div>
