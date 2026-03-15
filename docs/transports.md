# Transports

A **transport** is any object satisfying the `Transport` interface:

```typescript
interface Transport {
  write(entry: LogEntry): void;
  flush?(): void;
  close?(): Promise<void>;
}
```

## Built-in Transports

### ConsolePrettyTransport (default in development)

Rich, multi-line, colour-coded output using native ANSI escape codes.

```
█ INF  2024-05-15 14:32:01.123 [auth] {req-123} User logged in
  meta: {
    "userId": 42,
    "sessionExpiry": "2024-05-16"
  }
```

```
█ ERR  2024-05-15 14:32:02.456 Database query failed
  TypeError: Cannot read properties of null
    at executeQuery   (src/db/client.ts:42:12)
    at UserService    (src/services/user.ts:18:5)
```

**Routing:** `trace/debug/info` → `console.log`, `warn` → `console.warn`, `error/fatal` → `console.error`

---

### ConsoleJsonTransport (default in production / CI)

Single-line JSON per entry, optimised for log aggregators (ELK, Datadog, New Relic, Splunk).

```json
{"timestamp":"2024-05-15T14:32:01.123Z","level":"info","env":"node","scope":"auth","correlationId":"req-123","message":"User logged in","meta":{"userId":42}}
```

Auto-selected when `NODE_ENV=production` or `CI=true`.

---

### ConsoleBrowserTransport (default in browser)

Uses `console.groupCollapsed` to keep the DevTools console clean.

- Entries without meta/error: single collapsed line with emoji badge
- Entries with meta or error: expandable group showing structured data

Auto-selected when `typeof window !== 'undefined'`.

---

### FileTransport (Node.js only)

Stream-based daily log rotation:

```
logs/
├── 2024-05-13.log   (auto-pruned)
├── 2024-05-14.log   (auto-pruned)
└── 2024-05-15.log   (today — active WriteStream)
```

- **Non-blocking:** `fs.createWriteStream` with `flags: 'a'`
- **Async buffer:** batches entries, flushes every N entries or every T ms
- **Auto-rotation:** seamlessly rolls over at midnight
- **Auto-pruning:** deletes oldest files when `maxFiles` is exceeded
- **JSON format:** one entry per line (NDJSON)

```typescript
const logger = new Wiz({
  file: {
    dir: './logs',
    maxFiles: 7,
    asyncBuffer: true,
    bufferSize: 100,
    flushIntervalMs: 1000,
  },
});
```

Disable with `file: false`.

---

## Format Auto-Detection

| Environment | `NODE_ENV` / `CI` | Selected transport |
|---|---|---|
| Browser | — | `ConsoleBrowserTransport` |
| Node.js | `production` or `CI=true` | `ConsoleJsonTransport` |
| Node.js | anything else | `ConsolePrettyTransport` |

Override with `format: 'pretty' | 'json' | 'browser'`.

---

## Writing a Custom Transport

```typescript
import type { Transport, LogEntry } from 'log-wiz';
import { Wiz } from 'log-wiz';

class CloudWatchTransport implements Transport {
  private readonly buffer: string[] = [];

  write(entry: LogEntry): void {
    this.buffer.push(JSON.stringify(entry));
    if (this.buffer.length >= 25) this.flush();
  }

  flush(): void {
    if (!this.buffer.length) return;
    const batch = this.buffer.splice(0);
    // send batch to AWS CloudWatch Logs
    sendToCloudWatch(batch);
  }

  async close(): Promise<void> {
    this.flush();
  }
}

const logger = new Wiz({ file: false });
(logger as any).transports.push(new CloudWatchTransport());
```
