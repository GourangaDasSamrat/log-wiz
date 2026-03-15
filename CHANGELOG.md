# Changelog

All notable changes to **log-wiz** will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

## [1.0.0] – 2025-01-01

### Added
- **Wiz class** – multi-instance logger with full TypeScript generics.
- **Default singleton** `wiz` – zero-config drop-in.
- **Automatic PII masking** – deep recursive scan with `WeakSet`-based circular-reference protection.
- **Default masked keys**: `password`, `token`, `secret`, `authorization`, `cookie`, `card_number` and variants.
- **Customisable masking** – `maskedKeys` option merges with or replaces defaults.
- **Three console transports**: `ConsolePrettyTransport` (ANSI colours), `ConsoleJsonTransport` (structured JSON), `ConsoleBrowserTransport` (grouped DevTools).
- **FileTransport** – stream-based daily log rotation with configurable retention and async write buffer.
- **Error stack-trace parsing** – `Error` objects are decomposed into structured `StackFrame[]`.
- **Correlation ID support** – instance-level and per-call `correlationId`.
- **Named scopes** – `scope` option labels every entry.
- **No-op mode** – `level: 'none'` silences all output with zero overhead.
- **Environment-aware format detection** – pretty in dev, JSON in production/CI, grouped in browser.
- **Conditional exports** – `fs` code is tree-shaken in browser bundles.
- **Zero dependencies** – native ANSI codes, built-in `Intl` / `Date` APIs only.
