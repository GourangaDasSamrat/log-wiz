# Claude Codebase Summary

Quick reference for the log-wiz codebase structure.

## Files at a Glance

| File                                | Purpose               | Key Functions/Exports                            |
| ----------------------------------- | --------------------- | ------------------------------------------------ |
| `src/core/wiz.ts`                   | Main logger class     | `Wiz` class, `wiz` singleton                     |
| `src/types/index.ts`                | All TypeScript types  | `WizConfig`, `LogEntry`, `Transport`, `LogLevel` |
| `src/utils/masker.ts`               | PII masking logic     | `mask()`, `isMaskedKey()`                        |
| `src/utils/error-parser.ts`         | Stack trace parsing   | `parseError()` → `StackFrame[]`                  |
| `src/utils/timestamp.ts`            | Timestamp generation  | `generateTimestamp()` → ISO 8601                 |
| `src/utils/env.ts`                  | Environment detection | `detectEnv()`, `detectRuntime()`                 |
| `src/transports/console-pretty.ts`  | Dev output (colored)  | `ConsolePrettyTransport`                         |
| `src/transports/console-json.ts`    | Prod output (NDJSON)  | `ConsoleJsonTransport`                           |
| `src/transports/console-browser.ts` | Browser DevTools      | `ConsoleBrowserTransport`                        |
| `src/transports/file.ts`            | File + rotation       | `FileTransport`                                  |
| `src/index.ts`                      | Public API            | All exports                                      |

## Quick Facts

✅ **Zero dependencies** — No npm packages required
✅ **Automatic PII masking** — Passwords, tokens, secrets masked automatically
✅ **Multi-environment** — Node.js (ESM/CJS), browsers, both auto-detected
✅ **Lightweight** — < 1.5 KB gzipped for browser
✅ **Structured logging** — JSON in production, pretty-printed in development
✅ **File rotation** — Daily logs with automatic cleanup
✅ **TypeScript** — Strict mode, full type safety

## Key Modules Dependency Graph

```
Types
  ↑
  ├─ Utils (masker, error-parser, timestamp, env)
  │   ↑
  │   ├─ Transports (console-*, file)
  │   │   ↑
  │   │   └─ Wiz (core)
  │   │       ↑
  │   │       └─ index.ts (public API)
  │
  └─ Wiz (core)
      ↑
      └─ index.ts (public API)
```

## Configuration Priority

When a logger is created:

1. User provides `config` object to `new Wiz(config)`
2. Defaults are filled in from `WizConfig` type
3. Environment is auto-detected
4. Appropriate transports are selected

**Runtime changes:** Call `logger.setConfig(partial)` to merge updates

## Test Coverage Areas

- **Unit:** Masking, error parsing, timestamps, transport behavior
- **Integration:** File I/O, daily rotation, cleanup
- **Coverage minimum:** 80% statements across all files

---

Refer to `CODEBASE.md` for detailed implementation notes.
