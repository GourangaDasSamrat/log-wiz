# Codex Implementation Guide for AI Systems

This document provides implementation-focused guidance for AI systems generating code for the log-wiz project.

## When Generating Code

### Code Style Rules
- **Named exports only** — Never use `export default`
- **TypeScript only** — All source is `.ts`, no `.js`
- **Strict types** — No `any` types, use union types instead
- **Const first** — Use `const` by default, `let` rarely, avoid `var`
- **Arrow functions** — Use `=>` functions over `function` keyword

### Type Definitions
```typescript
// ✅ Good
interface Config {
  enabled: boolean;
  level: 'debug' | 'info' | 'warn';
}

// ❌ Bad
interface Config {
  enabled: any;
  level: any;
}
```

### Imports/Exports
```typescript
// ✅ File exports named functions
export function writeLog(entry: LogEntry): void { }
export class CustomTransport implements Transport { }

// ❌ File exports default
export default function writeLog() { }
```

### Imports
```typescript
// ✅ Named imports
import { Wiz } from './core/wiz.js';
import type { LogEntry, Transport } from './types/index.js';

// ❌ Default imports (except in tests)
import Wiz from './core/wiz.js';
```

## Module Categories

### 1. Type Definition Modules
**Location:** `src/types/`
- Only contain interfaces, types, and type unions
- No runtime code
- No imports from other modules (except dependencies)

Example structure:
```typescript
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: Record<string, unknown>;
  error?: ParsedError;
}

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'none';
```

### 2. Utility Modules
**Location:** `src/utils/`
- Pure functions only (no class state)
- No side effects
- Stateless
- Accept input, return output

Pattern:
```typescript
export function mask(value: unknown, visitedSet: WeakSet<object>): unknown {
  // Pure function logic
  return maskedValue;
}
```

### 3. Transport Modules
**Location:** `src/transports/`
- Each implements `Transport` interface
- Constructor may accept custom options
- Methods: `write()`, optional `flush()`, optional `close()`
- Should handle their own buffering/flushing if needed

Pattern:
```typescript
import type { Transport, LogEntry } from '../types/index.js';

export default class MyTransport implements Transport {
  write(entry: LogEntry): void {
    // Handle entry
  }
}
```

### 4. Core Module
**Location:** `src/core/wiz.ts`
- Main `Wiz` class
- Orchestrates all utilities and transports
- Manages configuration
- Handles lifecycle (close, flush)

Pattern:
```typescript
export class Wiz implements IWiz {
  private config: WizConfig;
  private transports: Transport[];

  constructor(config?: Partial<WizConfig>) { }

  info(message: string, options?: LogOptions): void { }

  async close(): Promise<void> { }
}

export const wiz = new Wiz();
```

## File Naming Conventions

- **Classes/interfaces:** `PascalCase` → `ConsolePrettyTransport`
- **Functions/variables:** `camelCase` → `generateTimestamp`
- **Constants:** `UPPER_SNAKE_CASE` → `MASKED_KEYS`
- **Files:** `kebab-case.ts` → `console-pretty.ts`
- **Test files:** `module.test.ts` → `masker.test.ts`

## Build Exclusions

### Browser Bundle Exclusions
These files/patterns are excluded from browser builds:

- `src/transports/file.ts` — Requires `fs` module
- `src/utils/env.ts` — Uses `process` global
- Configured in `tsconfig.browser.json` via `exclude: [...]`

If you need Node.js-specific code:
- Option 1: Put in a separate `*.node.ts` or `*.server.ts` file
- Option 2: Use runtime checks: `typeof process !== 'undefined'`

### NPM Package Exclusions
These directories are excluded from npm package via `.npmignore`:

```
src/              # Consumers use dist/
tests/            # Integration tests not needed
examples/         # Examples stay in repo
docs/             # Documentation stays in repo
claude/           # AI guides
codex/            # AI guides
.github/          # CI configs
```

## Testing Requirements

### Test File Structure
```typescript
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('ModuleName', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    jest.restoreAllMocks(); // Always restore
  });

  it('should do X when Y', () => {
    // Arrange
    const input = ...;

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toBe(...);
  });
});
```

### Mock Console Output
```typescript
it('should log to console', () => {
  const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

  // ... trigger logging

  expect(consoleSpy).toHaveBeenCalledWith(...);
  expect(consoleSpy).toHaveBeenCalledTimes(1);
});
```

### Mock Environment Variables
```typescript
beforeEach(() => {
  process.env.NODE_ENV = 'test';
});

afterEach(() => {
  delete process.env.NODE_ENV;
});
```

## Error Handling

### Error Types to Catch
- `TypeError` — Invalid types
- `RangeError` — Stack overflow (circular refs)
- `SyntaxError` — Parsing errors

### Error Handling Pattern
```typescript
try {
  const result = processThing(input);
  return result;
} catch (error) {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.fatal('Processing failed', { error: err, meta: { input } });
  throw err;
}
```

## Performance Considerations

### Critical Paths
1. **Log call entry** — Must be fast (< 1ms)
2. **Filtering** — Drop entries early if level doesn't match
3. **Masking lookup** — Use Set/Map for O(1) key checking
4. **Transport write** — Should not block (use async buffering)

### Optimization Patterns
```typescript
// ✅ Fast: Build Set once, check O(1)
const MASKED_KEYS = new Set(['password', 'token', 'secret']);
if (MASKED_KEYS.has(key)) { /* mask it */ }

// ❌ Slow: Array indexOf O(n) every time
const MASKED_KEYS = ['password', 'token', 'secret'];
if (MASKED_KEYS.includes(key)) { /* mask it */ }
```

## Documentation Requirements

### Inline Comments
- Only comment "why", not "what" (code shows what)
- Explain non-obvious algorithms

```typescript
// ✅ Why?
// WeakSet avoids memory leaks for circular refs without tracking
if (this.visited.has(obj)) return;

// ❌ What?
// Add obj to visited set
this.visited.add(obj);
```

### JSDoc for Public APIs
```typescript
/**
 * Masks sensitive fields in an object.
 * @param value The object to mask
 * @param visitedSet Circular reference tracking (WeakSet)
 * @returns Deep clone with sensitive values masked as "[MASKED]"
 */
export function mask(value: unknown, visitedSet: WeakSet<object>): unknown {
  // ...
}
```

## When Not to Modify

❌ **DO NOT CHANGE:**
- `package.json` dependencies (zero-dependency rule)
- `tsconfig.json` (strict settings required)
- `.npmignore` entries (distribution control)
- ESLint/Prettier configs (code style consistency)

✅ **OK TO CHANGE:**
- Source files in `src/`
- Test files in `tests/`
- Examples in `examples/`
- Documentation in `docs/`

---

**Version:** 1.0.2
**For:** Code generation AI systems, IDE assistants, LLMs
**Related:** See `ARCHITECTURE.md` for system design overview
