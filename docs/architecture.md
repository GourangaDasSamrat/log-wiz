# log-wiz Architecture

## Overview

```
User code
    │
    ▼
┌──────────────────────────────────────┐
│             Wiz instance             │
│                                      │
│  1. Level filter (LOG_LEVEL_SEVERITY)│
│  2. PII masking (Masker utility)     │
│  3. Error parsing (ErrorParser)      │
│  4. LogEntry assembly                │
└──────────┬───────────────────────────┘
           │  LogEntry (immutable)
    ┌──────┼──────┐
    ▼      ▼      ▼
 Pretty  JSON  File
 Trans  Trans  Trans
  port   port   port
(ANSI) (1-line)(daily)
```

## Module Map

| Path | Responsibility |
|------|---------------|
| `src/types/index.ts` | All public interfaces & level constants |
| `src/core/wiz.ts` | Pipeline orchestration, transport factory |
| `src/utils/masker.ts` | Recursive PII masking with circular-ref guard |
| `src/utils/error-parser.ts` | `Error` → `ParsedError` + `StackFrame[]` |
| `src/utils/timestamp.ts` | ISO-8601 timestamps via `Date` |
| `src/utils/env.ts` | Node/browser/production detection |
| `src/transports/console-pretty.ts` | ANSI-coloured dev output |
| `src/transports/console-json.ts` | Single-line JSON for aggregators |
| `src/transports/console-browser.ts` | Grouped Chrome/Firefox DevTools |
| `src/transports/file.ts` | Stream-based daily rotation + async buffer |

## Log Pipeline (per call)

1. **Level check** — `LOG_LEVEL_SEVERITY[entry] >= LOG_LEVEL_SEVERITY[config]`
2. **Meta masking** — `maskSensitiveData(meta, maskedKeys)` deep-clones & redacts
3. **Error parsing** — `parseError(err)` extracts `name`, `message`, `StackFrame[]`
4. **Entry assembly** — immutable `LogEntry` object constructed
5. **Transport dispatch** — `transport.write(entry)` called on every registered transport

## Build Targets

| Target | tsconfig | Output | Use case |
|--------|----------|--------|----------|
| ESM | `tsconfig.esm.json` | `dist/esm/` | Modern bundlers |
| CJS | `tsconfig.cjs.json` | `dist/cjs/` | Node `require()` |
| Browser | `tsconfig.browser.json` | `dist/browser/` | Browser bundles (no fs) |
| Types | `tsconfig.types.json` | `dist/types/` | TypeScript consumers |

## Adding a Custom Transport

```typescript
import type { Transport, LogEntry } from 'log-wiz';

export class SplunkTransport implements Transport {
  write(entry: LogEntry): void {
    // send to Splunk HEC endpoint
  }
  async close(): Promise<void> {
    // flush pending HTTP requests
  }
}
```

Inject it after construction:

```typescript
import { Wiz } from 'log-wiz';
const logger = new Wiz({ file: false });
(logger as any).transports.push(new SplunkTransport());
```
