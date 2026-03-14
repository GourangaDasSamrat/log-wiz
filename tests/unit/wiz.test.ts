import { Wiz } from '../../src/core/wiz';
import type { LogEntry } from '../../src/types';

// ─── Capture transport helper ─────────────────────────────────────────────────

interface CaptureTransport {
  entries: LogEntry[];
  write(entry: LogEntry): void;
  flush(): void;
}

function makeCaptureTransport(): CaptureTransport {
  return {
    entries: [],
    write(entry: LogEntry) { this.entries.push(entry); },
    flush() {},
  };
}

// Inject a capture transport by monkey-patching the private transports array
function injectTransport(wiz: Wiz, transport: CaptureTransport): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (wiz as any).transports = [transport];
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Wiz – level filtering', () => {
  it('drops entries below the configured level', () => {
    const wiz = new Wiz({ level: 'warn', file: false });
    const cap = makeCaptureTransport();
    injectTransport(wiz, cap);

    wiz.debug('should be dropped');
    wiz.info('also dropped');
    wiz.warn('kept');
    wiz.error('also kept');

    expect(cap.entries).toHaveLength(2);
    expect(cap.entries[0]!.level).toBe('warn');
    expect(cap.entries[1]!.level).toBe('error');
  });

  it('no-op mode (level: none) silences all output', () => {
    const wiz = new Wiz({ level: 'none', file: false });
    const cap = makeCaptureTransport();
    injectTransport(wiz, cap);

    wiz.fatal('should not appear');
    expect(cap.entries).toHaveLength(0);
  });
});

describe('Wiz – PII masking', () => {
  it('masks default sensitive keys in meta', () => {
    const wiz = new Wiz({ level: 'trace', file: false });
    const cap = makeCaptureTransport();
    injectTransport(wiz, cap);

    wiz.info('login', { meta: { username: 'alice', password: 'hunter2' } });

    const entry = cap.entries[0]!;
    expect(entry.meta!['username']).toBe('alice');
    expect(entry.meta!['password']).toBe('[MASKED]');
  });

  it('masks custom keys when configured', () => {
    const wiz = new Wiz({ level: 'trace', maskedKeys: ['internalId'], file: false });
    const cap = makeCaptureTransport();
    injectTransport(wiz, cap);

    wiz.info('event', { meta: { internalId: '42', name: 'test' } });

    const entry = cap.entries[0]!;
    expect(entry.meta!['internalId']).toBe('[MASKED]');
    expect(entry.meta!['name']).toBe('test');
  });
});

describe('Wiz – correlationId', () => {
  it('attaches instance-level correlationId to every entry', () => {
    const wiz = new Wiz({ correlationId: 'req-001', level: 'trace', file: false });
    const cap = makeCaptureTransport();
    injectTransport(wiz, cap);

    wiz.info('msg');
    expect(cap.entries[0]!.correlationId).toBe('req-001');
  });

  it('per-call correlationId overrides instance default', () => {
    const wiz = new Wiz({ correlationId: 'req-001', level: 'trace', file: false });
    const cap = makeCaptureTransport();
    injectTransport(wiz, cap);

    wiz.info('msg', { correlationId: 'req-override' });
    expect(cap.entries[0]!.correlationId).toBe('req-override');
  });
});

describe('Wiz – scope', () => {
  it('attaches scope to all entries', () => {
    const wiz = new Wiz({ scope: 'database', level: 'trace', file: false });
    const cap = makeCaptureTransport();
    injectTransport(wiz, cap);

    wiz.info('query executed');
    expect(cap.entries[0]!.scope).toBe('database');
  });
});

describe('Wiz – error parsing', () => {
  it('parses Error objects into structured form', () => {
    const wiz = new Wiz({ level: 'trace', file: false });
    const cap = makeCaptureTransport();
    injectTransport(wiz, cap);

    wiz.error('oops', { error: new Error('db connection lost') });

    const entry = cap.entries[0]!;
    expect(entry.error).toBeDefined();
    expect(entry.error!.name).toBe('Error');
    expect(entry.error!.message).toBe('db connection lost');
  });
});

describe('Wiz – setConfig', () => {
  it('dynamically changes the log level', () => {
    const wiz = new Wiz({ level: 'error', file: false });
    const cap = makeCaptureTransport();
    injectTransport(wiz, cap);

    wiz.info('before change – dropped');
    expect(cap.entries).toHaveLength(0);

    wiz.setConfig({ level: 'info' });
    injectTransport(wiz, cap); // re-inject after setConfig rebuilds transports
    wiz.info('after change – kept');
    expect(cap.entries).toHaveLength(1);
  });
});

describe('Wiz – multi-instance', () => {
  it('creates independent instances with different configs', () => {
    const dbLogger = new Wiz({ scope: 'db', level: 'error', file: false });
    const httpLogger = new Wiz({ scope: 'http', level: 'info', file: false });

    const dbCap = makeCaptureTransport();
    const httpCap = makeCaptureTransport();
    injectTransport(dbLogger, dbCap);
    injectTransport(httpLogger, httpCap);

    dbLogger.info('should be dropped by db logger');
    httpLogger.info('should appear in http logger');

    expect(dbCap.entries).toHaveLength(0);
    expect(httpCap.entries).toHaveLength(1);
    expect(httpCap.entries[0]!.scope).toBe('http');
  });
});

describe('Wiz – omitTimestamp', () => {
  it('omits timestamp when configured', () => {
    const wiz = new Wiz({ omitTimestamp: true, level: 'trace', file: false });
    const cap = makeCaptureTransport();
    injectTransport(wiz, cap);

    wiz.info('test');
    expect(cap.entries[0]!.timestamp).toBe('');
  });
});
