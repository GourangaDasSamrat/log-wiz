/**
 * @file tests/unit/wiz-advanced.test.ts
 * @description Advanced Wiz tests: format selection, flush, default singleton.
 */

import { Wiz, wiz } from '../../src/index';
import type { LogEntry, Transport } from '../../src/types';

function makeCaptureTransport() {
  const entries: LogEntry[] = [];
  const t: Transport = { write: (e) => entries.push(e), flush: jest.fn(), close: jest.fn().mockResolvedValue(undefined) };
  return { entries, transport: t };
}

function inject(instance: Wiz, t: Transport) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (instance as any).transports = [t];
}

describe('Wiz – all log levels reachable', () => {
  it('emits entries at every level when level=trace', () => {
    const logger = new Wiz({ level: 'trace', file: false });
    const { entries, transport } = makeCaptureTransport();
    inject(logger, transport);

    logger.trace('t'); logger.debug('d'); logger.info('i');
    logger.warn('w'); logger.error('e'); logger.fatal('f');

    expect(entries.map(e => e.level)).toEqual(['trace','debug','info','warn','error','fatal']);
  });
});

describe('Wiz – format option', () => {
  it('accepts "json" format without throwing', () => {
    expect(() => new Wiz({ format: 'json', file: false })).not.toThrow();
  });

  it('accepts "pretty" format without throwing', () => {
    expect(() => new Wiz({ format: 'pretty', file: false })).not.toThrow();
  });

  it('accepts "browser" format without throwing', () => {
    expect(() => new Wiz({ format: 'browser', file: false })).not.toThrow();
  });
});

describe('Wiz – flush and close', () => {
  it('flush() calls flush on all transports', () => {
    const logger = new Wiz({ level: 'info', file: false });
    const { transport } = makeCaptureTransport();
    inject(logger, transport);
    logger.flush();
    expect(transport.flush).toHaveBeenCalledTimes(1);
  });

  it('close() calls close on all transports', async () => {
    const logger = new Wiz({ level: 'info', file: false });
    const { transport } = makeCaptureTransport();
    inject(logger, transport);
    await logger.close();
    expect(transport.close).toHaveBeenCalledTimes(1);
  });
});

describe('Wiz – no meta key omitted when empty', () => {
  it('does not include meta field when no meta is given', () => {
    const logger = new Wiz({ level: 'info', file: false });
    const { entries, transport } = makeCaptureTransport();
    inject(logger, transport);
    logger.info('plain message');
    expect(entries[0]!.meta).toBeUndefined();
  });
});

describe('Wiz – setConfig rebuilds transports on format change', () => {
  it('does not throw when switching formats', () => {
    const logger = new Wiz({ level: 'info', file: false, format: 'pretty' });
    expect(() => logger.setConfig({ format: 'json' })).not.toThrow();
  });
});

describe('default singleton', () => {
  it('exports a pre-built Wiz instance', () => {
    expect(wiz).toBeInstanceOf(Wiz);
  });

  it('responds to standard log calls without throwing', () => {
    // Silence actual output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => wiz.info('singleton test')).not.toThrow();
    jest.restoreAllMocks();
  });
});

describe('Wiz – masking with replaceDefaultMaskedKeys', () => {
  it('only masks the custom key when replaceDefaultMaskedKeys=true', () => {
    const logger = new Wiz({
      level: 'trace', file: false,
      maskedKeys: ['onlyThis'],
      replaceDefaultMaskedKeys: true,
    });
    const { entries, transport } = makeCaptureTransport();
    inject(logger, transport);

    logger.info('msg', { meta: { onlyThis: 'hidden', password: 'visible' } });

    expect(entries[0]!.meta!['onlyThis']).toBe('[MASKED]');
    expect(entries[0]!.meta!['password']).toBe('visible');
  });
});
