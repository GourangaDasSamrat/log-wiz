/**
 * @file tests/unit/transports.test.ts
 * @description Unit tests for all three console transports.
 */

import { ConsolePrettyTransport } from '../../src/transports/console-pretty';
import { ConsoleJsonTransport } from '../../src/transports/console-json';
import { ConsoleBrowserTransport } from '../../src/transports/console-browser';
import type { LogEntry } from '../../src/types';

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    timestamp: '2024-05-15T14:32:01.123Z',
    level: 'info',
    env: 'node',
    message: 'test message',
    ...overrides,
  };
}

// ─── ConsolePrettyTransport ────────────────────────────────────────────────────

describe('ConsolePrettyTransport', () => {
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy   = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy  = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it('calls console.log for info level', () => {
    new ConsolePrettyTransport().write(makeEntry({ level: 'info' }));
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it('calls console.warn for warn level', () => {
    new ConsolePrettyTransport().write(makeEntry({ level: 'warn' }));
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('calls console.error for error level', () => {
    new ConsolePrettyTransport().write(makeEntry({ level: 'error' }));
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('calls console.error for fatal level', () => {
    new ConsolePrettyTransport().write(makeEntry({ level: 'fatal' }));
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('includes the message in output', () => {
    new ConsolePrettyTransport().write(makeEntry({ message: 'hello world' }));
    const output: string = logSpy.mock.calls[0]?.[0] ?? '';
    expect(output).toContain('hello world');
  });

  it('includes scope in output when present', () => {
    new ConsolePrettyTransport().write(makeEntry({ scope: 'auth' }));
    const output: string = logSpy.mock.calls[0]?.[0] ?? '';
    expect(output).toContain('auth');
  });

  it('includes correlationId in output when present', () => {
    new ConsolePrettyTransport().write(makeEntry({ correlationId: 'req-123' }));
    const output: string = logSpy.mock.calls[0]?.[0] ?? '';
    expect(output).toContain('req-123');
  });

  it('includes meta JSON in output', () => {
    new ConsolePrettyTransport().write(makeEntry({ meta: { port: 3000 } }));
    const output: string = logSpy.mock.calls[0]?.[0] ?? '';
    expect(output).toContain('3000');
  });

  it('prints error name and message when entry has error', () => {
    new ConsolePrettyTransport().write(
      makeEntry({
        level: 'error',
        error: { name: 'TypeError', message: 'bad input', stack: [] },
      }),
    );
    const output: string = errorSpy.mock.calls[0]?.[0] ?? '';
    expect(output).toContain('TypeError');
    expect(output).toContain('bad input');
  });

  it('renders stack frames when present', () => {
    new ConsolePrettyTransport().write(
      makeEntry({
        level: 'error',
        error: {
          name: 'Error',
          message: 'oops',
          stack: [{ raw: 'at foo (src/a.ts:10:5)', function: 'foo', file: 'src/a.ts', line: 10, column: 5 }],
        },
      }),
    );
    const output: string = errorSpy.mock.calls[0]?.[0] ?? '';
    expect(output).toContain('foo');
  });

  it('handles all log levels without throwing', () => {
    const t = new ConsolePrettyTransport();
    for (const level of ['trace','debug','info','warn','error','fatal'] as const) {
      expect(() => t.write(makeEntry({ level }))).not.toThrow();
    }
  });
});

// ─── ConsoleJsonTransport ──────────────────────────────────────────────────────

describe('ConsoleJsonTransport', () => {
  afterEach(() => jest.restoreAllMocks());

  it('writes a valid JSON string to console.log for info', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    new ConsoleJsonTransport().write(makeEntry({ message: 'json test' }));
    const raw: string = spy.mock.calls[0]?.[0] ?? '';
    expect(() => JSON.parse(raw)).not.toThrow();
    expect(JSON.parse(raw)).toMatchObject({ level: 'info', message: 'json test' });
  });

  it('routes warn to console.warn', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    new ConsoleJsonTransport().write(makeEntry({ level: 'warn' }));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('routes error to console.error', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    new ConsoleJsonTransport().write(makeEntry({ level: 'error' }));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('routes fatal to console.error', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    new ConsoleJsonTransport().write(makeEntry({ level: 'fatal' }));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('serialises meta into the JSON output', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    new ConsoleJsonTransport().write(makeEntry({ meta: { userId: 42 } }));
    const parsed = JSON.parse(spy.mock.calls[0]?.[0] ?? '{}') as Record<string, unknown>;
    expect((parsed['meta'] as Record<string, unknown>)['userId']).toBe(42);
  });
});

// ─── ConsoleBrowserTransport ───────────────────────────────────────────────────

describe('ConsoleBrowserTransport', () => {
  afterEach(() => jest.restoreAllMocks());

  it('calls console.log for info without meta', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    new ConsoleBrowserTransport().write(makeEntry({ env: 'browser' }));
    expect(spy).toHaveBeenCalled();
  });

  it('uses console.groupCollapsed when meta is present', () => {
    const gcSpy  = jest.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
    const geSpy  = jest.spyOn(console, 'groupEnd').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    new ConsoleBrowserTransport().write(makeEntry({ meta: { x: 1 } }));
    expect(gcSpy).toHaveBeenCalledTimes(1);
    expect(geSpy).toHaveBeenCalledTimes(1);
  });

  it('uses console.groupCollapsed when error is present', () => {
    const gcSpy = jest.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
    jest.spyOn(console, 'groupEnd').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    new ConsoleBrowserTransport().write(
      makeEntry({ level: 'error', error: { name: 'Error', message: 'boom' } }),
    );
    expect(gcSpy).toHaveBeenCalledTimes(1);
  });

  it('uses console.warn for warn level', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    new ConsoleBrowserTransport().write(makeEntry({ level: 'warn' }));
    expect(spy).toHaveBeenCalled();
  });

  it('uses console.error for error level (no meta)', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    new ConsoleBrowserTransport().write(makeEntry({ level: 'error' }));
    expect(spy).toHaveBeenCalled();
  });

  it('uses console.error for fatal level (no meta)', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    new ConsoleBrowserTransport().write(makeEntry({ level: 'fatal' }));
    expect(spy).toHaveBeenCalled();
  });

  it('renders error stack frames inside the group', () => {
    jest.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
    jest.spyOn(console, 'groupEnd').mockImplementation(() => {});
    const logSpy   = jest.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    new ConsoleBrowserTransport().write(
      makeEntry({
        level: 'error',
        error: {
          name: 'RangeError',
          message: 'out of bounds',
          stack: [{ raw: 'at bar (b.ts:5:1)', function: 'bar', file: 'b.ts', line: 5, column: 1 }],
        },
      }),
    );
    const allCalls = [...logSpy.mock.calls, ...errorSpy.mock.calls].flat().join(' ');
    expect(allCalls).toContain('bar');
  });
});
