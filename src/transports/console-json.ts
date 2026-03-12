/**
 * @file src/transports/console-json.ts
 * @description Compact single-line JSON transport for production / CI environments.
 * Optimised for log aggregators (ELK, Datadog, New Relic, etc.).
 */

import type { Transport, LogEntry } from '../types/index.js';

export class ConsoleJsonTransport implements Transport {
  write(entry: LogEntry): void {
    const line = JSON.stringify(entry);
    const fn =
      entry.level === 'error' || entry.level === 'fatal'
        ? console.error
        : entry.level === 'warn'
          ? console.warn
          : console.log;
    fn(line);
  }
}
