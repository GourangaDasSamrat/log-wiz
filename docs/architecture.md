# Architecture

## Overview

```
User code
    │
    ▼
┌──────────────────────────────────────────────────────┐
│                    Wiz instance                       │
│                                                      │
│  ① Level filter   LOG_LEVEL_SEVERITY[call] ≥ config  │
│  ② PII masking    maskSensitiveData(meta, keys)       │
│  ③ Error parsing  parseError(err) → StackFrame[]      │
│  ④ Entry assembly immutable LogEntry object           │
└─────────────────────────┬────────────────────────────┘
                          │  LogEntry (readonly)
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   ConsolePretty    ConsoleJson      FileTransport
   (ANSI colours)   (NDJSON)       (daily rotation)
                                +  ConsoleBrowser
                                   (DevTools groups)
```

---

## Module Map

| Module | Path | Responsibility |
|--------|------|----------------|
| **Types** | `src/types/index.ts` | All public interfaces, `LogLevel`, `LogEntry`, `WizConfig`, `Transport` |
| **Wiz** | `src/core/wiz.ts` | Pipeline orchestration, level filter, transport factory, `setConfig` |
| **Masker** | `src/utils/masker.ts` | Recursive PII masking, WeakSet circular-ref guard, key normalisation |
| **ErrorParser** | `src/utils/error-parser.ts` | `Error` → `ParsedError` + `StackFrame[]` |
| **Timestamp** | `src/utils/timestamp.ts` | ISO-8601 via `Date.toISOString()`, pretty formatter |
| **Env** | `src/utils/env.ts` | Node/browser/production detection |
| **PrettyTransport** | `src/transports/console-pretty.ts` | ANSI-coloured multi-line dev output |
| **JsonTransport** | `src/transports/console-json.ts` | Single-line JSON for log aggregators |
| **BrowserTransport** | `src/transports/console-browser.ts` | Grouped DevTools output |
| **FileTransport** | `src/transports/file.ts` | Stream-based daily rotation + async buffer |

---

## Log Pipeline (per call)

Every call to `wiz.info(...)` (or any level method) passes through exactly
these five steps in order:

```
wiz.info('msg', { meta, error, correlationId })
      │
      ▼
① Level check
      LOG_LEVEL_SEVERITY['info'] >= LOG_LEVEL_SEVERITY[config.level]?
      No  → return immediately (no allocations, no work)
      Yes → continue
      │
      ▼
② Meta masking
      maskSensitiveData(options.meta, maskedKeySet)
      Deep-clones the object, replacing sensitive keys with '[MASKED]'
      WeakSet prevents stack overflow on circular references
      │
      ▼
③ Error parsing
      options.error ? parseError(options.error) : undefined
      Splits Error.stack into structured StackFrame[] objects
      │
      ▼
④ Entry assembly
      const entry: LogEntry = {
        timestamp, level, env, message,
        scope?, correlationId?, meta?, error?
      }   ← readonly, never mutated after construction
      │
      ▼
⑤ Transport dispatch
      for (const t of this.transports) t.write(entry)
      Each transport receives the same immutable entry
```

---

## Build Targets

log-wiz compiles to four output targets from a single TypeScript source tree:

| Target | Config | Output dir | Consumers |
|--------|--------|-----------|-----------|
| **ESM** | `tsconfig.esm.json` | `dist/esm/` | Modern bundlers (Vite, Rollup, esbuild) |
| **CJS** | `tsconfig.cjs.json` | `dist/cjs/` | Node.js `require()`, Jest, older tools |
| **Browser** | `tsconfig.browser.json` | `dist/browser/` | Browser bundles — `fs` excluded |
| **Types** | `tsconfig.types.json` | `dist/types/` | TypeScript declaration files only |

The `exports` field in `package.json` routes each consumer to the correct target:

```json
{
  "exports": {
    ".": {
      "types":   "./dist/types/index.d.ts",
      "browser": "./dist/browser/index.js",
      "import":  "./dist/esm/index.js",
      "require": "./dist/cjs/index.js"
    }
  }
}
```

---

## Tree-Shaking

`"sideEffects": false` in `package.json` tells bundlers the entire package
is side-effect-free. Combined with named exports, consumers only pay for what
they import:

```typescript
// Only the error-logging path is bundled — trace/debug/info/warn/fatal are dropped
import { Wiz } from '@gouranga_samrat/log-wiz';
const logger = new Wiz({ level: 'error', file: false });
```

The `FileTransport` is dynamically imported inside `Wiz` so it is completely
absent from browser bundles — `fs` and `path` never appear in the browser output.

---

## Multi-Instance Model

Each `new Wiz(config)` is a fully independent logger with its own:
- Level threshold
- Masked-key set
- Transport list
- Scope label
- Correlation ID

Instances do not share state. The default `wiz` singleton is simply
`new Wiz()` exported from `src/index.ts`.

---

## Adding a Custom Transport

Implement the `Transport` interface:

```typescript
import type { Transport, LogEntry } from '@gouranga_samrat/log-wiz';

export class SplunkTransport implements Transport {
  write(entry: LogEntry): void {
    // send JSON to Splunk HEC
    fetch(process.env['SPLUNK_HEC_URL']!, {
      method: 'POST',
      headers: { Authorization: `Splunk ${process.env['SPLUNK_TOKEN']}` },
      body: JSON.stringify({ event: entry }),
    });
  }

  flush(): void { /* no-op for HTTP */ }
  async close(): Promise<void> { /* drain pending requests */ }
}
```

Then inject it:

```typescript
import { Wiz } from '@gouranga_samrat/log-wiz';
const logger = new Wiz({ file: false });
(logger as any).transports.push(new SplunkTransport());
```
