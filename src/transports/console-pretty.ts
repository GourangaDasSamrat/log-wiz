/**
 * @file src/transports/console-pretty.ts
 * @description Rich, coloured, multi-line console transport for development.
 * Uses native ANSI escape codes — zero dependencies.
 */

import type { Transport, LogEntry } from '../types/index.js';
import { formatTimestampPretty } from '../utils/timestamp.js';

// ─── ANSI Colour Codes ────────────────────────────────────────────────────────

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  grey: '\x1b[90m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgRed: '\x1b[41m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgGrey: '\x1b[100m',
} as const;

type AnsiKey = keyof typeof ANSI;

function c(colour: AnsiKey, text: string): string {
  return `${ANSI[colour]}${text}${ANSI.reset}`;
}

const LEVEL_STYLES: Record<string, { badge: string; msgColour: AnsiKey }> = {
  trace: { badge: `${ANSI.bgGrey}${ANSI.white} TRC ${ANSI.reset}`, msgColour: 'grey' },
  debug: { badge: `${ANSI.bgCyan}${ANSI.white} DBG ${ANSI.reset}`, msgColour: 'cyan' },
  info:  { badge: `${ANSI.bgGreen}${ANSI.white} INF ${ANSI.reset}`, msgColour: 'green' },
  warn:  { badge: `${ANSI.bgYellow}${ANSI.white} WRN ${ANSI.reset}`, msgColour: 'yellow' },
  error: { badge: `${ANSI.bgRed}${ANSI.white} ERR ${ANSI.reset}`, msgColour: 'red' },
  fatal: { badge: `${ANSI.bgMagenta}${ANSI.white} FTL ${ANSI.reset}`, msgColour: 'magenta' },
};

export class ConsolePrettyTransport implements Transport {
  write(entry: LogEntry): void {
    const style = LEVEL_STYLES[entry.level] ?? LEVEL_STYLES['info']!;
    const ts = c('dim', formatTimestampPretty(entry.timestamp));
    const scope = entry.scope ? c('cyan', `[${entry.scope}]`) + ' ' : '';
    const cid = entry.correlationId ? c('grey', `{${entry.correlationId}}`) + ' ' : '';
    const msg = c(style.msgColour, entry.message);

    const lines: string[] = [`${style.badge} ${ts} ${scope}${cid}${msg}`];

    if (entry.meta && Object.keys(entry.meta).length > 0) {
      lines.push(c('dim', '  meta: ') + JSON.stringify(entry.meta, null, 2).replace(/\n/g, '\n  '));
    }

    if (entry.error) {
      lines.push(`${c('bold', c('red', `  ${entry.error.name}: ${entry.error.message}`))}`);
      if (entry.error.stack) {
        for (const frame of entry.error.stack.slice(0, 8)) {
          const fn = frame.function ? c('yellow', frame.function) : c('grey', '<anonymous>');
          const loc = frame.file
            ? c('grey', `(${frame.file}:${frame.line ?? '?'}:${frame.column ?? '?'})`)
            : '';
          lines.push(`    ${c('dim', 'at')} ${fn} ${loc}`);
        }
      }
    }

    const output = lines.join('\n');
    const fn =
      entry.level === 'error' || entry.level === 'fatal'
        ? console.error
        : entry.level === 'warn'
          ? console.warn
          : console.log;
    fn(output);
  }
}
