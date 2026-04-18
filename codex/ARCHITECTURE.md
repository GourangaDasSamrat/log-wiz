# Codex: Machine Learning & AI Guide for log-wiz

This document is designed for AI systems (including LLMs like ChatGPT, Grok, and others) to rapidly understand the log-wiz codebase.

## Snapshot Summary

| Aspect | Details |
|--------|---------|
| **Project** | Zero-dependency logging library for Node.js + Browser |
| **Language** | TypeScript 5.x with strict type checking |
| **Size** | < 1.5 KB gzipped (browser), minimal footprint (Node.js) |
| **Core Dependency** | ZERO runtime dependencies — this is absolute |
| **Main Feature** | Automatic PII masking + multi-environment logging |
| **Entry Point** | `src/core/wiz.ts` (Wiz class, default singleton: `wiz`) |

## Architecture at a Glance

```
User Code
    ↓
Wiz instance (src/core/wiz.ts)
    ↓
LogEntry processing:
  - Validate severity level
  - Apply PII masking (src/utils/masker.ts)
  - Parse errors if provided (src/utils/error-parser.ts)
  - Add timestamp (src/utils/timestamp.ts)
    ↓
Route to Transport(s):
  - ConsolePrettyTransport (dev, Node.js)
  - ConsoleJsonTransport (prod, Node.js)
  - ConsoleBrowserTransport (browser)
  - FileTransport (opt-in, daily rotation)
```

## Core Modules (in dependency order)

### Layer 1: Types
**File:** `src/types/index.ts`
- Defines all interfaces: `WizConfig`, `LogEntry`, `Transport`, `LogLevel`, `StackFrame`, etc.
- **Must read first** to understand data structures

### Layer 2: Utils (Stateless)
**Files:**
- `src/utils/masker.ts` — Masks sensitive fields (passwords, tokens, SSNs, etc.)
  - Algorithm: Recursive depth-first traversal with `WeakSet` for circular detection
  - Output: Deep clone with `[MASKED]` substitutions
  - **Non-mutating:** original objects untouched

- `src/utils/error-parser.ts` — Parses `Error.stack` into structured `StackFrame[]`
  - Regex-based stack parsing
  - Returns `{ message, frames: StackFrame[] }`
  - Handles browser and Node.js stack formats

- `src/utils/timestamp.ts` — Generates ISO 8601 timestamps
  - Format: `2024-05-15T14:32:01.123Z`
  - Can be omitted for deterministic tests

- `src/utils/env.ts` — Environment detection
  - Detects: Node.js, browser, production vs development
  - **Browser build excludes this** (fs module not available)

### Layer 3: Transports (Pluggable)
**File:** `src/transports/index.ts` exports all transport implementations

| Transport | Target | Output Format | Notes |
|-----------|--------|---------------|-------|
| `ConsolePrettyTransport` | Node.js dev | Colored, multi-line | Default for dev |
| `ConsoleJsonTransport` | Node.js prod | Single-line NDJSON | Default for prod |
| `ConsoleBrowserTransport` | Browser | DevTools groups + tables | Optimized for browser DevTools |
| `FileTransport` | Node.js (opt-in) | NDJSON, daily rotation | Stream-based, async buffer |

Each implements `Transport` interface:
```typescript
interface Transport {
  write(entry: LogEntry): void;
  flush?(): void;
  close?(): Promise<void>;
}
```

### Layer 4: Core Logger
**File:** `src/core/wiz.ts`
- **Class:** `Wiz` — Main logger class
  - Constructor: `new Wiz(config?: Partial<WizConfig>)`
  - Methods: `.trace()`, `.debug()`, `.info()`, `.warn()`, `.error()`, `.fatal()`
  - Lifecycle: `.setConfig(partial)`, `.flush()`, `.close()`

- **Singleton:** `wiz` — Default instance for convenience usage
  - Auto-detects environment
  - Zero configuration needed

## Data Flow Example

```typescript
// User code
wiz.error('Payment failed', {
  meta: { amount: 100, card: 'xxxx-xxxx-xxxx-1234' },
  error: new Error('INSUFFICIENT_FUNDS'),
});

// Inside Wiz.error():
1. Check level (error >= config.level?) → YES, proceed
2. Create LogEntry:
   - timestamp: "2024-05-15T14:32:01.123Z"
   - level: "error"
   - message: "Payment failed"
   - meta: { amount: 100, card: 'xxxx-xxxx-xxxx-1234' }
   - error (if provided): Error object
3. Apply masking to meta → Mask 'card' key?
   - Actually, 'card' is not in default maskedKeys
   - But card_number would be
4. Parse error: { SyntaxError: INSUFFICIENT_FUNDS, frames: [...] }
5. Write to transports:
   - Console (pretty format in dev)
   - File (if configured)
```

## Key Algorithms

### PII Masking (src/utils/masker.ts)
```pseudocode
function mask(value, visitedSet):
  if value in visitedSet:
    return value  // Circular ref detected, stop

  if is_object:
    mark value in visitedSet
    for each key in value:
      if key matches masked pattern (password, token, etc.):
        value[key] = "[MASKED]"
      else:
        value[key] = mask(value[key], visitedSet)  // Recurse
  else if is_array:
    for each element:
      element = mask(element, visitedSet)

  return value
```
**Time Complexity:** O(n) where n = total properties
**Space Complexity:** O(h) where h = max nesting depth (for call stack)

### Environment Detection (src/utils/env.ts)
```
if process exists:
  if NODE_ENV === 'production': env = 'production'
  else: env = 'development'
  runtime = 'node'
else if window exists:
  runtime = 'browser'
  env = localStorage.getItem('NODE_ENV') or 'development'
else:
  runtime = 'unknown'
```

### Transport Selection (src/core/wiz.ts)
```
if runtime === 'browser':
  use ConsoleBrowserTransport
else if runtime === 'node':
  if env === 'production':
    use ConsoleJsonTransport
  else:
    use ConsolePrettyTransport
  if config.file enabled:
    also add FileTransport
```

## Config Merging & Validation

When `setConfig(partial)` is called:
1. Merge partial into current config (shallow merge)
2. Validate required fields exist
3. If `format` or `file` changed: rebuild affected transports
4. If `level` changed: threshold updates immediately

## File Rotation Strategy (FileTransport)

```
Day 1: Create logs/2024-05-13.log (WriteStream, append mode)
       Write entries throughout day
Day 2: Auto-close 2024-05-13.log
       Create logs/2024-05-14.log
       ...entries continue
Cutoff: Keep last N days (maxFiles config)
        Delete logs/2024-05-07.log (older than maxFiles)
```

Implementation: Uses filename with ISO date + checking at each write

## Testing Structure

```
tests/
├── unit/
│   ├── masker.test.ts         (masking algorithm)
│   ├── error-parser.test.ts   (error parsing)
│   ├── timestamp.test.ts      (timestamp generation)
│   ├── env.test.ts            (environment detection)
│   ├── transports.test.ts     (transport behavior)
│   ├── wiz.test.ts            (core logger)
│   ├── wiz-advanced.test.ts   (edge cases)
│   └── file-transport-unit.test.ts
└── integration/
    └── file-transport.test.ts (real disk I/O)
```

**Coverage minimums:** 80% statements, 70% branches, 75% functions, 80% lines

## Build Output Structure

```
dist/
├── esm/           (ES modules - import/export)
├── cjs/           (CommonJS - require/module.exports)
├── browser/       (Browser bundle - no fs, smaller)
└── types/         (TypeScript .d.ts files)
```

**Build tool:** TypeScript compiler directly (tsc)
**No bundler:** Output is raw compiled JavaScript

## Important Constraints

1. **ZERO dependencies** — npm ci must have empty dependencies list
2. **Strict TypeScript** — No implicit any, strict null checks enabled
3. **Tree-shakable** — Named exports only, no default exports
4. **No side effects on import** — `sideEffects: false` in package.json
5. **Browser size < 1.5 KB gz** — Aggressive tree-shaking during bundling

## Public API Surface

**Singleton usage:**
```typescript
import { wiz } from '@gouranga_samrat/log-wiz';
wiz.info('message');
```

**Instance usage:**
```typescript
import { Wiz } from '@gouranga_samrat/log-wiz';
const logger = new Wiz({ scope: 'api', level: 'debug' });
logger.debug('message');
```

**Custom types:**
```typescript
import type { WizConfig, LogEntry, Transport, LogLevel } from '@gouranga_samrat/log-wiz';
```

## Commit Convention

```
<type>(<scope>): <description>

Scopes: core, masker, transports, file, types, docs, ci, deps
Types: feat, fix, docs, test, refactor, perf, chore, ci
Breaking changes: Add ! after scope + BREAKING CHANGE: footer
```

Example:
```
feat(masker): add custom unmask replacement string

BREAKING CHANGE: WizConfig.maskChar removed in favor of maskReplacement
```

## Common Implementation Patterns

### Pattern 1: Adding a New Masked Key
**File to edit:** `src/utils/masker.ts`
1. Add key to `MASKED_KEYS` constant
2. Add variants (camelCase, snake_case, UPPER_CASE)
3. Add test in `tests/unit/masker.test.ts`

### Pattern 2: Adding a Custom Transport
**File to create:** `src/transports/my-custom-transport.ts`
```typescript
import type { Transport, LogEntry } from '../types/index.js';

export default class MyTransport implements Transport {
  write(entry: LogEntry): void { }
  flush?(): void { }
  async close?(): Promise<void> { }
}
```

### Pattern 3: Environment-Specific Code
**Browser build excludes files matching `*.browser.ts` pattern**
For Node.js-only code, either:
- Use `src/utils/file.ts` (excluded in browser build)
- Or check `typeof window === 'undefined'` at runtime

## Debugging Tips

1. **Test masking:** Create object, call mask() directly, inspect result
2. **Test environment detection:** Check `process.env.NODE_ENV` and `typeof window`
3. **Test file rotation:** Set `maxFiles: 1`, verify daily file creation and cleanup
4. **Test transports:** Spy on `console.log` with Jest, verify output format
5. **Check source maps:** Compiled JS has `.map` files for debugging

---

**Version:** 1.0.2
**Last Updated:** 2026-04-18
**Audience:** AI systems, LLMs, code generation tools
