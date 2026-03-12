/**
 * @file src/transports/console-browser.ts
 * @description Grouped, colour-coded DevTools transport for browser environments.
 */

import type { Transport, LogEntry } from '../types/index.js';
import { formatTimestampPretty } from '../utils/timestamp.js';

const LEVEL_COLOURS: Record<string, string> = {
  trace: 'color: #9e9e9e',
  debug: 'color: #00bcd4',
  info:  'color: #4caf50; font-weight: bold',
  warn:  'color: #ff9800; font-weight: bold',
  error: 'color: #f44336; font-weight: bold',
  fatal: 'color: #9c27b0; font-weight: bold',
};

const LEVEL_EMOJI: Record<string, string> = {
  trace: '🔍',
  debug: '🐛',
  info:  'ℹ️',
  warn:  '⚠️',
  error: '❌',
  fatal: '💀',
};

export class ConsoleBrowserTransport implements Transport {
  write(entry: LogEntry): void {
    const colour = LEVEL_COLOURS[entry.level] ?? '';
    const emoji = LEVEL_EMOJI[entry.level] ?? '';
    const ts = formatTimestampPretty(entry.timestamp);
    const scope = entry.scope ? `[${entry.scope}] ` : '';
    const cid = entry.correlationId ? `{${entry.correlationId}} ` : '';
    const label = `%c${emoji} ${entry.level.toUpperCase().padEnd(5)} %c${ts}%c ${scope}${cid}${entry.message}`;

    const hasMeta = entry.meta && Object.keys(entry.meta).length > 0;
    const hasError = Boolean(entry.error);

    if (hasMeta || hasError) {
      console.groupCollapsed(label, colour, 'color: #888', 'color: inherit');
      if (hasMeta) console.log('meta', entry.meta);
      if (hasError && entry.error) {
        console.error(`${entry.error.name}: ${entry.error.message}`);
        if (entry.error.stack) {
          entry.error.stack.forEach((f) =>
            console.log(`  at ${f.function ?? '<anonymous>'} (${f.file}:${f.line}:${f.column})`),
          );
        }
      }
      console.groupEnd();
    } else {
      const logFn =
        entry.level === 'error' || entry.level === 'fatal'
          ? console.error
          : entry.level === 'warn'
            ? console.warn
            : console.log;
      logFn(label, colour, 'color: #888', 'color: inherit');
    }
  }
}
