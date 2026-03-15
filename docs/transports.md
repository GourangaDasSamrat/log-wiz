# Transports

A **transport** is any object that receives a fully-resolved `LogEntry` and
writes it somewhere. log-wiz ships four transports out of the box.

---

## Transport Interface

```typescript
import type { Transport, LogEntry } from '@gouranga_samrat/log-wiz';

interface Transport {
  write(entry: LogEntry): void;   // called for every entry that passes the level filter
  flush?(): void;                  // drain any in-memory buffer synchronously
  close?(): Promise<void>;         // release resources (file handles, timers, etc.)
}
```

---

## Built-in Transports

### 1. ConsolePrettyTransport

**Auto-selected in development** (`NODE_ENV` ≠ `production`, not in browser).

Rich multi-line output using native ANSI escape codes — zero dependencies.

```
█ INF  2024-05-15 14:32:01.123 [auth] {req-abc} User signed in
  meta: {
    "userId": 42,
    "sessionExpiry": "2024-05-16T00:00:00.000Z"
  }

█ ERR  2024-05-15 14:32:02.456 [db] Query failed
  TypeError: Cannot read properties of null (reading 'rows')
    at executeQuery   (src/db/client.ts:42:12)
    at UserRepository (src/repos/user.ts:18:5)
    at AuthService    (src/services/auth.ts:31:20)
```

**Console routing:**

| Level | Console method |
|-------|---------------|
| `trace` `debug` `info` | `console.log` |
| `warn` | `console.warn` |
| `error` `fatal` | `console.error` |

---

### 2. ConsoleJsonTransport

**Auto-selected in production** (`NODE_ENV=production` or `CI=true`).

Single-line NDJSON per entry, optimised for log aggregators.

```json
{"timestamp":"2024-05-15T14:32:01.123Z","level":"info","env":"node","scope":"auth","correlationId":"req-abc","message":"User signed in","meta":{"userId":42}}
{"timestamp":"2024-05-15T14:32:02.456Z","level":"error","env":"node","scope":"db","message":"Query failed","error":{"name":"TypeError","message":"Cannot read properties of null"}}
```

Works out of the box with **ELK Stack**, **Datadog**, **New Relic**, **Splunk**,
**Google Cloud Logging**, and any NDJSON-compatible log aggregator.

---

### 3. ConsoleBrowserTransport

**Auto-selected in browser environments** (`typeof window !== 'undefined'`).

Uses the DevTools console API for a clean, grouped experience:

- Entries **without** metadata: single line with emoji level badge
- Entries **with** metadata or error: `console.groupCollapsed` — click to expand

```
ℹ️ INFO   2024-05-15 14:32:01.123 [auth] Component mounted    ← collapsed
▶ ⚠️ WARN   2024-05-15 14:32:01.456 [auth] Token expiring      ← expandable
    meta { expiresIn: '5m' }
```

Works in Chrome DevTools, Firefox DevTools, and any standard browser console.

---

### 4. FileTransport *(Node.js only)*

Stream-based daily log rotation using `fs.createWriteStream`.

```
logs/
├── 2024-05-13.log   ← auto-pruned when maxFiles exceeded
├── 2024-05-14.log   ← auto-pruned
└── 2024-05-15.log   ← today — active WriteStream (append mode)
```

**Key properties:**
- Non-blocking `fs.createWriteStream` with `flags: 'a'`
- Async write buffer — batches entries, flushes every N entries or T ms
- Seamless midnight rollover with no dropped entries
- Automatic pruning of old files when `maxFiles` is exceeded
- One JSON object per line (NDJSON)

```typescript
import { Wiz } from '@gouranga_samrat/log-wiz';

const logger = new Wiz({
  file: {
    dir:            './logs',
    maxFiles:       7,      // keep 1 week
    asyncBuffer:    true,
    bufferSize:     100,    // flush every 100 entries …
    flushIntervalMs: 1000,  // … or every 1 s
  },
});

// Flush before exit
process.on('SIGTERM', async () => {
  await logger.close();
  process.exit(0);
});
```

Disable entirely with `file: false`.

---

## Format Auto-Detection

| Condition checked (in order) | Transport selected |
|------------------------------|-------------------|
| `typeof window !== 'undefined'` | `ConsoleBrowserTransport` |
| `NODE_ENV === 'production'` or `CI === 'true'` | `ConsoleJsonTransport` |
| Everything else | `ConsolePrettyTransport` |

Override with `format: 'pretty' | 'json' | 'browser'`.

---

## Writing a Custom Transport

Any object implementing the `Transport` interface works:

```typescript
import type { Transport, LogEntry } from '@gouranga_samrat/log-wiz';
import { Wiz } from '@gouranga_samrat/log-wiz';

class DatadogTransport implements Transport {
  private queue: string[] = [];

  write(entry: LogEntry): void {
    this.queue.push(JSON.stringify(entry));
    if (this.queue.length >= 25) this.flush();
  }

  flush(): void {
    if (!this.queue.length) return;
    const batch = this.queue.splice(0);
    fetch('https://http-intake.logs.datadoghq.com/api/v2/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': process.env['DD_API_KEY'] ?? '',
      },
      body: JSON.stringify(batch),
    });
  }

  async close(): Promise<void> {
    this.flush();
  }
}

// Inject after construction
const logger = new Wiz({ file: false, format: 'json' });
(logger as any).transports.push(new DatadogTransport());
```

---

## Using Multiple Transports

Transports are not exclusive. You can have console + file + a custom sink
all active at the same time — every transport receives every entry that
passes the level filter.

```typescript
import { Wiz } from '@gouranga_samrat/log-wiz';

const logger = new Wiz({
  level: 'info',
  format: 'json',   // console → JSON
  file: {           // file transport also active
    dir: './logs',
    maxFiles: 7,
  },
});

// Add a third custom transport
(logger as any).transports.push(new DatadogTransport());
```
