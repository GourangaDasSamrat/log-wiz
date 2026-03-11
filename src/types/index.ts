/**
 * @file src/types/index.ts
 * @description Core TypeScript interfaces and type definitions for log-wiz.
 */

// ─── Log Levels ───────────────────────────────────────────────────────────────

/** All supported log levels in order of ascending severity. */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'none';

/** Numeric severity values mapped to each log level. */
export const LOG_LEVEL_SEVERITY: Readonly<Record<LogLevel, number>> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
  none: Infinity,
} as const;

// ─── Log Entry ─────────────────────────────────────────────────────────────────

/** A fully resolved, structured log entry ready for output. */
export interface LogEntry {
  readonly timestamp: string;
  readonly level: Exclude<LogLevel, 'none'>;
  readonly scope?: string;
  readonly correlationId?: string;
  readonly message: string;
  readonly meta?: Record<string, unknown>;
  readonly error?: ParsedError;
  readonly env: 'node' | 'browser';
}

/** A parsed representation of a JavaScript Error object. */
export interface ParsedError {
  readonly name: string;
  readonly message: string;
  readonly stack?: StackFrame[];
}

/** A single frame in a parsed stack trace. */
export interface StackFrame {
  readonly raw: string;
  readonly function?: string;
  readonly file?: string;
  readonly line?: number;
  readonly column?: number;
}

// ─── Configuration ─────────────────────────────────────────────────────────────

/** File-rotation transport options (Node.js only). */
export interface FileTransportOptions {
  /** Directory in which to write log files. @default 'logs' */
  readonly dir?: string;
  /** Maximum number of daily log files to retain before pruning. @default 7 */
  readonly maxFiles?: number;
  /** Whether to buffer writes and flush in batches. @default true */
  readonly asyncBuffer?: boolean;
  /** How many entries to buffer before flushing to disk. @default 100 */
  readonly bufferSize?: number;
  /** Maximum ms to wait before a partial buffer is flushed. @default 1000 */
  readonly flushIntervalMs?: number;
}

/** Full configuration object for a Wiz logger instance. */
export interface WizConfig {
  readonly level?: LogLevel;
  readonly scope?: string;
  readonly correlationId?: string;
  readonly format?: 'pretty' | 'json' | 'browser';
  readonly maskedKeys?: readonly string[];
  readonly replaceDefaultMaskedKeys?: boolean;
  readonly file?: FileTransportOptions | false;
  readonly omitTimestamp?: boolean;
}

// ─── Transport Interface ──────────────────────────────────────────────────────

export interface Transport {
  write(entry: LogEntry): void;
  flush?(): void;
  close?(): Promise<void>;
}

// ─── Public Logger Interface ───────────────────────────────────────────────────

export interface LogCallOptions {
  readonly correlationId?: string;
  readonly meta?: Record<string, unknown>;
  readonly error?: Error;
}

export interface IWiz {
  trace(message: string, options?: LogCallOptions): void;
  debug(message: string, options?: LogCallOptions): void;
  info(message: string, options?: LogCallOptions): void;
  warn(message: string, options?: LogCallOptions): void;
  error(message: string, options?: LogCallOptions): void;
  fatal(message: string, options?: LogCallOptions): void;
  setConfig(config: Partial<WizConfig>): void;
  flush(): void;
  close(): Promise<void>;
}
