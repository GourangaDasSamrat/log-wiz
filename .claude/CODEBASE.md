# Claude Codebase Guide for log-wiz

This guide helps Claude AI understand the log-wiz codebase structure, patterns, and implementation details.

## Quick Overview

**log-wiz** is a zero-dependency, lightweight logging library for Node.js and browsers with automatic PII masking.

- **Zero runtime dependencies** — this is a hard constraint
- **Automatic PII masking** — passwords, tokens, secrets are masked automatically
- **Multi-environment support** — Node.js, CommonJS, ES modules, browsers
- **Structured logging** — JSON output in production, pretty-printed in development
- **File rotation** — Daily log files with automatic rotation and cleanup

## Project Structure

```
log-wiz/
├── src/
│   ├── core/wiz.ts              # Main Wiz class — all logging logic
│   ├── transports/              # Output handlers (console, file, browser)
│   ├── types/index.ts           # All TypeScript interfaces and types
│   ├── utils/                   # Helper functions (masker, error-parser, etc.)
│   └── index.ts                 # Public API exports
├── tests/
│   ├── unit/                    # Unit tests for individual modules
│   └── integration/             # Integration tests (real disk I/O)
├── examples/                    # Runnable examples
└── docs/                        # Markdown documentation
```

## Key Files & Responsibility

### Core Logger (`src/core/wiz.ts`)

- Main `Wiz` class that receives all log calls
- Manages configuration, transports, and severity levels
- Routes entries to appropriate transports
- Handles flush and close lifecycle

### Types (`src/types/index.ts`)

- `WizConfig` — configuration interface
- `LogEntry` — the log entry structure
- `Transport` — interface for custom transports
- `LogLevel` — severity levels (trace, debug, info, warn, error, fatal, none)
- `IWiz` — public logger interface

### Utils (`src/utils/`)

- **masker.ts** — PII masking logic (recursive, non-mutating, circular-safe)
- **error-parser.ts** — Parses Error stacks into StackFrame[] for readable output
- **timestamp.ts** — ISO 8601 timestamps
- **env.ts** — Environment detection (NODE_ENV, runtime, etc.)

### Transports (`src/transports/`)

- **console-pretty.ts** — Development output (colored, multi-line)
- **console-json.ts** — Production output (compact NDJSON)
- **console-browser.ts** — Browser DevTools output (grouped, formatted)
- **file.ts** — File transport with daily rotation (only Node.js)

## Critical Patterns

### 1. **Zero-Dependency Rule**

- **NEVER** add any npm dependencies to `dependencies` in package.json
- Use only Node.js built-ins and browser APIs
- This is non-negotiable and will fail CI

### 2. **PII Masking**

- Happens in `src/utils/masker.ts` before any transport sees the data
- Uses a `WeakSet` to safely handle circular references
- Non-mutating — original objects are never modified
- Recursive — masks deeply nested values
- Configurable — users can add custom masked keys

### 3. **Multi-Environment Support**

The build outputs **4 targets**:

```bash
npm run build:esm          # ES modules → dist/esm/
npm run build:cjs          # CommonJS → dist/cjs/
npm run build:browser      # Browser (no fs) → dist/browser/
npm run build:types        # TypeScript declarations → dist/types/
```

**Critical:** Browser bundle excludes `src/transports/file.ts` and `src/utils/env.ts` (Node.js-specific)

### 4. **Transport Auto-Detection**

The logger detects environment and picks transport automatically:

- **Node.js dev** → `ConsolePrettyTransport` (colors, formatted)
- **Node.js prod** → `ConsoleJsonTransport` (compact NDJSON)
- **Browser** → `ConsoleBrowserTransport` (DevTools grouping)
- **File** → `FileTransport` (daily rotation) — opt-in via config

### 5. **Async File Buffering**

`FileTransport` uses:

- Async buffer to batch writes (non-blocking)
- Configurable flush interval and buffer size
- Stream-based daily rollover
- Graceful shutdown with `logger.close()`

## Testing Strategy

### Unit Tests (`tests/unit/`)

- Test individual modules in isolation
- Mock external dependencies
- Always restore mocks in `afterEach`
- Mask console to avoid test output pollution

### Integration Tests (`tests/integration/`)

- Real disk I/O (creates actual log files)
- Test file rotation, cleanup, retention
- Cleanup after tests complete

### Coverage Requirements

- **80%** statements minimum
- **70%** branches minimum
- **75%** functions minimum
- **80%** lines minimum

## Common Gotchas

### 1. **Circular References**

The masker uses `WeakSet` to track visited objects — avoids `RangeError` on circular refs.
Example: `const obj = {}; obj.self = obj;` is handled safely.

### 2. **No Default Exports**

Everything uses named exports. This enables tree-shaking and is enforced by ESLint.

```typescript
// ✅ Good
export function trace() {}
export class Wiz {}

// ❌ Bad
export default function trace() {}
```

### 3. **Strict TypeScript**

- `strictNullChecks: true` — no implicit undefined/null
- `exactOptionalPropertyTypes: true` — optional fields must use `?:`
- `noImplicitAny` — all types must be explicit
- `as` casts are discouraged — ESLint warns

### 4. **File Transport Only in Node.js**

`src/transports/file.ts` imports `fs` — it's **excluded from browser builds** via tsconfig.
Never reference `FileTransport` in browser-only contexts.

### 5. **Config Changes at Runtime**

`logger.setConfig(partial)` merges changes but **rebuilds transports** if `format` or `file` changes.
Don't assume transport configuration persists through `setConfig()`.

## Implementation Notes

### Timestamp Format

- **ISO 8601** format: `2024-05-15T14:32:01.123Z`
- **Omittable** for deterministic tests via `omitTimestamp: true`

### Log Levels (Ordered by Severity)

```
trace (10) → debug (20) → info (30) → warn (40) → error (50) → fatal (60) → none (∞)
```

Entries below the configured level are silently dropped with **zero overhead**.

### Stack Trace Parsing

Error stacks are parsed into `StackFrame[]`:

```typescript
interface StackFrame {
  functionName?: string;
  filePath: string;
  line: number;
  column: number;
}
```

### Correlation IDs

- Passed per-call in `options.correlationId`
- Or set instance-wide in `WizConfig.correlationId`
- Useful for tracing requests across services

## Build & CI Pipeline

```bash
npm run lint              # ESLint — must pass
npm run format:check      # Prettier — must pass
npm test                  # Jest — must pass (all 76+ tests)
npm run build             # TypeScript — must compile cleanly for all 4 targets
```

**Pre-publish checks:**

- `npm run lint && npm test && npm run build` must all succeed
- Coverage must stay ≥ 80%
- Zero dependencies rule is enforced

## Adding Features

When implementing new features:

1. **Write tests first** (TDD preferred)
2. **Follow commit conventions** — `feat(scope): description`
3. **Update types** if API changes
4. **Ensure backward compatibility** unless it's a breaking change
5. **Document** in examples or docs
6. **Run full check suite** — `npm run lint && npm test && npm run build`

## Key Export Surface

From `src/index.ts`:

```typescript
export { Wiz, wiz }; // Main class and singleton
export * from './types/index.js'; // All TypeScript types
export { default as ConsolePrettyTransport } from '...';
export { default as ConsoleJsonTransport } from '...';
export { default as ConsoleBrowserTransport } from '...';
export { default as FileTransport } from '...';
```

Users primarily use either:

- The **singleton** `wiz` for convenience
- Or create **instances** via `new Wiz(config)` for multi-logger setups

---

**Last Updated:** 2026-04-18
