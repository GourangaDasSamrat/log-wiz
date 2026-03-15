# Configuration Reference

Every `Wiz` instance accepts a `WizConfig` object. All fields are optional.

```typescript
import { Wiz } from '@gouranga_samrat/log-wiz';
import type { WizConfig } from '@gouranga_samrat/log-wiz';

const logger = new Wiz({
  level:                    'info',
  scope:                    'api',
  correlationId:            'worker-1',
  format:                   'pretty',
  maskedKeys:               ['nationalId'],
  replaceDefaultMaskedKeys: false,
  omitTimestamp:            false,
  file: {
    dir:            './logs',
    maxFiles:       7,
    asyncBuffer:    true,
    bufferSize:     100,
    flushIntervalMs: 1000,
  },
});
```

---

## Top-Level Options

### `level`
**Type:** `'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'none'`
**Default:** `'info'`

Minimum severity to output. Entries below this level are silently dropped.
Set to `'none'` to completely silence the logger with zero overhead.

```typescript
new Wiz({ level: 'debug' })  // shows debug and above
new Wiz({ level: 'none' })   // no-op — all calls return immediately
```

---

### `scope`
**Type:** `string`
**Default:** `undefined`

A label attached to every entry from this instance. Appears in all output formats.
Ideal for multi-instance setups where you need to tell loggers apart at a glance.

```typescript
const db   = new Wiz({ scope: 'database' });
const http = new Wiz({ scope: 'http' });
```

---

### `correlationId`
**Type:** `string`
**Default:** `undefined`

A static ID attached to every entry — useful for long-lived workers or background jobs.
Can be overridden per call by passing `{ correlationId }` in the options object.

```typescript
const worker = new Wiz({ correlationId: 'job-42' });
worker.info('Processing item');  // every entry carries correlationId: 'job-42'

// Per-call override:
worker.info('Handling request', { correlationId: req.id });
```

---

### `format`
**Type:** `'pretty' | 'json' | 'browser'`
**Default:** auto-detected

Forces a specific output format. If omitted, log-wiz detects the environment:

| Condition | Auto-selected format |
|-----------|---------------------|
| `typeof window !== 'undefined'` | `'browser'` |
| `NODE_ENV=production` or `CI=true` | `'json'` |
| Everything else | `'pretty'` |

```typescript
new Wiz({ format: 'json' })   // always JSON, even in development
new Wiz({ format: 'pretty' }) // always coloured, even in production
```

---

### `maskedKeys`
**Type:** `readonly string[]`
**Default:** `[]`

Extra keys to mask on top of the built-in defaults. Key matching is
case-insensitive and ignores `-`, `_`, and spaces.

```typescript
new Wiz({ maskedKeys: ['nationalId', 'driverLicense'] })
```

---

### `replaceDefaultMaskedKeys`
**Type:** `boolean`
**Default:** `false`

When `true`, the built-in default masked keys are **replaced** by `maskedKeys`
rather than extended. Only the keys you list will be masked.

```typescript
new Wiz({
  maskedKeys: ['internalRef'],
  replaceDefaultMaskedKeys: true,
  // now ONLY 'internalRef' is masked — 'password', 'token', etc. are visible
})
```

---

### `omitTimestamp`
**Type:** `boolean`
**Default:** `false`

When `true`, the `timestamp` field is set to an empty string in all output.
Useful for deterministic snapshot testing.

```typescript
new Wiz({ omitTimestamp: true })
```

---

## File Transport Options (`file`)

Pass a `FileTransportOptions` object to enable daily log rotation (Node.js only).
Pass `false` to disable file output entirely.

```typescript
new Wiz({ file: false })         // console only
new Wiz({ file: {} })            // file output with all defaults
new Wiz({ file: { dir: '/var/log/myapp', maxFiles: 30 } })
```

### `file.dir`
**Type:** `string` **Default:** `'logs'`

Directory where log files are written. Created automatically if it does not exist.

### `file.maxFiles`
**Type:** `number` **Default:** `7`

Number of daily log files to retain. Files older than this are deleted automatically
whenever a day rollover occurs.

### `file.asyncBuffer`
**Type:** `boolean` **Default:** `true`

When `true`, log writes are batched in memory and flushed in bulk.
Significantly reduces disk I/O for high-throughput applications.

### `file.bufferSize`
**Type:** `number` **Default:** `100`

Number of entries to accumulate before triggering an automatic flush.
Only relevant when `asyncBuffer: true`.

### `file.flushIntervalMs`
**Type:** `number` **Default:** `1000`

Maximum milliseconds between flushes. Ensures entries are written even if
`bufferSize` is never reached. Only relevant when `asyncBuffer: true`.

---

## Runtime Reconfiguration

Call `setConfig()` to merge updates into the running instance without
creating a new one. Rebuilds transports automatically when `format` or
`file` changes.

```typescript
const logger = new Wiz({ level: 'info' });

// Increase verbosity at runtime (e.g. triggered by a signal)
process.on('SIGUSR1', () => logger.setConfig({ level: 'debug' }));
// Silence during test teardown
logger.setConfig({ level: 'none' });
```

---

## TypeScript — Full Config Type

```typescript
import type { WizConfig, FileTransportOptions } from '@gouranga_samrat/log-wiz';

const fileOpts: FileTransportOptions = {
  dir: './logs',
  maxFiles: 14,
  asyncBuffer: true,
  bufferSize: 200,
  flushIntervalMs: 500,
};

const config: WizConfig = {
  level: 'debug',
  scope: 'worker',
  file: fileOpts,
};

const logger = new Wiz(config);
```
